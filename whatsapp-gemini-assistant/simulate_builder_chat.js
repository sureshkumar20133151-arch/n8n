require('dotenv').config();
const readline = require('readline');
const personaManager = require('./personaManager');
const GeminiService = require('./geminiService');
const fs = require('fs');
const path = require('path');

// Ensure mode is set to builder
personaManager.setMode('builder', 'simulation_tester');

const gemini = new GeminiService();
const simChatId = '919840123456@s.whatsapp.net';

console.log('🏗️ ========================================================');
console.log('🏗️ DANAM HOLDINGS - WHATSAPP BUILDER AI SIMULATOR');
console.log('🏗️ Mode: Construction Builder (Er. Dhilip Kumar / Madurai)');
console.log('🏗️ ========================================================\n');

const automatedConversation = [
  "வணக்கம்! Madurai Selvapuram la 1500 sq.ft plot irukku. G+1 house build panna evlo cost aagum?",
  "Premium package la enna lam inclusions irukku?",
  "Super. My name is Karthik, phone 9840123456. Budget around 35-40 Lakhs. G+1 3 BHK build panna plan. Send formal quotation.",
  "Can your engineer visit my site in Selvapuram tomorrow at 11:00 AM for free plot measurement?"
];

async function runAutomatedDemo() {
  console.log('🤖 Running Automated Multi-Turn Conversation Demo...\n');

  for (let i = 0; i < automatedConversation.length; i++) {
    const userMessage = automatedConversation[i];
    console.log(`\n💬 [Turn ${i + 1}] Homeowner (WhatsApp):`);
    console.log(`   "${userMessage}"\n`);
    console.log(`⏳ Thinking...`);

    try {
      const response = await gemini.generateResponse(simChatId, userMessage, null, {
        isOwner: false
      });
      console.log(`🤖 Builder AI Assistant:`);
      console.log(`--------------------------------------------------------`);
      console.log(response);
      console.log(`--------------------------------------------------------\n`);
    } catch (err) {
      console.error(`❌ Error generating response:`, err.message);
    }
  }

  // Display saved enquiries
  const enqFile = path.resolve(__dirname, 'data', 'construction_enquiries.json');
  if (fs.existsSync(enqFile)) {
    const data = JSON.parse(fs.readFileSync(enqFile, 'utf-8') || '[]');
    console.log(`📋 [CRM Verification] Total saved enquiries in database: ${data.length}`);
    if (data.length > 0) {
      console.log('   Latest saved enquiry:', JSON.stringify(data[0], null, 2));
    }
  }

  const visitFile = path.resolve(__dirname, 'data', 'construction_site_visits.json');
  if (fs.existsSync(visitFile)) {
    const data = JSON.parse(fs.readFileSync(visitFile, 'utf-8') || '[]');
    console.log(`\n🚗 [Site Visits Verification] Total scheduled visits: ${data.length}`);
    if (data.length > 0) {
      console.log('   Latest scheduled visit:', JSON.stringify(data[0], null, 2));
    }
  }

  console.log('\n✨ Automated demo completed successfully!\n');
}

// Check arguments: if '--interactive' or '-i', launch terminal prompt
if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
  console.log('Type your WhatsApp message below (or type "exit" to quit):\n');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = () => {
    rl.question('👤 Homeowner: ', async (msg) => {
      if (!msg || msg.trim().toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      }
      console.log('⏳ Thinking...');
      try {
        const reply = await gemini.generateResponse(simChatId, msg, null, { isOwner: false });
        console.log(`\n🤖 Builder AI:\n${reply}\n`);
      } catch (e) {
        console.error('Error:', e.message);
      }
      promptUser();
    });
  };
  promptUser();
} else {
  runAutomatedDemo();
}
