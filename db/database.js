const path = require('path');
const fs = require('fs');

const isNetlify = !!process.env.NETLIFY;
const isVercel = !!process.env.VERCEL;

// Supabase Cloud PostgreSQL Data Layer (Active & Shared across all Vercel instances)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uthmtkuduoanjqwgqylh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0aG10a3VkdW9hbmpxd2dxeWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MTE3MzEsImV4cCI6MjEwNzM4NzczMX0.83eSiON4Zap9fosUMdzTW5wxYePG99EK-oPkNWipzJA';

function supabaseHeaders(extra = {}) {
  return Object.assign({
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  }, extra);
}

// In-memory fallback store
let memoryLeads = [];
const bundledFallbackPath = path.join(__dirname, '..', 'data', 'leads_fallback.json');
const writableFallbackPath = path.join(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : path.join(__dirname, '..', 'data'),
  'leads_fallback.json'
);

// Dynamic Site Configuration Storage
const bundledConfigPath = path.join(__dirname, '..', 'data', 'site_config.json');
const writableConfigPath = path.join(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp' : path.join(__dirname, '..', 'data'),
  'site_config.json'
);

let memorySiteConfig = null;

function getDefaultSiteConfig() {
  return {
    phone: "+91 93800 17556",
    whatsapp: "919380017556",
    email: "royalhomepainting11@gmail.com",
    instagram: "https://www.instagram.com/royalhomepainting11/",
    businessTitle: "Royal Home Painting",
    tagline: "Simple, Seamless, Satisfaction — Bangalore's Trusted House Painters Since 2018",
    promoBanner: "🎉 Special Offer: Flat 15% OFF on Interior & Exterior Painting + Free On-Site Inspection in Bangalore!",
    promoBannerActive: true,
    serviceAreas: "Indiranagar, HSR Layout, Koramangala, Whitefield, Jayanagar, Electronic City, Bellandur, Marathahalli & all Bangalore",
    pricingInterior: "₹12 / sq.ft",
    pricingExterior: "₹15 / sq.ft",
    pricingWaterproofing: "₹28 / sq.ft"
  };
}

function getSiteConfig() {
  if (memorySiteConfig) return memorySiteConfig;
  try {
    if (fs.existsSync(writableConfigPath)) {
      memorySiteConfig = JSON.parse(fs.readFileSync(writableConfigPath, 'utf8'));
      return memorySiteConfig;
    }
    if (fs.existsSync(bundledConfigPath)) {
      memorySiteConfig = JSON.parse(fs.readFileSync(bundledConfigPath, 'utf8'));
      return memorySiteConfig;
    }
  } catch (_) {}
  memorySiteConfig = getDefaultSiteConfig();
  return memorySiteConfig;
}

function saveSiteConfig(newConfig) {
  memorySiteConfig = Object.assign({}, getSiteConfig(), newConfig);
  try {
    fs.writeFileSync(writableConfigPath, JSON.stringify(memorySiteConfig, null, 2), 'utf8');
  } catch (_) {}
  try {
    fs.writeFileSync(bundledConfigPath, JSON.stringify(memorySiteConfig, null, 2), 'utf8');
  } catch (_) {}

  // Async sync to Supabase in background
  try {
    fetch(`${SUPABASE_URL}/rest/v1/site_config`, {
      method: 'POST',
      headers: supabaseHeaders({ 'Prefer': 'resolution=merge-duplicates' }),
      body: JSON.stringify({ id: 'current', data: memorySiteConfig, updated_at: new Date().toISOString() })
    }).catch(() => {});
  } catch (_) {}

  return memorySiteConfig;
}

let sqlite3, db;
let useFallback = isNetlify || isVercel;

if (!isNetlify && !isVercel) {
  try {
    sqlite3 = require('sqlite3').verbose();
    const dbDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, 'leads.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        useFallback = true;
      }
    });
    if (db) {
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
      });
    }
  } catch (err) {
    useFallback = true;
  }
}

/**
 * Save a new lead (Primary: Supabase Cloud PostgreSQL; Fallback: SQLite/Memory)
 */
