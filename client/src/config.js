const environment = process.env.NODE_ENV || 'development';

const config = {
  API_URL: 'https://app-label-wr.netlify.app/.netlify/functions/server',
  TEMPLATE_ENDPOINTS: {
    get: '/templates',
    create: '/template',
    update: '/template',
    delete: '/template'
  },
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  environment
};

// Log configuration in development mode
if (environment === 'development') {
  console.log('API Configuration:', config);
} else {
  console.info('API Configuration:', config);
}

export default config; 