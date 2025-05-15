const getApiUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return process.env.REACT_APP_API_URL || 'http://localhost:8888/.netlify/functions/server';
  }
  return '/.netlify/functions/server';
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
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
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
    environment: process.env.NODE_ENV,
    apiUrl: process.env.REACT_APP_API_URL
  });
}

export default config; 