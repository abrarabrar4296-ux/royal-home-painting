require('dotenv').config();

/**
 * Service to sync incoming leads directly into Google Sheets.
 * Supports Google Apps Script Webhook (recommended for royalhomepainting11@gmail.com)
 */

const GOOGLE_SHEET_WEBHOOK_URL = process.env.GOOGLE_SHEET_WEBHOOK_URL;

/**
 * Appends a new lead to the Google Sheet
 * @param {Object} lead - { id, name, phone, area, service, notes, created_at }
 * @returns {Promise<{ success: boolean, message: string, simulated?: boolean }>}
 */
async function appendLeadToGoogleSheet(lead) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

  // Check if Webhook URL is configured
  if (!webhookUrl || webhookUrl === 'your_google_apps_script_web_app_url_here') {
    console.log('\n======================================================');
    console.log('📋 [GOOGLE SHEETS NOTICE]');
    console.log('GOOGLE_SHEET_WEBHOOK_URL is not yet set in .env.');
    console.log(`Lead #${lead.id} (${lead.name}) was recorded in SQLite database.`);
    console.log('To sync automatically to Google Sheets under royalhomepainting11@gmail.com,');
    console.log('follow the simple 1-minute setup in google-apps-script.js.');
    console.log('======================================================\n');

    return {
      success: true,
      simulated: true,
      message: 'Google Sheets webhook unconfigured; lead safely saved in SQLite database.'
    };
  }

  const payload = {
    id: lead.id,
    timestamp: lead.created_at || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    name: lead.name,
    phone: lead.phone,
    area: lead.area || 'Bangalore',
    service: lead.service || 'House Painting',
    notes: lead.notes || '',
    source: 'Website Lead Form'
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Google Sheets HTTP response status: ${response.status} ${response.statusText}`);
    }

    const resText = await response.text();
    let resJson;
    try {
      resJson = JSON.parse(resText);
    } catch {
      resJson = { raw: resText };
    }

    console.log(`✅ [GOOGLE SHEETS SYNC SUCCESS] Lead #${lead.id} (${lead.name}) synced to Google Sheet!`);
    return {
      success: true,
      simulated: false,
      data: resJson
    };
  } catch (err) {
    console.error(`❌ Failed to sync lead #${lead.id} to Google Sheet:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  appendLeadToGoogleSheet
};
