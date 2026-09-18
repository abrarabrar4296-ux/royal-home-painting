const serverless = require('serverless-http');
const app = require('../../server');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Normalize path if Netlify function redirect stripped /api
  if (event.path && !event.path.startsWith('/api') && !event.path.startsWith('/.netlify')) {
    event.path = '/api' + (event.path.startsWith('/') ? event.path : '/' + event.path);
  }
  return await handler(event, context);
};
