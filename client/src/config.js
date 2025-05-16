const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8888/.netlify/functions'
    : '/.netlify/functions';
};

const config = {
  API_URL: getApiUrl(),
  TEMPLATE_ENDPOINTS: {
    list: '/server/templates',
    readHeaders: '/server/read-headers'
  },
  ANALYZE_ENDPOINT: '/server/analyze',
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Validation de la configuration
if (!config.API_URL) {
  console.error('API_URL is not configured properly');
}

// Log configuration in development
console.log('API Configuration:', {
  ...config,
  fullTemplateUrl: `${config.API_URL}${config.TEMPLATE_ENDPOINTS.list}`,
  fullAnalyzeUrl: `${config.API_URL}${config.ANALYZE_ENDPOINT}`,
  environment: process.env.NODE_ENV || 'production'
});

export default config; 