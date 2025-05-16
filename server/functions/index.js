const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const app = express();
const router = express.Router();

// Enable CORS
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Parse JSON bodies
app.use(express.json());

// Use router
app.use('/.netlify/functions/server', router);
app.use('/', router);

// Predefined templates
const predefinedTemplates = {
  "Tunecore": {
    "track_column": "Song Title",
    "artist_column": "Artist",
    "upc_column": "UPC",
    "revenue_column": "Total Earned",
    "date_column": "Sales Period",
    "source": "Tunecore",
    "currency": "EUR"
  },
  "BELIEVE UK": {
    "track_column": "Track title",
    "upc_column": "UPC",
    "revenue_column": "Net Income",
    "date_column": "Reporting Date",
    "source": "BELIEVE UK",
    "currency": "EUR"
  },
  "BELIEVE": {
    "track_column": "Track title",
    "upc_column": "UPC",
    "revenue_column": "Net Income",
    "date_column": "Operation Date",
    "source": "BELIEVE",
    "currency": "EUR"
  }
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Get templates endpoint
app.get('/templates', (req, res) => {
  try {
    console.log('GET /templates called');
    console.log('Request path:', req.path);
    console.log('Request URL:', req.url);
    
    const templateArray = Object.entries(predefinedTemplates).map(([name, template]) => ({
      name,
      ...template
    }));
    res.json(templateArray);
  } catch (error) {
    console.error('Error in /templates:', error);
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message
    });
  }
});

// Create handler
const handler = serverless(app);

// Export the handler
exports.handler = async (event, context) => {
  // Log incoming request
  console.log('Incoming request:', {
    path: event.path,
    method: event.httpMethod,
    headers: event.headers,
    rawPath: event.rawPath,
    rawQuery: event.rawQueryString
  });

  try {
    // Handle the request
    const result = await handler(event, context);
    
    // Log response
    console.log('Response:', {
      statusCode: result.statusCode,
      headers: result.headers,
      body: result.body
    });

    return {
      ...result,
      headers: {
        ...result.headers,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      }
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
}; 