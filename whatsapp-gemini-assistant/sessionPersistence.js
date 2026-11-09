const fs = require('fs');
const path = require('path');

const authDir = path.resolve(__dirname, '.baileys_auth');
const credsFilePath = path.join(authDir, 'creds.json');

class SessionPersistence {
  constructor() {
    this.isRestored = false;
    this.databaseUrl = process.env.DATABASE_URL || null;
    this.pgClient = null;
  }

  // Get PostgreSQL client if DATABASE_URL (e.g. Neon) is provided
  async getDbClient() {
    if (!this.databaseUrl) return null;
    if (this.pgClient) return this.pgClient;

    try {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: this.databaseUrl,
        ssl: { rejectUnauthorized: false }
      });
      await client.connect();
      // Ensure session table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS baileys_sessions (
          session_id TEXT PRIMARY KEY,
          creds_data TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.pgClient = client;
      console.log('🐘 [Neon/Postgres] Session persistence connected successfully!');
      return this.pgClient;
    } catch (err) {
      console.warn('⚠️ [Postgres Connection Skipped]:', err.message);
      return null;
    }
  }

  // Auto-restore session from DB or SESSION_DATA env var on server boot
  async restoreSession() {
    try {
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      // Check if creds.json already exists and is non-empty
      if (fs.existsSync(credsFilePath) && fs.statSync(credsFilePath).size > 50) {
        console.log('✅ [Session] Local creds.json found and loaded from disk.');
        this.isRestored = true;
        return true;
      }

      // 1. Try restoring from SESSION_DATA environment variable
      if (process.env.SESSION_DATA && process.env.SESSION_DATA.trim().length > 20) {
        try {
          const raw = Buffer.from(process.env.SESSION_DATA.trim(), 'base64').toString('utf8');
          JSON.parse(raw); // Validate JSON format
          fs.writeFileSync(credsFilePath, raw, 'utf8');
          console.log('⚡ [Session Restore] Restored creds.json from SESSION_DATA environment variable! Reconnecting automatically...');
          this.isRestored = true;
          return true;
        } catch (e) {
          console.warn('⚠️ [Session Restore] Failed to parse SESSION_DATA env var:', e.message);
        }
      }

      // 2. Try restoring from PostgreSQL (Neon)
      const db = await this.getDbClient();
      if (db) {
        const res = await db.query('SELECT creds_data FROM baileys_sessions WHERE session_id = $1 LIMIT 1', ['default_session']);
        if (res.rows && res.rows.length > 0 && res.rows[0].creds_data) {
          fs.writeFileSync(credsFilePath, res.rows[0].creds_data, 'utf8');
          console.log('🐘 [Session Restore] Successfully restored creds.json from Neon PostgreSQL! Reconnecting automatically...');
          this.isRestored = true;
          return true;
        }
      }

      console.log('ℹ️ [Session] No existing saved session found. Ready for first-time QR scan.');
      return false;
    } catch (err) {
      console.error('Error in restoreSession:', err.message);
      return false;
    }
  }

  // Auto-backup session whenever credentials update
  async backupSession() {
    try {
      if (!fs.existsSync(credsFilePath)) return;
      const credsRaw = fs.readFileSync(credsFilePath, 'utf8');
      if (!credsRaw || credsRaw.length < 50) return;

      // 1. Save to Database if configured
      const db = await this.getDbClient();
      if (db) {
        await db.query(`
          INSERT INTO baileys_sessions (session_id, creds_data, updated_at)
          VALUES ('default_session', $1, NOW())
          ON CONFLICT (session_id)
          DO UPDATE SET creds_data = EXCLUDED.creds_data, updated_at = NOW();
        `, [credsRaw]);
        console.log('🐘 [Session Backup] Auto-saved updated creds.json to Neon PostgreSQL database!');
      }

      // 2. Cache Base64 string for 1-click web export
      this.latestBase64 = Buffer.from(credsRaw, 'utf8').toString('base64');
    } catch (err) {
      console.warn('Session backup warning:', err.message);
    }
  }

  // Get current session base64 for Render env setting
  getSessionBase64() {
    if (this.latestBase64) return this.latestBase64;
    try {
      if (fs.existsSync(credsFilePath)) {
        const raw = fs.readFileSync(credsFilePath, 'utf8');
        return Buffer.from(raw, 'utf8').toString('base64');
      }
    } catch (_) {}
    return null;
  }
}

module.exports = new SessionPersistence();
