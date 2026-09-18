const isNetlify = !!process.env.NETLIFY;

let sqlite3, db;
if (!isNetlify) {
  try {
    sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const fs = require('fs');

    const dbDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'leads.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Could not connect to SQLite database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database at:', dbPath);
      }
    });

    // Initialize leads table
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          area TEXT,
          service TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          email_status TEXT DEFAULT 'pending',
          sheet_status TEXT DEFAULT 'pending',
          excel_filename TEXT
        )
      `);

      // Safe migration: add sheet_status column if it doesn't already exist in existing DB
      db.all(`PRAGMA table_info(leads)`, (err, columns) => {
        if (!err && columns && !columns.some(col => col.name === 'sheet_status')) {
          db.run(`ALTER TABLE leads ADD COLUMN sheet_status TEXT DEFAULT 'pending'`);
        }
      });
    });
  } catch (err) {
    console.warn('SQLite init skipped (running in serverless or unsupported environment):', err.message);
  }
}

/**
 * Helper to get Netlify Blobs storage store
 */
function getNetlifyStore() {
  const { getStore } = require('@netlify/blobs');
  return getStore('leads-store');
}

/**
 * Save a new lead (supports Netlify Blobs on cloud and SQLite locally)
 * @param {Object} lead - { name, phone, area, service, notes }
 * @returns {Promise<Object>} Inserted lead with id
 */
async function insertLead(lead) {
  if (isNetlify) {
    try {
      const store = getNetlifyStore();
      const leads = (await store.get('leads_list', { type: 'json' })) || [];
      const nextId = leads.length > 0 ? Math.max(...leads.map(l => l.id || 0)) + 1 : 1;
      const newLead = {
        id: nextId,
        name: lead.name.trim(),
        phone: lead.phone.trim(),
        area: lead.area ? lead.area.trim() : 'Bangalore',
        service: lead.service ? lead.service.trim() : 'House Painting',
        notes: lead.notes ? lead.notes.trim() : '',
        created_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        email_status: 'pending',
        sheet_status: 'pending',
        excel_filename: null
      };
      leads.unshift(newLead);
      await store.setJSON('leads_list', leads);
      return newLead;
    } catch (err) {
      console.error('❌ Netlify Blobs insertLead error:', err);
      throw err;
    }
  }

  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO leads (name, phone, area, service, notes, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `;
    const params = [
      lead.name.trim(),
      lead.phone.trim(),
      lead.area ? lead.area.trim() : 'Not Specified',
      lead.service ? lead.service.trim() : 'House Painting',
      lead.notes ? lead.notes.trim() : ''
    ];

    db.run(query, params, function (err) {
      if (err) {
        return reject(err);
      }
      const leadId = this.lastID;
      db.get(`SELECT * FROM leads WHERE id = ?`, [leadId], (getErr, row) => {
        if (getErr) return reject(getErr);
        resolve(row);
      });
    });
  });
}

/**
 * Update email dispatch status for a lead
 * @param {number} id
 * @param {string} status - 'sent', 'failed', 'logged_no_smtp'
 * @param {string} [excelFilename]
 */
async function updateLeadEmailStatus(id, status, excelFilename = null) {
  if (isNetlify) {
    try {
      const store = getNetlifyStore();
      const leads = (await store.get('leads_list', { type: 'json' })) || [];
      const item = leads.find(l => String(l.id) === String(id));
      if (item) {
        item.email_status = status;
        if (excelFilename) item.excel_filename = excelFilename;
        await store.setJSON('leads_list', leads);
      }
      return { updated: item ? 1 : 0 };
    } catch (err) {
      console.error('Netlify Blobs updateLeadEmailStatus error:', err);
      return { updated: 0 };
    }
  }

  return new Promise((resolve, reject) => {
    const query = `
      UPDATE leads 
      SET email_status = ?, excel_filename = COALESCE(?, excel_filename)
      WHERE id = ?
    `;
    db.run(query, [status, excelFilename, id], function (err) {
      if (err) return reject(err);
      resolve({ updated: this.changes });
    });
  });
}

/**
 * Update Google Sheets sync status for a lead
 * @param {number} id
 * @param {string} status - 'synced', 'failed', 'logged_no_webhook'
 */
async function updateLeadSheetStatus(id, status) {
  if (isNetlify) {
    try {
      const store = getNetlifyStore();
      const leads = (await store.get('leads_list', { type: 'json' })) || [];
      const item = leads.find(l => String(l.id) === String(id));
      if (item) {
        item.sheet_status = status;
        await store.setJSON('leads_list', leads);
      }
      return { updated: item ? 1 : 0 };
    } catch (err) {
      console.error('Netlify Blobs updateLeadSheetStatus error:', err);
      return { updated: 0 };
    }
  }

  return new Promise((resolve, reject) => {
    const query = `UPDATE leads SET sheet_status = ? WHERE id = ?`;
    db.run(query, [status, id], function (err) {
      if (err) return reject(err);
      resolve({ updated: this.changes });
    });
  });
}

/**
 * Retrieve all leads (newest first)
 */
async function getAllLeads(limit = 100) {
  if (isNetlify) {
    try {
      const store = getNetlifyStore();
      const leads = (await store.get('leads_list', { type: 'json' })) || [];
      return leads.slice(0, limit);
    } catch (err) {
      console.error('Netlify Blobs getAllLeads error:', err);
      return [];
    }
  }

  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM leads ORDER BY id DESC LIMIT ?`, [limit], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Delete a single lead by ID
 * @param {number|string} id
 */
async function deleteLead(id) {
  if (isNetlify) {
    try {
      const store = getNetlifyStore();
      let leads = (await store.get('leads_list', { type: 'json' })) || [];
      const prevLen = leads.length;
      leads = leads.filter(l => String(l.id) !== String(id));
      await store.setJSON('leads_list', leads);
      return { deleted: prevLen - leads.length };
    } catch (err) {
      console.error('Netlify Blobs deleteLead error:', err);
      return { deleted: 0 };
    }
  }

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM leads WHERE id = ?`, [id], function (err) {
      if (err) return reject(err);
      resolve({ deleted: this.changes });
    });
  });
}

/**
 * Delete all leads (e.g. wiping test data)
 */
async function deleteAllLeads() {
  if (isNetlify) {
    try {
      const store = getNetlifyStore();
      const leads = (await store.get('leads_list', { type: 'json' })) || [];
      await store.setJSON('leads_list', []);
      return { deleted: leads.length };
    } catch (err) {
      console.error('Netlify Blobs deleteAllLeads error:', err);
      return { deleted: 0 };
    }
  }

  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM leads`, [], function (err) {
      if (err) return reject(err);
      resolve({ deleted: this.changes });
    });
  });
}

module.exports = {
  db,
  insertLead,
  updateLeadEmailStatus,
  updateLeadSheetStatus,
  getAllLeads,
  deleteLead,
  deleteAllLeads
};
