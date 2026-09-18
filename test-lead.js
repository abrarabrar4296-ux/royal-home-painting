const { insertLead, getAllLeads } = require('./db/database');
const { generateLeadExcel } = require('./services/excelService');
const { sendLeadEmail } = require('./services/emailService');
const fs = require('fs');
const path = require('path');

async function runVerificationTests() {
  console.log('🚀 Starting Royal Home Painting Backend Verification Tests...\n');

  try {
    // 1. Test SQLite persistence
    console.log('Test 1: Testing SQLite Lead Insertion...');
    const testLeadData = {
      name: 'Anand Sharma',
      phone: '+91 98450 12345',
      area: 'Indiranagar 100ft Road',
      service: 'House Painting',
      notes: 'Need full 3BHK interior repainting and water seepage check in kitchen.'
    };

    const inserted = await insertLead(testLeadData);
    console.log(`✅ SQLite Lead Saved Successfully: ID #${inserted.id}, Name: ${inserted.name}`);

    // 2. Test Excel Generation
    console.log('\nTest 2: Testing Excel (.xlsx) Generation...');
    const excelResult = await generateLeadExcel(inserted);
    console.log(`✅ Excel Generated at: ${excelResult.filepath}`);
    console.log(`   Filename: ${excelResult.filename}`);
    console.log(`   File size: ${excelResult.buffer.length} bytes`);

    if (!fs.existsSync(excelResult.filepath) || excelResult.buffer.length < 1000) {
      throw new Error('Excel file generation verification failed!');
    }
    console.log('✅ Excel File verified on disk.');

    // 3. Test Email Dispatcher
    console.log('\nTest 3: Testing Nodemailer Dispatch Handler...');
    const emailResult = await sendLeadEmail(inserted, excelResult);
    console.log('✅ Email Service Result:', emailResult);

    // 4. Test Lead Retrieval
    console.log('\nTest 4: Testing Lead Retrieval from Database...');
    const leads = await getAllLeads(5);
    console.log(`✅ Total Leads Retrieved: ${leads.length}`);
    console.log(`   Latest Lead ID: #${leads[0].id}, Name: ${leads[0].name}`);

    console.log('\n🎉 ALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification test failed:', err);
    process.exit(1);
  }
}

runVerificationTests();
