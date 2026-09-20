const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { insertLead, updateLeadEmailStatus, updateLeadSheetStatus, getAllLeads, deleteLead, deleteAllLeads } = require('./db/database');
const { generateLeadExcel, generateAllLeadsExcel } = require('./services/excelService');
const { sendLeadEmail } = require('./services/emailService');
const { appendLeadToGoogleSheet } = require('./services/googleSheetService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Also serve generated exports if needed for download
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// Rate Limiting for Lead Submissions (Spam protection)
const leadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per IP in window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this network. Please wait a few minutes or call/WhatsApp us directly at +91 97403 18779.'
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Royal Home Painting Lead Engine',
    timestamp: new Date().toISOString()
  });
});

// Real-Time Server-Sent Events (SSE) notification hub
const sseClients = new Set();

function broadcastNewLead(lead) {
  if (sseClients.size === 0) return;
  const payload = `data: ${JSON.stringify({ type: 'NEW_LEAD', lead })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

/**
 * Lead Capture API Endpoint
 * POST /api/leads
 */
app.post('/api/leads', leadRateLimiter, async (req, res) => {
  try {
    const { name, phone, area, service, notes, website_url_hp } = req.body;

    // 1. Honeypot check: If the hidden honeypot field is filled by a bot, simulate success without processing
    if (website_url_hp && website_url_hp.trim() !== '') {
      console.warn('🤖 Spam bot trapped by honeypot field:', { ip: req.ip, honeypotValue: website_url_hp });
      return res.status(200).json({
        success: true,
        message: 'Thank you. We have received your details.'
      });
    }

    // 2. Server-side validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your full name (at least 2 characters).'
      });
    }

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid phone number.'
      });
    }

    // Clean phone number (strip whitespace, dashes, parens)
    const cleanedPhone = phone.replace(/[^0-9+]/g, '');
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 13) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid 10-digit mobile number.'
      });
    }

    // Sanitize valid service
    const validServices = [
      'House Painting',
      'Terrace Waterproofing',
      'Both (Painting & Waterproofing)',
      'Not sure / Need Inspection'
    ];
    const selectedService = validServices.includes(service) ? service : 'House Painting';

    const leadRecord = {
      name: name.trim(),
      phone: cleanedPhone,
      area: area ? area.trim() : 'Bangalore',
      service: selectedService,
      notes: notes ? notes.trim() : ''
    };

    console.log(`\n📥 [NEW LEAD RECEIVED] ${leadRecord.name} (${leadRecord.phone}) - ${leadRecord.service}`);

    // 3. Persist lead in SQLite database (so leads are never lost)
    const savedLead = await insertLead(leadRecord);
    console.log(`💾 Lead persisted in SQLite with ID: #${savedLead.id}`);

    // Broadcast instant real-time notification to open dashboard apps
    try {
      broadcastNewLead(savedLead);
    } catch (sseErr) {
      console.warn('⚠️ SSE broadcast notice:', sseErr.message);
    }

    // 4. Generate professional .xlsx spreadsheet (resilient)
    let excelResult = { filename: '', buffer: null };
    try {
      excelResult = await generateLeadExcel(savedLead);
      console.log(`📊 Branded Excel spreadsheet created: ${excelResult.filename}`);
    } catch (excelErr) {
      console.error('⚠️ Excel generation notice (non-fatal):', excelErr.message);
    }

    // 5. Send email with .xlsx attachment via Nodemailer (resilient)
    let emailResult = { success: false };
    try {
      emailResult = await sendLeadEmail(savedLead, excelResult);
      const emailFinalStatus = emailResult.success
        ? (emailResult.simulated ? 'logged_no_smtp' : 'sent')
        : 'failed';
      await updateLeadEmailStatus(savedLead.id, emailFinalStatus, excelResult.filename || '');
    } catch (emailErr) {
      console.error('⚠️ Email notification notice (non-fatal):', emailErr.message);
    }

    // 6. Sync lead to Google Sheet (resilient)
    let sheetResult = { success: false };
    try {
      sheetResult = await appendLeadToGoogleSheet(savedLead);
      const sheetFinalStatus = sheetResult.success
        ? (sheetResult.simulated ? 'logged_no_webhook' : 'synced')
        : 'failed';
      await updateLeadSheetStatus(savedLead.id, sheetFinalStatus);
    } catch (sheetErr) {
      console.error('⚠️ Google Sheets sync notice (non-fatal):', sheetErr.message);
    }

    // 7. Pre-calculate WhatsApp quick link for the user
    const prefilledText = encodeURIComponent(
      `Hi Royal Home Painting! I just submitted a quote request for ${savedLead.service} in ${savedLead.area || 'Bangalore'}. My name is ${savedLead.name}.`
    );
    const whatsappUrl = `https://api.whatsapp.com/send?phone=919740318779&text=${prefilledText}`;

    // 8. Return success response
    return res.status(201).json({
      success: true,
      message: 'Thanks — we’ll call you within 24 hours to schedule your free on-site inspection.',
      leadId: savedLead.id,
      whatsappUrl,
      excelGenerated: !!excelResult.buffer,
      emailDispatched: emailResult.success,
      sheetSynced: sheetResult.success
    });

  } catch (error) {
    console.error('❌ Error processing lead submission:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while saving your request. Please call or WhatsApp us at +91 97403 18779.'
    });
  }
});

