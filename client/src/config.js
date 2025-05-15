const config = {
  API_URL: process.env.REACT_APP_API_URL || '/api',
  TEMPLATE_ENDPOINTS: {
    create: '/templates',
    list: '/templates',
    readHeaders: '/read-headers'
  },
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Validation de la configuration
if (!config.API_URL) {
  console.error('API_URL is not configured properly');
}

console.log('API Configuration:', config);

export default config; 