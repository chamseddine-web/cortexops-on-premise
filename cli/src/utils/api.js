const fetch = require('node-fetch');
const { getConfig } = require('./config');

async function apiRequest(endpoint, options = {}) {
  const config = await getConfig();
  const baseUrl = config.api.base_url;
  const apiKey = config.api.api_key;

  const url = `${baseUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    ...options.headers,
  };

  const requestOptions = {
    ...options,
    headers,
    timeout: config.api.timeout,
  };

  let lastError;
  for (let attempt = 0; attempt < config.api.retries; attempt++) {
    try {
      const response = await fetch(url, requestOptions);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < config.api.retries - 1) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { apiRequest };