// Real-time SSE endpoint for instant lead notification to dashboard clients
app.get('/api/leads/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();

  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clients: sseClients.size, timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Admin endpoint to view recent leads (for verification & operational ease)
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await getAllLeads(100);
    res.json({
      success: true,
      count: leads.length,
      leads
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a specific lead
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteLead(id);
    if (result.deleted === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, message: `Lead #${id} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clear all leads (wiping test data)
app.post('/api/leads/clear-all', async (req, res) => {
  try {
    const result = await deleteAllLeads();
    res.json({ success: true, message: `All leads cleared (${result.deleted} removed)` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Live CSV endpoint for Google Sheets =IMPORTDATA("http://.../api/leads.csv")
app.get('/api/leads.csv', async (req, res) => {
  try {
    const leads = await getAllLeads(500);
    const headers = ['Lead ID', 'Date & Time', 'Customer Name', 'Phone Number', 'Bangalore Area', 'Service Required', 'Customer Notes', 'Status'];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const lines = [headers.map(escapeCsv).join(',')];
    leads.forEach(l => {
      lines.push([
        escapeCsv(`#RHP-${String(l.id).padStart(4, '0')}`),
        escapeCsv(l.created_at),
        escapeCsv(l.name),
        escapeCsv(l.phone),
        escapeCsv(l.area || 'Bangalore'),
        escapeCsv(l.service || 'House Painting'),
        escapeCsv(l.notes || ''),
        escapeCsv('New Lead')
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Royal_Home_Painting_Leads.csv"');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allows Google Sheets =IMPORTDATA across domains
    res.send(lines.join('\r\n'));
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).send('Error generating leads CSV');
  }
});

// Master Excel workbook export for all leads
app.get('/api/leads/export-excel', async (req, res) => {
  try {
    const leads = await getAllLeads(500);
    const buffer = await generateAllLeadsExcel(leads);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Royal_Home_Painting_Leads_All.xlsx"');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting all leads to Excel:', error);
    res.status(500).send('Error generating master Excel export');
  }
});

// Live Web Spreadsheet Dashboard (built-in Google Sheets equivalent)
app.get(['/leads', '/dashboard', '/admin'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leads.html'));
});

// Fallback route for SPA / clean URLs
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server only if executed directly (not when required as a module/Netlify function)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🎨 Royal Home Painting Server running on http://localhost:${PORT}`);
    console.log(`📍 City: Bangalore, India | Tel: +91 97403 18779`);
    console.log(`🛡️  Honeypot anti-spam & rate limiter active on /api/leads`);
    console.log('====================================================\n');
  });
}

module.exports = app;
