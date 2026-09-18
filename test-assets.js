const http = require('http');

const urls = [
  '/',
  '/css/style.css',
  '/js/main.js',
  '/js/lead-form.js',
  '/assets/logo.png',
  '/assets/gallery/project-1-villa-entrance.jpg',
  '/assets/gallery/project-2-two-story-residence.jpg',
  '/assets/gallery/project-3-exterior-sky-blue.jpg',
  '/assets/gallery/project-4-split-level-modern.jpg',
  '/assets/gallery/terrace-waterproofing.jpg',
  '/assets/gallery/interior-painting.jpg',
  '/api/health'
];

async function checkUrl(urlPath) {
  return new Promise((resolve) => {
    http.get({ hostname: 'localhost', port: 3000, path: urlPath }, (res) => {
      let dataLength = 0;
      res.on('data', chunk => { dataLength += chunk.length; });
      res.on('end', () => {
        resolve({
          path: urlPath,
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          length: dataLength,
          ok: res.statusCode === 200
        });
      });
    }).on('error', (err) => {
      resolve({ path: urlPath, ok: false, error: err.message });
    });
  });
}

async function verifyAllAssets() {
  console.log('🔍 Checking all updated frontend assets and endpoints on localhost:3000...\n');
  let allPass = true;

  for (const url of urls) {
    const result = await checkUrl(url);
    if (result.ok) {
      console.log(`✅ [${result.statusCode}] ${result.path} (${result.contentType}, ${result.length} bytes)`);
    } else {
      console.error(`❌ [FAILED] ${result.path}`, result);
      allPass = false;
    }
  }

  if (allPass) {
    console.log('\n🎉 ALL UPDATED ASSETS AND ENDPOINTS RETURNED HTTP 200 OK!\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME ASSETS FAILED TO LOAD.\n');
    process.exit(1);
  }
}

verifyAllAssets();
