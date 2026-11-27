/**
 * Zoho Arattai Messaging & Channel CRUD Service for Dhanam Holdings
 * Supports Webhook/Bot API dispatch plus local message ledger for Read/Update/Delete tracking.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const ARATTAI_LOG_PATH = path.resolve(__dirname, 'data', 'dhanam_arattai_messages.json');

class ArattaiService {
  getConfig() {
    return {
      botToken: process.env.ARATTAI_BOT_TOKEN || '',
      webhookUrl: process.env.ARATTAI_WEBHOOK_URL || '',
      channelId: process.env.ARATTAI_CHANNEL_ID || '',
      apiBase: process.env.ARATTAI_API_BASE || 'https://arattai.zoho.in/api/v1'
    };
  }

  isConfigured() {
    const cfg = this.getConfig();
    return Boolean(cfg.webhookUrl || (cfg.botToken && cfg.channelId));
  }

  _loadLog() {
    try {
      if (fs.existsSync(ARATTAI_LOG_PATH)) {
        return JSON.parse(fs.readFileSync(ARATTAI_LOG_PATH, 'utf-8'));
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  _saveLog(entries) {
    const dir = path.dirname(ARATTAI_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ARATTAI_LOG_PATH, JSON.stringify(entries, null, 2), 'utf-8');
  }

  _requestUrl(targetUrl, method = 'POST', headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(targetUrl);
      const reqHeaders = { ...headers };
      const strBody = body !== null ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
      if (strBody !== null) {
        reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(strBody);
      }

      const req = https.request({
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: reqHeaders
      }, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : { ok: true });
            } catch {
              resolve({ ok: true, raw: data });
            }
          } else {
            reject(new Error(`Arattai HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => req.destroy(new Error('Arattai API request timed out')));
      if (strBody !== null) req.write(strBody);
      req.end();
    });
  }

  /**
   * Perform CRUD operation on Arattai channel/messages.
   */
  async executeCrud({ operation, channelId = null, messageId = null, text = '', limit = 10 }) {
    const cfg = this.getConfig();
    const targetChannel = channelId || cfg.channelId || 'dhanam-site-ops';
    const op = (operation || 'create').toLowerCase();
    const log = this._loadLog();

    try {
      if (op === 'create' || op === 'send' || op === 'post') {
        if (!text) return { success: false, error: 'Message text is required for Arattai send' };

        let remoteResult = null;
        let dispatched = false;
        if (cfg.webhookUrl) {
          remoteResult = await this._requestUrl(cfg.webhookUrl, 'POST', {}, { text, channel: targetChannel });
          dispatched = true;
        } else if (cfg.botToken && targetChannel) {
          remoteResult = await this._requestUrl(
            `${cfg.apiBase.replace(/\/$/, '')}/channels/${encodeURIComponent(targetChannel)}/messages`,
            'POST',
            { 'Authorization': `Zoho-oauthtoken ${cfg.botToken}` },
            { text }
          );
          dispatched = true;
        }

        const entry = {
          id: (remoteResult && (remoteResult.message_id || remoteResult.id)) || `AR-${Date.now()}`,
          channelId: targetChannel,
          text,
          dispatched,
          createdAt: new Date().toISOString()
        };
        log.push(entry);
        this._saveLog(log);

        return {
          success: true,
          operation: 'create',
          dispatched,
          needsConfig: !dispatched,
          entry,
          note: dispatched ? 'Sent to Arattai' : 'Saved to Arattai outbox (configure ARATTAI_WEBHOOK_URL or ARATTAI_BOT_TOKEN in .env for live delivery)'
        };
      }

      if (op === 'read' || op === 'list') {
        if (cfg.botToken && targetChannel) {
          try {
            const remote = await this._requestUrl(
              `${cfg.apiBase.replace(/\/$/, '')}/channels/${encodeURIComponent(targetChannel)}/messages?limit=${limit || 10}`,
              'GET',
              { 'Authorization': `Zoho-oauthtoken ${cfg.botToken}` }
            );
            return { success: true, operation: 'read', source: 'live', messages: remote.messages || remote };
          } catch (liveErr) {
            // Fallback to local log
          }
        }
        const filtered = log.filter((m) => !channelId || m.channelId === targetChannel).slice(-(limit || 10));
        return { success: true, operation: 'read', source: 'local_log', messages: filtered };
      }

      if (op === 'update' || op === 'edit') {
        if (!messageId || !text) {
          return { success: false, error: 'messageId and new text are required for Arattai update' };
        }
        if (cfg.botToken && targetChannel) {
          await this._requestUrl(
            `${cfg.apiBase.replace(/\/$/, '')}/channels/${encodeURIComponent(targetChannel)}/messages/${encodeURIComponent(messageId)}`,
            'PUT',
            { 'Authorization': `Zoho-oauthtoken ${cfg.botToken}` },
            { text }
          );
        }
        const idx = log.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          log[idx].text = text;
          log[idx].updatedAt = new Date().toISOString();
          this._saveLog(log);
        }
        return { success: true, operation: 'update', messageId, text };
      }

      if (op === 'delete') {
        if (!messageId) {
          return { success: false, error: 'messageId is required for Arattai delete' };
        }
        if (cfg.botToken && targetChannel) {
          await this._requestUrl(
            `${cfg.apiBase.replace(/\/$/, '')}/channels/${encodeURIComponent(targetChannel)}/messages/${encodeURIComponent(messageId)}`,
            'DELETE',
            { 'Authorization': `Zoho-oauthtoken ${cfg.botToken}` }
          );
        }
        const nextLog = log.filter((m) => m.id !== messageId);
        this._saveLog(nextLog);
        return { success: true, operation: 'delete', messageId, removed: log.length - nextLog.length };
      }

      return { success: false, error: `Unsupported Arattai operation: ${operation}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new ArattaiService();
