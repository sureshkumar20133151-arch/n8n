const crypto = require('crypto');
const https = require('https');
const path = require('path');
const fs = require('fs');

const KEY_FILE = path.resolve(__dirname, 'google_drive_key.json');

// Dedicated Google Service Account for Arasan Electrical & Plumbing Drive Automation
const BUILTIN_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "n8n-whatsapp-491418",
  private_key_id: "1b6e755b09f93e559c9c26f0d828a5391b71a9bf",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDLJTy7VcTsk3Uj\nkHTk0imxEKAH8ktn8KAqLxo9BFmCc1A2St5M20hYkySB05r5Sy/yNE3aG7CHgpl1\nt5rHQnaZxyjjrUOu7mCQYEL0r5KMdAbi46OfgtlRklAKrYOpN//XGDr1M3gO9brM\nQsXDPANpotKqZ99t99BMP7jJ3Sn1tk2rBd91+sgNaC/CsGuV/OyLDYN+gcIm6Q+e\n4UHM3cMZlqWxmj2/huEN2+CU6Ow+n2yedlpFp3S2akD4znQOrAp5pOVqKpbTJV6g\nRgpneCz3mYBA7x7ZkCwKt1NY3NdvIBCYdFbOAzgBZ69bcMzXTibCinrkgxDiHvvN\n24OobXlhAgMBAAECggEADrEs68WVE6EfNd5tkzEJ9+GNGWtc0xx0O6jNcSqeiKXr\nYAnZJbOET3emNRzclqQT8ySfmXiAM29uxt9BD/aOxP9s8HkoWH9VYjZmu/NIxOS4\nAh0sSSM5sWxvYoj7E+LWG4ndQGejtWfwmx5HLErBBRj+uyP+ZPcpIaKdgZKqcA1J\naWo+qvwPYe/pftc6JmvCr6Ao4gs/qCV93dizSTcxsBlhhPep+G4hsLGiYG013Spz\n6t6wgPvi8B220Btw/Op9a7F6EcKm7qm5mSF4+c14KTOCzlOIHY126s7z3boRY8TD\nlcGoJK/qDqvDdbAZi+48lxA8/NnIOeXh9nO/c4KsmwKBgQDyGTzq95TvaG48dfYm\nS19+U+m/hXpoBB5MCPhsz1doPKB7CayBphOO9fc1niDapckLNT0J8oKYeKotRhJ6\naruid6tBq7kNuhh0Un+Nnxji8EmruEFL8DPgNdLaCS+fyuPd4HhY3cMw2NLcLw01\nVLvymg1SSfijdig54JjEzIYEnwKBgQDWz2b+a1QxKuNZx5keKXdpFODkKTLmjOoS\nQFp/o/oM39ai3ToZiD9GdFwCRLa3OfXNEC6byS41VMS8E3iXlVSasg3soIceydqS\nkBQFw9s3xdncu/h4JIP6Oaov8k4pb8hmG8FgzceG1ZhbAxOwWmh6yZfPWMcPEu5U\nl3+6eq3B/wKBgQDBrissFzHRbgxy1jQ8YqRc3ijsjY5l1JWgYrTL5/yXaZlBlXWq\nqwCOqHxDKuRBx8vU6ZyRbq/H5xDN83co9GZ0DaS2fvkm4DBcLvvYguVX+MAXXuru\nI5Z80tKCmEK/ZYNyp/ffsFpNo8jdWc8JUWajKVdq8760lvyLgQD2wGCfJQKBgQCe\nEez2V0CTFb5LOKeiHF10hBqhiveb1CIC4Dw4JRBCHQ0yt5yjYTE+xS1XtfzGg+4u\nwjOqC7bnI8PJqoJY+VhSpae9crs7msoug7tYKrHMLtmMpv3GWwiLP5fOxH1j3JAZ\nI19/vq2OuOruPitk4IJ1qJb/y5Jfs0ySDxG8xb3LPQKBgDgcYmpEAJNYPZamF+ze\n+w29wIm1L3RcYOuUT1jLQDbrTbqL1w2YxHtrX0AwjivNdzVj1p3yUMxymxt+xU/G\nKvj6FjbVWk3uDMcZimwtL6CuFzt8gXNq5u9LU/35hVLHCDeH4OsJxEBm3HvDNObM\nDLHEi3+IFD3PvSa9co4tD2zB\n-----END PRIVATE KEY-----\n",
  client_email: "drive-automation@n8n-whatsapp-491418.iam.gserviceaccount.com"
};

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
        console.log(`🔑 [GoogleDriveService] Loaded service account from file: ${this.keyData.client_email}`);
        return;
      }
      // Built-in fallback
      if (BUILTIN_SERVICE_ACCOUNT && BUILTIN_SERVICE_ACCOUNT.private_key) {
        this.keyData = BUILTIN_SERVICE_ACCOUNT;
        console.log(`🔑 [GoogleDriveService] Loaded built-in service account: ${this.keyData.client_email}`);
      }
    } catch (e) {
      console.warn(`[GoogleDriveService] Could not load key:`, e.message);
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
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
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

  async renameSiteFolder(siteName, oldStageName, newStageName) {
    try {
      const token = await this.getAccessToken();
      const rootFolderId = '1kFr-vNqFYDBbraiu11YD1Marn2siMcFo';
      
      const siteFolder = await this.findFolder(siteName.trim(), rootFolderId);
      if (!siteFolder) {
        return { success: false, error: `Site folder "${siteName}" not found in Google Drive.` };
      }

      const oldClean = oldStageName.trim();
      const newClean = newStageName.trim().replace(/\s+/g, '_');

      // Search for folders under siteFolder
      const q = `mimeType = 'application/vnd.google-apps.folder' and '${siteFolder.id}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)`;
      const resData = await this._makeHttpRequest(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const parsed = JSON.parse(resData);
      const targetFolder = (parsed.files || []).find(f => 
        f.name.toLowerCase() === oldClean.toLowerCase() ||
        f.name.toLowerCase() === oldClean.replace(/\s+/g, '_').toLowerCase() ||
        f.name.toLowerCase().includes(oldClean.toLowerCase())
      );

      if (!targetFolder) {
        return { success: false, error: `Folder matching "${oldStageName}" not found under ${siteName}.` };
      }

      // Rename the physical folder
      const renameBody = JSON.stringify({ name: newClean });
      await this._makeHttpRequest(`https://www.googleapis.com/drive/v3/files/${targetFolder.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(renameBody)
        }
      }, renameBody);

      // Rename files inside folder
      try {
        const fileListRes = await this._makeHttpRequest(`https://www.googleapis.com/drive/v3/files?q='${targetFolder.id}'+in+parents+and+trashed=false&fields=files(id,name)`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const files = JSON.parse(fileListRes).files || [];
        for (const f of files) {
          if (f.name.includes(oldClean) || f.name.includes(oldClean.replace(/\s+/g, '_'))) {
            const newFileName = f.name.replace(oldClean, newClean).replace(oldClean.replace(/\s+/g, '_'), newClean);
            const patchBody = JSON.stringify({ name: newFileName });
            await this._makeHttpRequest(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(patchBody)
              }
            }, patchBody);
          }
        }
      } catch (fileErr) {
        console.warn('[renameSiteFolder] Error updating file names:', fileErr.message);
      }

      return {
        success: true,
        siteName,
        oldStage: oldStageName,
        newStage: newClean,
        folderId: targetFolder.id,
        folderUrl: `https://drive.google.com/drive/folders/${targetFolder.id}`
      };
    } catch (err) {
      console.error('[renameSiteFolder] Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async fetchLatestSitePhotoFromDrive(siteQuery, stageQuery = 'All') {
    try {
      const token = await this.getAccessToken();
      const rootId = '1kFr-vNqFYDBbraiu11YD1Marn2siMcFo';

      // 1. Find site folder matching siteQuery
      const listRes = await this._makeHttpRequest(`https://www.googleapis.com/drive/v3/files?q='${rootId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,webViewLink)`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const folders = JSON.parse(listRes).files || [];
      const cleanSite = (siteQuery || '').trim().toLowerCase();
      const targetSite = folders.find(f => {
        const name = f.name.toLowerCase();
        return name.includes(cleanSite) || cleanSite.includes(name);
      });

      if (!targetSite) {
        console.log(`[fetchLatestSitePhotoFromDrive] Site "${siteQuery}" not found among folders:`, folders.map(f => f.name));
        return null;
      }

      // 2. Find subfolders & images
      const subRes = await this._makeHttpRequest(`https://www.googleapis.com/drive/v3/files?q='${targetSite.id}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webViewLink)`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const children = JSON.parse(subRes).files || [];

      let targetFile = null;
      let stageName = 'General_Work';
      let stageFolderLink = targetSite.webViewLink || `https://drive.google.com/drive/folders/${targetSite.id}`;

      // Check subfolders matching stageQuery
      const subfolders = children.filter(c => c.mimeType === 'application/vnd.google-apps.folder');
      for (const sub of subfolders) {
        if (stageQuery && stageQuery !== 'all' && stageQuery !== 'general') {
          const matchStage = sub.name.toLowerCase().includes(stageQuery.toLowerCase());
          if (!matchStage) continue;
        }
        const imgRes = await this._makeHttpRequest(`https://www.googleapis.com/drive/v3/files?q='${sub.id}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false&fields=files(id,name,createdTime,webViewLink)&orderBy=createdTime+desc`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const imgs = JSON.parse(imgRes).files || [];
        if (imgs.length > 0) {
          targetFile = imgs[0];
          stageName = sub.name;
          stageFolderLink = sub.webViewLink || `https://drive.google.com/drive/folders/${sub.id}`;
          break;
        }
      }

      // If no image found in specific subfolder, search all subfolders
      if (!targetFile) {
        for (const sub of subfolders) {
          const imgRes = await this._makeHttpRequest(`https://www.googleapis.com/drive/v3/files?q='${sub.id}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false&fields=files(id,name,createdTime,webViewLink)&orderBy=createdTime+desc`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const imgs = JSON.parse(imgRes).files || [];
          if (imgs.length > 0) {
            targetFile = imgs[0];
            stageName = sub.name;
            stageFolderLink = sub.webViewLink || `https://drive.google.com/drive/folders/${sub.id}`;
            break;
          }
        }
      }

      if (!targetFile) {
        return null;
      }

      // 3. Download binary to local cache
      const mediaDir = path.resolve(__dirname, 'data', 'site_media');
      if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
      const localPath = path.join(mediaDir, targetFile.name);

      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(localPath);
        https.get(`https://www.googleapis.com/drive/v3/files/${targetFile.id}?alt=media`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }, res => {
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve();
          });
        }).on('error', reject);
      });

      console.log(`📸 [Live Drive Download] Downloaded ${targetFile.name} (${fs.statSync(localPath).size} bytes) for ${targetSite.name}`);
      return {
        siteName: targetSite.name,
        stage: stageName,
        fileName: targetFile.name,
        localFilePath: localPath,
        driveFolderUrl: stageFolderLink
      };
    } catch (err) {
      console.warn('[fetchLatestSitePhotoFromDrive] Error:', err.message);
      return null;
    }
  }

  async uploadSitePhotoViaAppsScript(siteName, stage, fileName, imageBuffer) {
    const url = process.env.APPS_SCRIPT_WEBAPP_URL || 'https://script.google.com/macros/s/AKfycbwQvR4FHoG1abqy7pJDYlfAlkS1lcS0CNrFEPy9KwfOIjsJKTDYmdKIYI6DjqHWwrIa/exec';
    const payload = JSON.stringify({
      siteName,
      stage,
      fileName,
      imageBase64: imageBuffer.toString('base64')
    });

    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);
        const req = https.request({
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            https.get(res.headers.location, rRes => {
              let rBody = '';
              rRes.on('data', d => rBody += d);
              rRes.on('end', () => {
                try {
                  const parsed = JSON.parse(rBody);
                  console.log('☁️ [GoogleAppsScript] Uploaded image to Drive:', parsed.fileUrl || parsed.folderUrl);
                  resolve(parsed);
                } catch(e) {
                  resolve({ success: false, error: rBody });
                }
              });
            }).on('error', err => {
              console.warn('[AppsScript Redirect Error]:', err.message);
              resolve({ success: false, error: err.message });
            });
            return;
          }

          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              resolve(parsed);
            } catch(e) {
              resolve({ success: false, error: body });
            }
          });
        });

        req.on('error', err => {
          console.warn('[AppsScript Request Error]:', err.message);
          resolve({ success: false, error: err.message });
        });

        req.write(payload);
        req.end();
      } catch (err) {
        console.warn('[AppsScript Error]:', err.message);
        resolve({ success: false, error: err.message });
      }
    });
  }

  async appendPhotoLogToSheet(record) {
    try {
      const token = await this.getAccessToken();
      const sheetId = '1dH7K9IYVSSCAqznNxjz5j-Sv62i-vnw40I8t_3Ep5kc';
      const row = [
        record.timestamp || new Date().toISOString(),
        record.date || new Date().toISOString().split('T')[0],
        record.siteName || 'Site',
        record.workType || 'Roof Concrete Electrical Pipes',
        'Arasan MEP Team',
        record.loggedByChat || 'WhatsApp Group',
        record.driveFolderUrl || 'https://drive.google.com/drive/folders/1kFr-vNqFYDBbraiu11YD1Marn2siMcFo',
        String(record.photoCount || 1),
        record.notes || 'Site photo archive',
        'Verified & Archived'
      ];
      const appendBody = JSON.stringify({ values: [row] });
      const res = await this._makeHttpRequest(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Site_Photos_Log!A:J:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(appendBody)
        }
      }, appendBody);
      console.log('📊 [GoogleSheet] Appended site photo log to sheet:', record.siteName);
      return JSON.parse(res);
    } catch (e) {
      console.warn('[GoogleSheet] Error appending to sheet:', e.message);
      return null;
    }
  }

  async recordDailyAttendanceAndAdvance(entry) {
    try {
      const token = await this.getAccessToken();
      const sheetId = '1dH7K9IYVSSCAqznNxjz5j-Sv62i-vnw40I8t_3Ep5kc';
      const dateStr = entry.date || new Date().toISOString().split('T')[0];
      const row = [
        dateStr,
        String(entry.laborId || ''),
        entry.name || 'Worker',
        entry.siteAllocated || 'General Site',
        String(entry.dailyRate || 850),
        entry.attendanceStatus || 'Present',
        String(entry.advanceAmount || 0)
      ];
      const appendBody = JSON.stringify({ values: [row] });
      const res = await this._makeHttpRequest(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Daily_Attendance_Site_Log!A:G:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(appendBody)
        }
      }, appendBody);
      console.log(`📋 [GoogleSheet] Appended attendance/site log for ${entry.name} (${entry.siteAllocated})`);
      return JSON.parse(res);
    } catch (e) {
      console.warn('[GoogleSheet] Error appending attendance:', e.message);
      return null;
    }
  }

  async getAttendanceAndAdvanceSummary(laborName = null) {
    try {
      const token = await this.getAccessToken();
      const sheetId = '1dH7K9IYVSSCAqznNxjz5j-Sv62i-vnw40I8t_3Ep5kc';
      const resData = await this._makeHttpRequest(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Daily_Attendance_Site_Log!A2:G`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rows = JSON.parse(resData).values || [];

      // Group by laborer
      const summaryMap = new Map();
      const cleanTarget = (laborName || '').toLowerCase().trim();

      for (const r of rows) {
        const [date, laborId, name, site, rateStr, status, advanceStr] = r;
        if (!name) continue;
        const normName = name.trim();
        if (cleanTarget && cleanTarget !== 'all' && !normName.toLowerCase().includes(cleanTarget) && !cleanTarget.includes(normName.toLowerCase())) {
          continue;
        }

        if (!summaryMap.has(normName)) {
          summaryMap.set(normName, {
            name: normName,
            laborId: laborId || '',
            daysWorked: 0,
            dailyRate: Number(rateStr) || 850,
            totalGross: 0,
            totalAdvance: 0,
            sitesVisited: new Set(),
            advanceDetails: []
          });
        }

        const item = summaryMap.get(normName);
        if (site && !site.toLowerCase().includes('leave') && !site.toLowerCase().includes('off') && site !== '-') {
          item.sitesVisited.add(site);
        }
        const dailyRate = Number(rateStr) || item.dailyRate || 850;
        item.dailyRate = dailyRate;

        // Attendance day weight
        const st = (status || '').toLowerCase();
        let dayWeight = 0;
        if (st.includes('present') || st.includes('on') || st.includes('முழு நாள்')) {
          dayWeight = 1;
        } else if (st.includes('half') || st.includes('அரை')) {
          dayWeight = 0.5;
        } else if (st.includes('leave') || st.includes('absent') || st.includes('off')) {
          dayWeight = 0;
        }

        item.daysWorked += dayWeight;
        item.totalGross += (dayWeight * dailyRate);

        const adv = Number(advanceStr) || 0;
        if (adv > 0) {
          item.totalAdvance += adv;
          item.advanceDetails.push({ date, amount: adv });
        }
      }

      // Compute Net Payable for each worker
      const results = [];
      for (const [name, data] of summaryMap.entries()) {
        const netPayable = Math.max(0, data.totalGross - data.totalAdvance);
        results.push({
          name: data.name,
          laborId: data.laborId,
          daysWorked: data.daysWorked,
          dailyRate: data.dailyRate,
          grossSalary: data.totalGross,
          totalAdvanceDeducted: data.totalAdvance,
          netPayable: netPayable,
          sitesVisited: Array.from(data.sitesVisited).join(', ') || '-',
          advanceDetails: data.advanceDetails
        });
      }

      return results;
    } catch (e) {
      console.warn('[GoogleSheet] Error reading attendance summary:', e.message);
      return [];
    }
  }

  async recordWeeklySalarySettlement(record) {
    try {
      const token = await this.getAccessToken();
      const sheetId = '1dH7K9IYVSSCAqznNxjz5j-Sv62i-vnw40I8t_3Ep5kc';
      const row = [
        record.weekPeriod || 'This Week',
        String(record.laborId || ''),
        record.name || 'Worker',
        String(record.daysWorked || 0),
        String(record.dailyRate || 850),
        String(record.grossSalary || 0),
        String(record.totalAdvanceDeducted || 0),
        String(record.netPayable || 0),
        record.paymentStatus || 'Pending',
        record.paidDate || ''
      ];
      const appendBody = JSON.stringify({ values: [row] });
      await this._makeHttpRequest(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Weekly_Salary_Settlement!A:J:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(appendBody)
        }
      }, appendBody);
      console.log(`💰 [GoogleSheet] Appended weekly salary settlement for ${record.name}: Net ₹${record.netPayable}`);
      return true;
    } catch (e) {
      console.warn('[GoogleSheet] Error recording salary settlement:', e.message);
      return false;
    }
  }

  async markWeeklySalaryPaid(workerName = 'All', paidDate = null) {
    try {
      const token = await this.getAccessToken();
      const sheetId = '1dH7K9IYVSSCAqznNxjz5j-Sv62i-vnw40I8t_3Ep5kc';
      const actualPaidDate = paidDate || new Date().toISOString().split('T')[0];

      // Read current rows from Weekly_Salary_Settlement
      const res = await this._makeHttpRequest(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Weekly_Salary_Settlement!A2:J`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rows = JSON.parse(res).values || [];
      const cleanTarget = (workerName || '').toLowerCase().trim();

      const updatedStatusList = [];
      let updatedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = (row[2] || '').trim();
        const currentStatus = row[8] || 'Pending';
        const isMatch = (cleanTarget === 'all' || cleanTarget === '' || name.toLowerCase().includes(cleanTarget) || cleanTarget.includes(name.toLowerCase()));

        if (isMatch && currentStatus !== 'Leave') {
          const rowIndex = i + 2; // 1-based, skipping header
          const updateBody = JSON.stringify({ values: [['Paid', actualPaidDate]] });
          await this._makeHttpRequest(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Weekly_Salary_Settlement!I${rowIndex}:J${rowIndex}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(updateBody)
            }
          }, updateBody);
          updatedStatusList.push({ name, paidDate: actualPaidDate });
          updatedCount++;
        }
      }

      console.log(`✅ [GoogleSheet] Marked ${updatedCount} worker(s) salary as Paid on ${actualPaidDate}`);
      return { success: true, updatedCount, updatedStatusList, paidDate: actualPaidDate };
    } catch (e) {
      console.warn('[GoogleSheet] Error marking salary paid:', e.message);
      return { success: false, error: e.message };
    }
  }

  async getDailyAttendanceLogs(date = null, workerName = null, siteName = null, statusFilter = null) {
    try {
      const token = await this.getAccessToken();
      const sheetId = '1dH7K9IYVSSCAqznNxjz5j-Sv62i-vnw40I8t_3Ep5kc';
      const res = await this._makeHttpRequest(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Daily_Attendance_Site_Log!A2:G`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rows = JSON.parse(res).values || [];

      const cleanDate = (date || '').trim();
      const cleanWorker = (workerName || '').toLowerCase().trim();
      const cleanSite = (siteName || '').toLowerCase().trim();
      const cleanStatus = (statusFilter || '').toLowerCase().trim();

      const matchedRows = [];
      for (const r of rows) {
        const [rDate, laborId, name, site, salary, status, advance] = r;
        if (!name) continue;

        if (cleanDate && cleanDate !== 'all' && rDate !== cleanDate) {
          continue;
        }
        if (cleanWorker && cleanWorker !== 'all' && !name.toLowerCase().includes(cleanWorker) && !cleanWorker.includes(name.toLowerCase())) {
          continue;
        }
        if (cleanSite && cleanSite !== 'all' && !(site || '').toLowerCase().includes(cleanSite)) {
          continue;
        }
        if (cleanStatus && cleanStatus !== 'all' && !(status || '').toLowerCase().includes(cleanStatus)) {
          continue;
        }

        matchedRows.push({
          date: rDate,
          laborId,
          name: (name || '').trim(),
          site: (site || '-').trim(),
          salary: salary || '0',
          status: (status || 'Present').trim(),
          advance: advance || '0'
        });
      }

      return matchedRows;
    } catch (e) {
      console.warn('[GoogleSheet] Error reading daily attendance logs:', e.message);
      return [];
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

      if (data && !reqOptions.headers['Content-Length'] && !reqOptions.headers['content-length']) {
        reqOptions.headers['Content-Length'] = Buffer.byteLength(data);
      }

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
