const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const RECIPIENT_EMAIL = process.env.NOTIFICATION_EMAIL || 'royalhomepainting11@gmail.com';

/**
 * Creates nodemailer transport using environment variables
 */
function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || pass === 'your_gmail_app_password_here') {
    return null; // SMTP unconfigured
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for other ports
    auth: {
      user,
      pass
    }
  });
}

/**
 * Sends an email notification with lead details and the generated .xlsx attachment
 * @param {Object} lead - { id, name, phone, area, service, notes, created_at }
 * @param {Object} excelData - { buffer, filename, filepath }
 * @returns {Promise<{ success: boolean, messageId?: string, simulated?: boolean }>}
 */
async function sendLeadEmail(lead, excelData) {
  const transporter = createTransporter();

  // Pre-calculate clean WhatsApp link for internal contractor quick reply
  const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappReplyUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
    `Hi ${lead.name}, thank you for reaching out to Royal Home Painting regarding your ${lead.service} inquiry in ${lead.area || 'Bangalore'}. When is a good time for our specialist to visit for your free inspection?`
  )}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #EFE9E1; margin: 0; padding: 24px; color: #111111; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2dbd0; }
        .header { background-color: #000000; padding: 28px 24px; text-align: center; border-bottom: 4px solid #F0620D; }
        .logo-title { color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: 1px; margin: 0; }
        .tagline { color: #F0620D; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px; }
        .badge { display: inline-block; background: #F0620D; color: #ffffff; font-weight: bold; font-size: 11px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-top: 14px; }
        .content { padding: 28px 24px; }
        .lead-headline { font-size: 18px; font-weight: 700; color: #14495F; margin: 0 0 16px 0; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .details-table td { padding: 12px 14px; border-bottom: 1px solid #f0eae1; font-size: 14px; }
        .label { font-weight: 600; color: #555555; width: 38%; }
        .value { font-weight: 600; color: #111111; }
        .phone-highlight { color: #C44A05; font-size: 16px; font-weight: 800; text-decoration: none; }
        .btn-group { display: flex; gap: 12px; margin-top: 20px; }
        .btn { display: inline-block; padding: 12px 20px; border-radius: 6px; font-weight: 700; font-size: 14px; text-decoration: none; text-align: center; }
        .btn-call { background-color: #F0620D; color: #ffffff !important; }
        .btn-whatsapp { background-color: #25D366; color: #ffffff !important; }
        .notes-box { background: #fdf8f4; border-left: 4px solid #F0620D; padding: 12px 16px; margin: 18px 0; border-radius: 4px; font-style: italic; color: #333; }
        .footer { background: #F5F1EC; padding: 18px 24px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #e5dfd6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo-title">ROYAL HOME PAINTING</h1>
          <div class="tagline">Simple, Seamless, Satisfaction &bull; Bangalore</div>
          <div class="badge">🔥 New Quote Request</div>
        </div>
        <div class="content">
          <h2 class="lead-headline">New Customer Lead #${lead.id || 'N/A'}</h2>
          <table class="details-table">
            <tr>
              <td class="label">Customer Name</td>
              <td class="value">${lead.name}</td>
            </tr>
            <tr>
              <td class="label">Phone Number</td>
              <td class="value">
                <a href="tel:${lead.phone}" class="phone-highlight">${lead.phone}</a>
              </td>
            </tr>
            <tr>
              <td class="label">Bangalore Area</td>
              <td class="value">${lead.area || 'Bangalore (General)'}</td>
            </tr>
            <tr>
              <td class="label">Service Required</td>
              <td class="value"><strong>${lead.service || 'House Painting'}</strong></td>
            </tr>
            <tr>
              <td class="label">Received At</td>
              <td class="value">${lead.created_at || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            </tr>
          </table>

          ${lead.notes ? `
            <div style="font-size: 13px; font-weight: 700; color: #555;">Customer Requirements / Notes:</div>
            <div class="notes-box">"${lead.notes}"</div>
          ` : ''}

          <div style="margin-top: 24px;">
            <a href="tel:${lead.phone}" class="btn btn-call" style="margin-right: 8px;">📞 Call Customer</a>
            <a href="${whatsappReplyUrl}" class="btn btn-whatsapp" target="_blank">💬 WhatsApp Customer</a>
          </div>

          <p style="font-size: 12px; color: #666; margin-top: 24px;">
            📎 An official <strong>${excelData.filename}</strong> has been generated and attached to this email.
          </p>
        </div>
        <div class="footer">
          Royal Home Painting Lead Engine &bull; Founded 2018 &bull; +91 97403 18779
        </div>
      </div>
    </body>
    </html>
  `;

  if (!transporter) {
    console.log('\n======================================================');
    console.log('⚠️ [SMTP CONFIGURATION NOTICE]');
    console.log('SMTP credentials (SMTP_USER & SMTP_PASS) are not yet configured in .env.');
    console.log(`Email would be sent to: ${RECIPIENT_EMAIL}`);
    console.log(`Lead Name: ${lead.name}, Phone: ${lead.phone}, Service: ${lead.service}`);
    console.log(`Excel attachment prepared at: ${excelData.filepath}`);
    console.log('======================================================\n');
    return {
      success: true,
      simulated: true,
      message: 'SMTP credentials not configured; lead captured and Excel generated locally.'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Royal Home Painting" <${process.env.SMTP_USER}>`,
      to: RECIPIENT_EMAIL,
      subject: `[NEW LEAD] ${lead.name} - ${lead.service} (${lead.area || 'Bangalore'})`,
      html: htmlContent,
      attachments: [
        {
          filename: excelData.filename,
          content: excelData.buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ]
    });

    console.log(`✅ Lead notification email successfully delivered to ${RECIPIENT_EMAIL}. Message ID: ${info.messageId}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (err) {
    console.error('❌ Failed to dispatch email via Nodemailer:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  sendLeadEmail
};
