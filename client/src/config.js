const environment = process.env.NODE_ENV || 'development';

// Get the base URL from the current window location
const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  
  const hostname = window.location.hostname;
  if (hostname.includes('netlify.app')) {
    // For preview deployments and production
    return `https://${hostname}`;
  }
  
  // For local development
  return 'http://localhost:8888';
};

const config = {
  API_URL: '/.netlify/functions',
  TEMPLATE_ENDPOINTS: {
    get: '/templates',
    create: '/templates',
    update: '/templates',
    delete: '/templates'
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