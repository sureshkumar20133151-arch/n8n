// Decrypt n8n OpenAI credentials - using Python's sqlite3 output
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Read encryption key
const configPath = path.join(process.env.USERPROFILE, '.n8n', 'config');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const encryptionKey = config.encryptionKey;

function decrypt(encryptedData, key) {
    const input = Buffer.from(encryptedData, 'base64');
    if (input.slice(0, 8).toString() === 'Salted__') {
        const salt = input.slice(8, 16);
        const ciphertext = input.slice(16);
        const keyAndIv = deriveKeyAndIv(key, salt);
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyAndIv.key, keyAndIv.iv);
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    }
    throw new Error('Not in expected format');
}

function deriveKeyAndIv(password, salt) {
    const passwordBuffer = Buffer.from(password);
    let derived = Buffer.alloc(0);
    let block = Buffer.alloc(0);
    while (derived.length < 48) {
        block = crypto.createHash('md5')
            .update(Buffer.concat([block, passwordBuffer, salt]))
            .digest();
        derived = Buffer.concat([derived, block]);
    }
    return { key: derived.slice(0, 32), iv: derived.slice(32, 48) };
}

// Read credential data from file (exported by Python)
const credsFile = path.join(__dirname, 'cred_data.json');

// First, export creds from sqlite using Python (already done)
const credData = JSON.parse(fs.readFileSync(credsFile, 'utf8'));

console.log('=== OPENAI CREDENTIALS ANALYSIS ===\n');

for (const cred of credData) {
    console.log(`Credential: ${cred.name} (ID: ${cred.id})`);
    try {
        const decrypted = decrypt(cred.data, encryptionKey);
        const parsed = JSON.parse(decrypted);
        
        console.log(`  API Key: ${parsed.apiKey ? parsed.apiKey.substring(0, 20) + '...' : 'NOT SET'}`);
        console.log(`  Base URL: ${parsed.url || 'DEFAULT (https://api.openai.com/v1)'}`);
        console.log(`  Organization ID: ${parsed.organizationId || 'NOT SET'}`);
        
        if (parsed.apiKey) {
            if (parsed.apiKey.startsWith('nvapi-')) {
                console.log(`  Key Type: NVIDIA NIM`);
                if (!parsed.url || parsed.url === 'https://api.openai.com/v1') {
                    console.log(`  ⚠️ PROBLEM FOUND: NVIDIA key but Base URL points to OpenAI!`);
                    console.log(`  ✅ FIX NEEDED: Change Base URL to https://integrate.api.nvidia.com/v1`);
                } else {
                    console.log(`  ✅ Base URL correctly configured for NVIDIA`);
                }
            } else if (parsed.apiKey.startsWith('sk-')) {
                console.log(`  Key Type: Official OpenAI`);
            } else {
                console.log(`  Key Type: Unknown`);
            }
        }
    } catch (err) {
        console.log(`  Error: ${err.message}`);
    }
    console.log();
}
