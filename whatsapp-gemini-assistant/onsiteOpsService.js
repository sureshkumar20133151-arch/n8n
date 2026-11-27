/**
 * Onsite Operations CRUD Service for Dhanam Holdings
 * Manages site bills, labor attendance, material logs, and advances with local JSON persistence
 * and automatic Google Sheets sync when credentials are present.
 */
const fs = require('fs');
const path = require('path');
const googleDriveService = require('./googleDriveService');

const ONSITE_DB_PATH = path.resolve(__dirname, 'data', 'dhanam_onsite_records.json');

class OnsiteOpsService {
  _loadRecords() {
    try {
      if (fs.existsSync(ONSITE_DB_PATH)) {
        return JSON.parse(fs.readFileSync(ONSITE_DB_PATH, 'utf-8'));
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  _saveRecords(records) {
    const dir = path.dirname(ONSITE_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ONSITE_DB_PATH, JSON.stringify(records, null, 2), 'utf-8');
  }

  _generateId() {
    return `SITE-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Execute full CRUD on onsite records.
   */
  async executeCrud({
    operation,
    recordId = null,
    siteName = '',
    partyName = '',
    amount = null,
    category = 'Material',
    payer = 'Contractor',
    isReceived = false,
    notes = '',
    status = null
  }) {
    const op = (operation || 'read').toLowerCase();
    const records = this._loadRecords();

    if (op === 'create') {
      const entry = {
        id: this._generateId(),
        siteName: siteName || 'General Site',
        partyName: partyName || 'Site Vendor',
        amount: Number(amount) || 0,
        category: category || 'Material',
        payer: payer || 'Contractor',
        isReceived: Boolean(isReceived),
        status: status || (isReceived ? 'Received' : 'Pending Collection'),
        notes: notes || '-',
        createdAt: new Date().toISOString()
      };
      records.push(entry);
      this._saveRecords(records);

      let sheetSynced = false;
      try {
        const gsRes = await googleDriveService.recordSiteBill({
          siteName: entry.siteName,
          workerName: entry.partyName,
          paidOutBy: entry.payer,
          billOwedBy: entry.payer,
          amount: entry.amount,
          collectionStatus: entry.status,
          details: `[${entry.category}] ${entry.notes}`
        });
        sheetSynced = Boolean(gsRes && gsRes.success);
      } catch (e) { /* safe fallback */ }

      return { success: true, operation: 'create', record: entry, sheetSynced };
    }

    if (op === 'read' || op === 'list' || op === 'get') {
      const sFilter = (siteName || '').toLowerCase().trim();
      const pFilter = (partyName || '').toLowerCase().trim();
      const idFilter = (recordId || '').trim();

      const matched = records.filter((r) => {
        if (idFilter && r.id !== idFilter) return false;
        if (sFilter && sFilter !== 'all' && !(r.siteName || '').toLowerCase().includes(sFilter)) return false;
        if (pFilter && !(r.partyName || '').toLowerCase().includes(pFilter)) return false;
        if (status && !(r.status || '').toLowerCase().includes(status.toLowerCase())) return false;
        return true;
      });

      const totalAmount = matched.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const pendingAmount = matched
        .filter((r) => (r.status || '').toLowerCase().includes('pending'))
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

      return {
        success: true,
        operation: 'read',
        count: matched.length,
        totalAmount,
        pendingAmount,
        records: matched.slice(-20)
      };
    }

    if (op === 'update') {
      let idx = -1;
      if (recordId) {
        idx = records.findIndex((r) => r.id === recordId);
      } else {
        // Match most recent record by siteName and/or partyName
        const sFilter = (siteName || '').toLowerCase().trim();
        const pFilter = (partyName || '').toLowerCase().trim();
        for (let i = records.length - 1; i >= 0; i--) {
          const r = records[i];
          const sOk = !sFilter || (r.siteName || '').toLowerCase().includes(sFilter);
          const pOk = !pFilter || (r.partyName || '').toLowerCase().includes(pFilter);
          if (sOk && pOk) {
            idx = i;
            break;
          }
        }
      }

      if (idx === -1) {
        return { success: false, error: 'Matching onsite record not found for update.' };
      }

      const target = records[idx];
      if (siteName) target.siteName = siteName;
      if (partyName) target.partyName = partyName;
      if (amount !== null && amount !== undefined) target.amount = Number(amount);
      if (category) target.category = category;
      if (payer) target.payer = payer;
      if (notes) target.notes = notes;
      if (status) {
        target.status = status;
        target.isReceived = status.toLowerCase().includes('received') || status.toLowerCase().includes('paid');
      } else if (isReceived !== undefined) {
        target.isReceived = Boolean(isReceived);
        target.status = target.isReceived ? 'Received' : 'Pending Collection';
      }
      target.updatedAt = new Date().toISOString();
      this._saveRecords(records);

      if (target.isReceived) {
        try {
          await googleDriveService.updateBillCollectionStatus(target.siteName, target.partyName, target.amount, 'Received');
        } catch (e) { /* safe fallback */ }
      }

      return { success: true, operation: 'update', record: target };
    }

    if (op === 'delete') {
      let idx = -1;
      if (recordId) {
        idx = records.findIndex((r) => r.id === recordId);
      } else {
        const sFilter = (siteName || '').toLowerCase().trim();
        const pFilter = (partyName || '').toLowerCase().trim();
        for (let i = records.length - 1; i >= 0; i--) {
          const r = records[i];
          const sOk = !sFilter || (r.siteName || '').toLowerCase().includes(sFilter);
          const pOk = !pFilter || (r.partyName || '').toLowerCase().includes(pFilter);
          if (sOk && pOk) {
            idx = i;
            break;
          }
        }
      }

      if (idx === -1) {
        return { success: false, error: 'Matching onsite record not found for delete.' };
      }

      const [removed] = records.splice(idx, 1);
      this._saveRecords(records);
      return { success: true, operation: 'delete', deletedRecord: removed };
    }

    return { success: false, error: `Unsupported onsite operation: ${operation}` };
  }
}

module.exports = new OnsiteOpsService();
