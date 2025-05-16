const environment = process.env.NODE_ENV || 'development';

// Get the base URL from the current window location
const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  
  // For production on app-label-wr.netlify.app
  if (window.location.hostname === 'app-label-wr.netlify.app') {
    return 'https://app-label-wr.netlify.app';
  }
  
  // For local development
  return 'http://localhost:8888';
};

const config = {
  API_URL: getBaseUrl(),
  ANALYZE_ENDPOINT: '/.netlify/functions/server',
  TEMPLATE_ENDPOINTS: {
    get: '/.netlify/functions/templates',
    create: '/.netlify/functions/templates',
    update: '/.netlify/functions/templates',
    delete: '/.netlify/functions/templates'
  },
  DEFAULT_HEADERS: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
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