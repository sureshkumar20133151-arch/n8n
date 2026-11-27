/**
 * Zoho Books REST API v3 Integration Service for Dhanam Holdings
 * Supports full CRUD on Invoices, Bills, Expenses, Customer Payments, and Contacts.
 * Uses OAuth2 Refresh Token flow with automatic access-token caching.
 */
const https = require('https');

class ZohoBooksService {
  constructor() {
    this.cachedAccessToken = null;
    this.tokenExpiresAt = 0;
  }

  getConfig() {
    return {
      clientId: process.env.ZOHO_CLIENT_ID || '',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
      refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
      orgId: process.env.ZOHO_ORG_ID || '',
      apiHost: process.env.ZOHO_BOOKS_API_HOST || 'www.zohoapis.in',
      accountsHost: process.env.ZOHO_ACCOUNTS_HOST || 'accounts.zoho.in'
    };
  }

  isConfigured() {
    const cfg = this.getConfig();
    return Boolean(cfg.clientId && cfg.clientSecret && cfg.refreshToken && cfg.orgId);
  }

  _request(hostname, path, method = 'GET', headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const options = { hostname, path, method, headers: { ...headers } };
      if (body !== null) {
        const str = typeof body === 'string' ? body : JSON.stringify(body);
        options.headers['Content-Length'] = Buffer.byteLength(str);
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.message || `Zoho API HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
            }
          } catch (e) {
            reject(new Error(`Zoho API parse error (${res.statusCode}): ${data.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(12000, () => {
        req.destroy(new Error('Zoho Books API request timed out'));
      });
      if (body !== null) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  async getAccessToken() {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedAccessToken;
    }
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      throw new Error('Zoho Books credentials missing in .env (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID)');
    }

    const qs = new URLSearchParams({
      refresh_token: cfg.refreshToken,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token'
    }).toString();

    const res = await this._request(cfg.accountsHost, `/oauth/v2/token?${qs}`, 'POST', {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    if (!res.access_token) {
      throw new Error(`Zoho OAuth failed: ${JSON.stringify(res)}`);
    }

    this.cachedAccessToken = res.access_token;
    this.tokenExpiresAt = Date.now() + ((res.expires_in || 3600) * 1000);
    return this.cachedAccessToken;
  }

  _entityEndpoint(entity) {
    const map = {
      invoice: 'invoices',
      invoices: 'invoices',
      bill: 'bills',
      bills: 'bills',
      expense: 'expenses',
      expenses: 'expenses',
      payment: 'customerpayments',
      customerpayment: 'customerpayments',
      vendorpayment: 'vendorpayments',
      contact: 'contacts',
      contacts: 'contacts',
      user: 'users',
      users: 'users'
    };
    return map[(entity || 'expenses').toLowerCase()] || 'expenses';
  }

  /**
   * Perform CRUD operation on Zoho Books entities.
   */
  async executeCrud({ operation, entity = 'expense', recordId = null, data = {}, filters = {} }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        needsConfig: true,
        error: 'Zoho Books credentials not configured in .env (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID).'
      };
    }

    try {
      const token = await this.getAccessToken();
      const cfg = this.getConfig();
      const endpoint = this._entityEndpoint(entity);
      const baseHeaders = {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      };

      const op = (operation || 'read').toLowerCase();

      if (op === 'create') {
        const res = await this._request(
          cfg.apiHost,
          `/books/v3/${endpoint}?organization_id=${encodeURIComponent(cfg.orgId)}`,
          'POST',
          baseHeaders,
          data
        );
        return { success: true, operation: 'create', entity: endpoint, data: res };
      }

      if (op === 'read' || op === 'list' || op === 'get') {
        if (recordId) {
          const res = await this._request(
            cfg.apiHost,
            `/books/v3/${endpoint}/${encodeURIComponent(recordId)}?organization_id=${encodeURIComponent(cfg.orgId)}`,
            'GET',
            baseHeaders
          );
          return { success: true, operation: 'read', entity: endpoint, data: res };
        }
        const params = new URLSearchParams({
          organization_id: cfg.orgId,
          per_page: String(filters.limit || 10),
          ...(filters.search_text ? { search_text: filters.search_text } : {}),
          ...(filters.status ? { status: filters.status } : {})
        });
        const res = await this._request(
          cfg.apiHost,
          `/books/v3/${endpoint}?${params.toString()}`,
          'GET',
          baseHeaders
        );
        return { success: true, operation: 'read', entity: endpoint, data: res[endpoint] || res };
      }

      if (op === 'update') {
        if (!recordId) return { success: false, error: 'recordId is required for Zoho Books update' };
        const res = await this._request(
          cfg.apiHost,
          `/books/v3/${endpoint}/${encodeURIComponent(recordId)}?organization_id=${encodeURIComponent(cfg.orgId)}`,
          'PUT',
          baseHeaders,
          data
        );
        return { success: true, operation: 'update', entity: endpoint, data: res };
      }

      if (op === 'delete') {
        if (!recordId) return { success: false, error: 'recordId is required for Zoho Books delete' };
        const res = await this._request(
          cfg.apiHost,
          `/books/v3/${endpoint}/${encodeURIComponent(recordId)}?organization_id=${encodeURIComponent(cfg.orgId)}`,
          'DELETE',
          baseHeaders
        );
        return { success: true, operation: 'delete', entity: endpoint, data: res };
      }

      return { success: false, error: `Unsupported Zoho Books operation: ${operation}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new ZohoBooksService();
