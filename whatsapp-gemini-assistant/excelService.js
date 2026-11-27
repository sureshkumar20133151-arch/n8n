/**
 * Local Microsoft Excel (.xlsx) CRUD Service for Dhanam Holdings
 * Zero OAuth required. Reads/writes directly to a local .xlsx workbook.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DEFAULT_EXCEL_PATH = path.resolve(__dirname, 'data', 'Dhanam_Holdings_Master.xlsx');

class ExcelService {
  getExcelPath(customPath = null) {
    return customPath || process.env.DHANAM_EXCEL_PATH || DEFAULT_EXCEL_PATH;
  }

  _getISTDate() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  _loadOrCreateWorkbook(filePath, sheetName = 'Site_Expenses') {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let wb;
    if (fs.existsSync(filePath)) {
      wb = XLSX.readFile(filePath);
    } else {
      wb = XLSX.utils.book_new();
    }

    if (!wb.SheetNames.includes(sheetName)) {
      const ws = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, filePath);
    }
    return wb;
  }

  _saveWorkbook(wb, filePath) {
    try {
      XLSX.writeFile(wb, filePath);
      return { ok: true };
    } catch (err) {
      if (err.code === 'EBUSY') {
        return {
          ok: false,
          error: `Excel file (${path.basename(filePath)}) is currently open in Microsoft Excel. Close it once so the bot can save changes.`
        };
      }
      return { ok: false, error: err.message };
    }
  }

  /**
   * Perform full CRUD on a local Excel (.xlsx) workbook.
   */
  async executeCrud({
    operation,
    sheetName = 'Site_Expenses',
    filePath = null,
    recordId = null,
    siteName = '',
    partyName = '',
    amount = null,
    category = 'Material',
    payer = 'Contractor',
    status = null,
    isReceived = undefined,
    notes = ''
  }) {
    const targetPath = this.getExcelPath(filePath);
    const op = (operation || 'read').toLowerCase();

    try {
      const wb = this._loadOrCreateWorkbook(targetPath, sheetName);
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (op === 'create') {
        const resolvedStatus = status || (isReceived === true ? 'Received' : 'Pending');
        const newRow = {
          ID: `XLS-${Date.now().toString(36).toUpperCase()}`,
          Date: this._getISTDate(),
          Site: siteName || 'General Site',
          Party: partyName || 'Site Vendor',
          Category: category || 'Material',
          Amount: Number(amount) || 0,
          Payer: payer || 'Contractor',
          Status: resolvedStatus,
          Notes: notes || '-',
          UpdatedAt: new Date().toISOString()
        };
        rows.push(newRow);
        wb.Sheets[sheetName] = XLSX.utils.json_to_sheet(rows);
        const saved = this._saveWorkbook(wb, targetPath);
        if (!saved.ok) return { success: false, error: saved.error };

        return { success: true, operation: 'create', filePath: targetPath, sheetName, row: newRow };
      }

      if (op === 'read' || op === 'list' || op === 'get') {
        const sFilter = (siteName || '').toLowerCase().trim();
        const pFilter = (partyName || '').toLowerCase().trim();
        const stFilter = (status || '').toLowerCase().trim();
        const idFilter = (recordId || '').trim();

        const matched = rows.filter((r) => {
          if (idFilter && String(r.ID) !== idFilter) return false;
          if (sFilter && sFilter !== 'all' && !String(r.Site || '').toLowerCase().includes(sFilter)) return false;
          if (pFilter && !String(r.Party || '').toLowerCase().includes(pFilter)) return false;
          if (stFilter && !String(r.Status || '').toLowerCase().includes(stFilter)) return false;
          return true;
        });

        const totalAmount = matched.reduce((sum, r) => sum + (Number(r.Amount) || 0), 0);
        const pendingAmount = matched
          .filter((r) => String(r.Status || '').toLowerCase().includes('pending'))
          .reduce((sum, r) => sum + (Number(r.Amount) || 0), 0);

        return {
          success: true,
          operation: 'read',
          filePath: targetPath,
          sheetName,
          count: matched.length,
          totalAmount,
          pendingAmount,
          rows: matched.slice(-20)
        };
      }

      if (op === 'update') {
        let idx = -1;
        if (recordId) {
          idx = rows.findIndex((r) => String(r.ID) === recordId);
        } else {
          const sFilter = (siteName || '').toLowerCase().trim();
          const pFilter = (partyName || '').toLowerCase().trim();
          for (let i = rows.length - 1; i >= 0; i--) {
            const r = rows[i];
            const sOk = !sFilter || String(r.Site || '').toLowerCase().includes(sFilter);
            const pOk = !pFilter || String(r.Party || '').toLowerCase().includes(pFilter);
            if (sOk && pOk) { idx = i; break; }
          }
        }

        if (idx === -1) {
          return { success: false, error: 'Matching Excel row not found for update.' };
        }

        const target = rows[idx];
        if (siteName) target.Site = siteName;
        if (partyName) target.Party = partyName;
        if (amount !== null && amount !== undefined) target.Amount = Number(amount);
        if (category) target.Category = category;
        if (payer) target.Payer = payer;
        if (notes) target.Notes = notes;
        if (status) {
          target.Status = status;
        } else if (isReceived !== undefined) {
          target.Status = isReceived ? 'Received' : 'Pending';
        }
        target.UpdatedAt = new Date().toISOString();

        wb.Sheets[sheetName] = XLSX.utils.json_to_sheet(rows);
        const saved = this._saveWorkbook(wb, targetPath);
        if (!saved.ok) return { success: false, error: saved.error };

        return { success: true, operation: 'update', filePath: targetPath, sheetName, row: target };
      }

      if (op === 'delete') {
        let idx = -1;
        if (recordId) {
          idx = rows.findIndex((r) => String(r.ID) === recordId);
        } else {
          const sFilter = (siteName || '').toLowerCase().trim();
          const pFilter = (partyName || '').toLowerCase().trim();
          for (let i = rows.length - 1; i >= 0; i--) {
            const r = rows[i];
            const sOk = !sFilter || String(r.Site || '').toLowerCase().includes(sFilter);
            const pOk = !pFilter || String(r.Party || '').toLowerCase().includes(pFilter);
            if (sOk && pOk) { idx = i; break; }
          }
        }

        if (idx === -1) {
          return { success: false, error: 'Matching Excel row not found for delete.' };
        }

        const [deletedRow] = rows.splice(idx, 1);
        wb.Sheets[sheetName] = XLSX.utils.json_to_sheet(rows);
        const saved = this._saveWorkbook(wb, targetPath);
        if (!saved.ok) return { success: false, error: saved.error };

        return { success: true, operation: 'delete', filePath: targetPath, sheetName, deletedRow };
      }

      return { success: false, error: `Unsupported Excel operation: ${operation}` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new ExcelService();
