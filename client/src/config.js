const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8888/.netlify/functions'
    : '/.netlify/functions';
};

const config = {
  API_URL: getApiUrl(),
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

// Log configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('API Configuration:', {
    ...config,
    fullTemplateUrl: `${config.API_URL}${config.TEMPLATE_ENDPOINTS.list}`,
    environment: process.env.NODE_ENV
  });
}

export default config; 