const crypto = require('crypto');
const https = require('https');
const path = require('path');
const fs = require('fs');

const KEY_FILE = path.resolve(__dirname, 'google_drive_key.json');

class GoogleDriveService {
  constructor() {
    this.keyData = null;
    this.cachedToken = null;
    this.tokenExpiry = 0;
    this.loadKey();
  }

  loadKey() {
    try {
      if (process.env.GOOGLE_DRIVE_KEY_JSON) {
        this.keyData = JSON.parse(process.env.GOOGLE_DRIVE_KEY_JSON);
        console.log(`🔑 [GoogleDriveService] Loaded service account from ENV: ${this.keyData.client_email}`);
        return;
      }
      if (fs.existsSync(KEY_FILE)) {
        this.keyData = JSON.parse(fs.readFileSync(KEY_FILE, 'utf-8'));
        console.log(`🔑 [GoogleDriveService] Loaded service account: ${this.keyData.client_email}`);
      }
    } catch (e) {
      console.warn(`[GoogleDriveService] Could not load key file:`, e.message);
    }
  }

  isConfigured() {
    return Boolean(this.keyData && this.keyData.client_email && this.keyData.private_key);
  }

  async getAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.tokenExpiry > now + 300) {
      return this.cachedToken;
    }

    if (!this.isConfigured()) {
      throw new Error('Google Drive service account key not configured.');
    }

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claimSet = Buffer.from(JSON.stringify({
      iss: this.keyData.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    })).toString('base64url');

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${claimSet}`);
    const signature = signer.sign(this.keyData.private_key, 'base64url');
    const jwt = `${header}.${claimSet}.${signature}`;
    const postData = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt;

    const resData = await this._makeHttpRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    const parsed = JSON.parse(resData);
    if (!parsed.access_token) {
      throw new Error(`Failed to get Google OAuth2 token: ${resData}`);
    }

    this.cachedToken = parsed.access_token;
    this.tokenExpiry = now + 3500;
    return this.cachedToken;
  }

  async findFolder(folderName, parentId = null) {
    const token = await this.getAccessToken();
    let q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)`;
    const resData = await this._makeHttpRequest(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const parsed = JSON.parse(resData);
    if (parsed.files && parsed.files.length > 0) {
      return parsed.files[0];
    }
    return null;
  }

  async createFolder(folderName, parentId = null) {
    const token = await this.getAccessToken();
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const body = JSON.stringify(metadata);
    const resData = await this._makeHttpRequest('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, body);

    const folder = JSON.parse(resData);
    await this.makePublicReadable(folder.id);
    return folder;
  }

  async getOrCreateSiteFolder(siteName, stageName) {
    try {
      // 1. Root Folder: Use Arasan electrical & plumbing folder shared by Suresh
      const rootFolderId = '1kFr-vNqFYDBbraiu11YD1Marn2siMcFo';

      // 2. Site Folder inside Arasan electrical & plumbing
      const sanitizedSite = siteName.trim();
      let siteFolder = await this.findFolder(sanitizedSite, rootFolderId);
      if (!siteFolder) {
        siteFolder = await this.createFolder(sanitizedSite, rootFolderId);
      }

      // 3. Stage Subfolder inside Site Folder
      const sanitizedStage = stageName.trim();
      let stageFolder = await this.findFolder(sanitizedStage, siteFolder.id);
      if (!stageFolder) {
        stageFolder = await this.createFolder(sanitizedStage, siteFolder.id);
      }

      return {
        folderId: stageFolder.id,
        folderName: stageFolder.name,
        webViewLink: stageFolder.webViewLink || `https://drive.google.com/drive/folders/${stageFolder.id}`
      };
    } catch (e) {
      console.warn(`[GoogleDriveService] Error setting up site folder: ${e.message}`);
      return {
        folderId: null,
        webViewLink: `https://drive.google.com/drive/folders/1kFr-vNqFYDBbraiu11YD1Marn2siMcFo`
      };
    }
  }

  async makePublicReadable(fileId) {
    try {
      const token = await this.getAccessToken();
      const body = JSON.stringify({
        role: 'reader',
        type: 'anyone'
      });
      await this._makeHttpRequest(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);
    } catch (e) {
      // Non-blocking
    }
  }

  async uploadFile(buffer, fileName, mimeType = 'image/jpeg', parentFolderId = null) {
    const token = await this.getAccessToken();
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
      name: fileName,
      mimeType: mimeType
    };
    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const multipartRequestBody = Buffer.concat([
      Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter),
      Buffer.from(`Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`),
      Buffer.from(buffer.toString('base64')),
      Buffer.from(closeDelim)
    ]);

    const resData = await this._makeHttpRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length
      }
    }, multipartRequestBody);

    const uploaded = JSON.parse(resData);
    if (uploaded && uploaded.id) {
      await this.makePublicReadable(uploaded.id);
    }
    return uploaded;
  }

  _makeHttpRequest(urlStr, options, data = null) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(urlStr);
      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = https.request(reqOptions, res => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
          }
        });
      });

      req.on('error', reject);
      if (data) {
        req.write(data);
      }
      req.end();
    });
  }
}

const googleDriveService = new GoogleDriveService();
module.exports = googleDriveService;
