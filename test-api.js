const http = require('http');

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: 3000, path }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    }).on('error', reject);
  });
}

async function runApiTests() {
  console.log('Testing Royal Home Painting Express API...');

  // Test 1: Submit a legitimate lead
  console.log('\n[API Test 1] Submitting a real customer quote request...');
  const res1 = await postJson('/api/leads', {
    name: 'Priya Narayanan',
    phone: '9845198765',
    area: 'Koramangala 4th Block',
    service: 'Both (Painting & Waterproofing)',
    notes: 'Terrace is leaking into top-floor bedrooms and exterior paint needs fresh coat.'
  });
  console.log('Response 1 Status:', res1.statusCode);
  console.log('Response 1 Body:', res1.body);

  if (res1.statusCode !== 201 || !res1.body.success) {
    throw new Error('Real lead submission failed!');
  }

  // Test 2: Validation test - missing phone number
  console.log('\n[API Test 2] Testing validation failure (missing phone)...');
  const res2 = await postJson('/api/leads', {
    name: 'Incomplete User',
    phone: ''
  });
  console.log('Response 2 Status:', res2.statusCode);
  console.log('Response 2 Body:', res2.body);
  if (res2.statusCode !== 400 || res2.body.success !== false) {
    throw new Error('Validation failed to catch empty phone!');
  }

  // Test 3: Honeypot trap
  console.log('\n[API Test 3] Testing anti-spam honeypot...');
  const res3 = await postJson('/api/leads', {
    name: 'Spam Bot',
    phone: '9999999999',
    website_url_hp: 'http://spam-link.ru'
  });
  console.log('Response 3 Status:', res3.statusCode);
  console.log('Response 3 Body:', res3.body);

  // Test 4: Query leads endpoint
  console.log('\n[API Test 4] Checking /api/leads listing...');
  const res4 = await getJson('/api/leads');
  console.log('Response 4 Status:', res4.statusCode);
  console.log(`Found ${res4.body.count} leads in database.`);
  console.log('Top lead:', res4.body.leads[0]);

  console.log('\n✨ ALL API TESTS PASSED!\n');
}

runApiTests();
