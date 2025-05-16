const environment = process.env.NODE_ENV || 'development';

// Get the base URL from the current window location
const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  
  // For production and preview deployments on Netlify
  if (window.location.hostname.includes('netlify.app')) {
    return window.location.origin;
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
    'Content-Type': 'application/json'
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