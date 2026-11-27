/**
 * Slack Web API & Webhook Integration Service for Dhanam Holdings
 * Supports full CRUD on Slack channel messages: Post (Create), History (Read), Update, Delete.
 */
const https = require('https');

class SlackService {
  getConfig() {
    return {
      botToken: process.env.SLACK_BOT_TOKEN || '',
      defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '',
      webhookUrl: process.env.SLACK_WEBHOOK_URL || ''
    };
  }

  isConfigured() {
    const cfg = this.getConfig();
    return Boolean((cfg.botToken && cfg.defaultChannel) || cfg.webhookUrl);
  }

  _slackApi(methodName, payload = {}, httpMethod = 'POST') {
    const { botToken } = this.getConfig();
    return new Promise((resolve, reject) => {
      let apiPath = `/api/${methodName}`;
      let body = null;
      const headers = {
        'Authorization': `Bearer ${botToken}`
      };

      if (httpMethod === 'GET') {
        const qs = new URLSearchParams(payload).toString();
        if (qs) apiPath += `?${qs}`;
      } else {
        body = JSON.stringify(payload);
        headers['Content-Type'] = 'application/json; charset=utf-8';
        headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = https.request({
        hostname: 'slack.com',
        path: apiPath,
        method: httpMethod,
        headers
      }, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data || '{}');
            if (!parsed.ok) {
              reject(new Error(parsed.error || `Slack API error (${res.statusCode})`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Slack response parse error: ${data.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => req.destroy(new Error('Slack API request timed out')));
      if (body) req.write(body);
      req.end();
    });
  }

  _postWebhook(webhookUrl, text) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(webhookUrl);
      const body = JSON.stringify({ text });
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, response: data });
          } else {
            reject(new Error(`Slack webhook HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => req.destroy(new Error('Slack webhook timed out')));
      req.write(body);
      req.end();
    });
  }

  /**
   * Perform CRUD operation on Slack messages.
   */
  async executeCrud({ operation, channel = null, text = '', messageTs = null, limit = 10 }) {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      return {
        success: false,
        needsConfig: true,
        error: 'Slack credentials not configured in .env (SLACK_BOT_TOKEN & SLACK_DEFAULT_CHANNEL, or SLACK_WEBHOOK_URL).'
      };
    }

    const targetChannel = channel || cfg.defaultChannel;
    const op = (operation || 'create').toLowerCase();

    try {
      if (op === 'create' || op === 'post' || op === 'send') {
        if (!text) return { success: false, error: 'Message text is required for Slack post' };
        if (cfg.botToken && targetChannel) {
          const res = await this._slackApi('chat.postMessage', { channel: targetChannel, text });
          return { success: true, operation: 'create', channel: res.channel, ts: res.ts, text };
        }
        if (cfg.webhookUrl) {
          await this._postWebhook(cfg.webhookUrl, text);
          return { success: true, operation: 'create', via: 'webhook', text };
        }
      }

      if (!cfg.botToken || !targetChannel) {
        return {
          success: false,
          needsConfig: true,
          error: 'SLACK_BOT_TOKEN and SLACK_DEFAULT_CHANNEL are required for Slack read/update/delete.'
        };
      }

      if (op === 'read' || op === 'list') {
        const res = await this._slackApi('conversations.history', {
          channel: targetChannel,
          limit: String(limit || 10)
        }, 'GET');
        const messages = (res.messages || []).map((m) => ({
          ts: m.ts,
          user: m.user || m.bot_id || 'bot',
          text: m.text
        }));
        return { success: true, operation: 'read', channel: targetChannel, messages };
      }

      if (op === 'update' || op === 'edit') {
        if (!messageTs || !text) {
          return { success: false, error: 'messageTs and new text are required for Slack update' };
        }
        const res = await this._slackApi('chat.update', {
          channel: targetChannel,
          ts: messageTs,
          text
        });
        return { success: true, operation: 'update', channel: res.channel, ts: res.ts, text };
      }

      if (op === 'delete') {
        if (!messageTs) {
          return { success: false, error: 'messageTs is required for Slack delete' };
        }
        const res = await this._slackApi('chat.delete', {
          channel: targetChannel,
          ts: messageTs
        });
        return { success: true, operation: 'delete', channel: res.channel, ts: res.ts };
      }

      return { success: false, error: `Unsupported Slack operation: ${operation}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new SlackService();
