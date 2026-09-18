const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const exportsDir = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? path.join('/tmp', 'exports')
  : path.join(__dirname, '..', 'exports');

try {
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }
} catch (e) {
  // Safe to ignore in read-only serverless filesystems
}

/**
 * Generates a professionally branded .xlsx workbook for a single lead
 * @param {Object} lead - { id, name, phone, area, service, notes, created_at }
 * @returns {Promise<{ buffer: Buffer, filename: string, filepath: string }>}
 */
async function generateLeadExcel(lead) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Royal Home Painting Lead Engine';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Lead Details', {
    properties: { tabColor: { argb: 'FFF0620D' } },
    views: [{ showGridLines: true }]
  });

  // Define columns
  worksheet.columns = [
    { width: 6 },   // Col A: Padding
    { width: 22 },  // Col B: Field Label
    { width: 45 }   // Col C: Field Value
  ];

  // Title Banner
  worksheet.mergeCells('B2:C2');
  const titleCell = worksheet.getCell('B2');
  titleCell.value = 'ROYAL HOME PAINTING — NEW LEAD';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0620D' } // Brand Orange
  };
  worksheet.getRow(2).height = 36;

  // Subtitle Banner
  worksheet.mergeCells('B3:C3');
  const subtitleCell = worksheet.getCell('B3');
  subtitleCell.value = 'Tagline: "Simple, Seamless, Satisfaction" | Bangalore, India';
  subtitleCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FFFFFFFF' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  subtitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF14495F' } // Slate Blue
  };
  worksheet.getRow(3).height = 20;

  // Blank spacer
  worksheet.getRow(4).height = 12;

  // Data rows
  const leadData = [
    { label: 'Lead ID', value: `#RHP-${String(lead.id || 'NEW').padStart(4, '0')}` },
    { label: 'Received At', value: lead.created_at || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
    { label: 'Customer Name', value: lead.name },
    { label: 'Phone Number', value: lead.phone },
    { label: 'Bangalore Locality', value: lead.area || 'Not Specified' },
    { label: 'Service Requested', value: lead.service || 'House Painting' },
    { label: 'Customer Notes', value: lead.notes || 'None provided' },
    { label: 'Inspection Status', value: 'Pending callback within 24 hours' }
  ];

  let currentRowIndex = 5;
  leadData.forEach((rowItem, idx) => {
    const row = worksheet.getRow(currentRowIndex);
    row.height = rowItem.label === 'Customer Notes' ? 40 : 26;

    const labelCell = worksheet.getCell(`B${currentRowIndex}`);
    labelCell.value = rowItem.label;
    labelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF222222' } };
    labelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx % 2 === 0 ? 'FFF5F1EC' : 'FFFFFFFF' }
    };
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    labelCell.border = {
      top: { style: 'thin', color: { argb: 'FFE0D7CC' } },
      bottom: { style: 'thin', color: { argb: 'FFE0D7CC' } },
      left: { style: 'thin', color: { argb: 'FFE0D7CC' } },
      right: { style: 'thin', color: { argb: 'FFE0D7CC' } }
    };

    const valueCell = worksheet.getCell(`C${currentRowIndex}`);
    valueCell.value = rowItem.value;
    valueCell.font = {
      name: 'Arial',
      size: 10,
      bold: rowItem.label === 'Customer Name' || rowItem.label === 'Phone Number',
      color: rowItem.label === 'Phone Number' ? { argb: 'FFC44A05' } : { argb: 'FF111111' }
    };
    valueCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx % 2 === 0 ? 'FFF5F1EC' : 'FFFFFFFF' }
    };
    valueCell.alignment = {
      vertical: 'middle',
      horizontal: 'left',
      wrapText: rowItem.label === 'Customer Notes'
    };
    valueCell.border = {
      top: { style: 'thin', color: { argb: 'FFE0D7CC' } },
      bottom: { style: 'thin', color: { argb: 'FFE0D7CC' } },
      left: { style: 'thin', color: { argb: 'FFE0D7CC' } },
      right: { style: 'thin', color: { argb: 'FFE0D7CC' } }
    };

    currentRowIndex++;
  });

  // Footer note
  worksheet.mergeCells(`B${currentRowIndex + 1}:C${currentRowIndex + 1}`);
  const footerCell = worksheet.getCell(`B${currentRowIndex + 1}`);
  footerCell.value = 'Contact Customer: Phone / WhatsApp: +91 97403 18779 | Email: royalhomepainting11@gmail.com';
  footerCell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF666666' } };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(currentRowIndex + 1).height = 22;

  // Clean filename
  const cleanName = (lead.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Lead_${lead.id || 'new'}_${cleanName}_${timestamp}.xlsx`;
  const filepath = path.join(exportsDir, filename);

  const buffer = await workbook.xlsx.writeBuffer();
  try {
    if (!process.env.NETLIFY && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      fs.writeFileSync(filepath, buffer);
    }
  } catch (err) {
    console.warn('Skipped writing local excel file (serverless mode):', err.message);
  }

  return {
    buffer,
    filename,
    filepath
  };
}

/**
 * Generates an Excel workbook containing all leads
 * @param {Array} leads
 * @returns {Promise<Buffer>}
 */
async function generateAllLeadsExcel(leads) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Royal Home Painting Lead Engine';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('All Leads', {
    properties: { tabColor: { argb: 'FFF0620D' } },
    views: [{ showGridLines: true }]
  });

  worksheet.columns = [
    { header: 'Lead ID', key: 'id', width: 14 },
    { header: 'Date & Time', key: 'timestamp', width: 22 },
    { header: 'Customer Name', key: 'name', width: 25 },
    { header: 'Phone Number', key: 'phone', width: 18 },
    { header: 'Bangalore Area', key: 'area', width: 24 },
    { header: 'Service Requested', key: 'service', width: 28 },
    { header: 'Customer Notes', key: 'notes', width: 45 },
    { header: 'Lead Status', key: 'status', width: 22 }
  ];

  // Header row formatting
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0620D' } // Brand Orange
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Data rows
  leads.forEach((lead, idx) => {
    const row = worksheet.addRow({
      id: `#RHP-${String(lead.id).padStart(4, '0')}`,
      timestamp: lead.created_at,
      name: lead.name,
      phone: lead.phone,
      area: lead.area || 'Bangalore',
      service: lead.service,
      notes: lead.notes || 'None',
      status: 'New Lead'
    });
    row.height = 26;
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: colNum === 1 || colNum === 4 ? 'center' : 'left' };
      if (idx % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F6F2' }
        };
      }
    });
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  generateLeadExcel,
  generateAllLeadsExcel
};
