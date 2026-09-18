const http = require('http');
const { appendLeadToGoogleSheet } = require('./services/googleSheetService');
const { insertLead, updateLeadSheetStatus, getAllLeads } = require('./db/database');

async function testGoogleSheetIntegration() {
  console.log('🧪 Starting Google Sheets Service Integration Tests...\n');

  // Test 1: Verify fallback when webhook is unconfigured
  console.log('Test 1: Testing fallback handling when webhook is not set...');
  const testLead1 = {
    id: 991,
    name: 'Kavitha Swaminathan',
    phone: '+91 97403 18779',
    area: 'HSR Layout Sector 1',
    service: 'House Painting',
    notes: 'Testing Google Sheet fallback'
  };

  const fallbackResult = await appendLeadToGoogleSheet(testLead1);
  console.log('Fallback Result:', fallbackResult);
  if (!fallbackResult.success || !fallbackResult.simulated) {
    throw new Error('Fallback test failed!');
  }
  console.log('✅ Fallback test passed.\n');

  // Test 2: Spin up a mock Google Apps Script Webhook receiver
  console.log('Test 2: Testing live Webhook dispatch to mock Google Apps Script endpoint...');
  let receivedPayload = null;

  const mockServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      receivedPayload = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'Row added', rowId: 5 }));
    });
  });

  await new Promise(resolve => mockServer.listen(4567, resolve));
  console.log('✅ Mock Google Sheets Webhook listening on http://localhost:4567');

  // Temporarily set webhook URL to mock server
  process.env.GOOGLE_SHEET_WEBHOOK_URL = 'http://localhost:4567';

  // Save a real lead to database
  const inserted = await insertLead({
    name: 'Rajesh Gopinath',
    phone: '+91 99887 76655',
    area: 'Whitefield Prestige Palms',
    service: 'Terrace Waterproofing',
    notes: 'Monsoon terrace leakage check needed urgently'
  });
  console.log(`✅ Saved Lead #${inserted.id} in SQLite.`);

  // Sync to mock Google Sheet webhook
  const liveResult = await appendLeadToGoogleSheet(inserted);
  console.log('Sync Result:', liveResult);

  if (!liveResult.success || liveResult.simulated) {
    throw new Error('Live webhook dispatch test failed!');
  }

  // Update status in SQLite
  await updateLeadSheetStatus(inserted.id, 'synced');
  console.log('✅ Updated sheet_status in SQLite to "synced".');

  // Verify received payload
  console.log('Received Payload in Mock Google Sheet:', receivedPayload);
  if (receivedPayload.name !== 'Rajesh Gopinath' || receivedPayload.area !== 'Whitefield Prestige Palms') {
    throw new Error('Payload verification failed!');
  }
  console.log('✅ Google Sheet payload structure verified.');

  // Clean up mock server
  await new Promise(resolve => mockServer.close(resolve));
  console.log('✅ Mock server closed.');

  console.log('\n🎉 ALL GOOGLE SHEETS INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

testGoogleSheetIntegration().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