async function insertLead(lead) {
  const leadPayload = {
    name: lead.name.trim(),
    phone: lead.phone.trim(),
    area: lead.area ? lead.area.trim() : 'Bangalore',
    service: lead.service ? lead.service.trim() : 'House Painting',
    notes: lead.notes ? lead.notes.trim() : '',
    email_status: 'pending',
    sheet_status: 'pending'
  };

  // 1. Supabase Cloud PostgreSQL (shared across all Vercel lambdas)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: supabaseHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(leadPayload)
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const saved = rows[0];
        memoryLeads.unshift(saved);
        return saved;
      }
    }
  } catch (err) {
    console.warn('⚠️ Supabase insert notice:', err.message);
  }

  // 2. Local SQLite fallback
  if (!useFallback && db) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO leads (name, phone, area, service, notes, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `;
      const params = [leadPayload.name, leadPayload.phone, leadPayload.area, leadPayload.service, leadPayload.notes];
      db.run(query, params, function (err) {
        if (err) return reject(err);
        const leadId = this.lastID;
        db.get(`SELECT * FROM leads WHERE id = ?`, [leadId], (getErr, row) => {
          if (getErr) return reject(getErr);
          resolve(row);
        });
      });
    });
  }

  // 3. Memory fallback
  const maxExisting = memoryLeads.length > 0 ? Math.max(...memoryLeads.map(l => Number(l.id) || 0)) : 1000;
  const nextId = Math.max(maxExisting + 1, 1001);
  const fallbackLead = Object.assign({ id: nextId, created_at: new Date().toISOString() }, leadPayload);
  memoryLeads.unshift(fallbackLead);
  return fallbackLead;
}

/**
 * Update email status for a lead
 */
async function updateLeadEmailStatus(id, status, excelFilename = null) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
      method: 'PATCH',
      headers: supabaseHeaders(),
      body: JSON.stringify({ email_status: status, excel_filename: excelFilename })
    });
  } catch (_) {}

  if (!useFallback && db) {
    db.run(`UPDATE leads SET email_status = ?, excel_filename = ? WHERE id = ?`, [status, excelFilename, id], () => {});
  }
  const item = memoryLeads.find(l => String(l.id) === String(id));
  if (item) {
    item.email_status = status;
    if (excelFilename) item.excel_filename = excelFilename;
  }
  return { updated: 1 };
}

/**
 * Update Google Sheets status for a lead
 */
async function updateLeadSheetStatus(id, status) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
      method: 'PATCH',
      headers: supabaseHeaders(),
      body: JSON.stringify({ sheet_status: status })
    });
  } catch (_) {}

  if (!useFallback && db) {
    db.run(`UPDATE leads SET sheet_status = ?, id = ? WHERE id = ?`, [status, id, id], () => {});
  }
  const item = memoryLeads.find(l => String(l.id) === String(id));
  if (item) item.sheet_status = status;
  return { updated: 1 };
}

/**
 * Retrieve all leads (newest first)
 */
async function getAllLeads(limit = 100) {
  // 1. Primary: Fetch from Supabase Cloud PostgreSQL
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=id.desc&limit=${limit}`, {
      headers: supabaseHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        memoryLeads = data;
        return data;
      }
    }
  } catch (err) {
    console.warn('⚠️ Supabase fetch notice:', err.message);
  }

  // 2. Fallback: Local SQLite
  if (!useFallback && db) {
    return new Promise((resolve) => {
      db.all(`SELECT * FROM leads ORDER BY id DESC LIMIT ?`, [limit], (err, rows) => {
        if (err) return resolve(memoryLeads.slice(0, limit));
        resolve(rows || []);
      });
    });
  }

  return memoryLeads.slice(0, limit);
}

/**
 * Delete a single lead by ID
 */
async function deleteLead(id) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
      method: 'DELETE',
      headers: supabaseHeaders()
    });
  } catch (err) {
    console.warn('⚠️ Supabase delete notice:', err.message);
  }

  if (!useFallback && db) {
    db.run(`DELETE FROM leads WHERE id = ?`, [id], () => {});
  }

  const prevLen = memoryLeads.length;
  memoryLeads = memoryLeads.filter(l => String(l.id) !== String(id));
  return { deleted: prevLen - memoryLeads.length || 1 };
}

/**
 * Delete all leads
 */
async function deleteAllLeads() {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=gt.0`, {
      method: 'DELETE',
      headers: supabaseHeaders()
    });
  } catch (err) {
    console.warn('⚠️ Supabase clear notice:', err.message);
  }

  if (!useFallback && db) {
    db.run(`DELETE FROM leads`, () => {});
  }

  const count = memoryLeads.length;
  memoryLeads = [];
  return { deleted: count };
}

module.exports = {
  db,
  insertLead,
  updateLeadEmailStatus,
  updateLeadSheetStatus,
  getAllLeads,
  deleteLead,
  deleteAllLeads,
  getSiteConfig,
  saveSiteConfig
};
