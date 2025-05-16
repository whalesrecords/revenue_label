const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const app = express();

// Enable CORS with proper options
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Predefined templates
const templates = [
  {
    name: "Tunecore",
    track_column: "Song Title",
    artist_column: "Artist",
    upc_column: "UPC",
    revenue_column: "Total Earned",
    date_column: "Sales Period",
    source: "Tunecore",
    currency: "EUR"
  },
  {
    name: "BELIEVE UK",
    track_column: "Track title",
    upc_column: "UPC",
    revenue_column: "Net Income",
    date_column: "Reporting Date",
    source: "BELIEVE UK",
    currency: "EUR"
  },
  {
    name: "BELIEVE",
    track_column: "Track title",
    upc_column: "UPC",
    revenue_column: "Net Income",
    date_column: "Operation Date",
    source: "BELIEVE",
    currency: "EUR"
  },
  {
    name: "DashGo",
    track_column: "Track Title",
    artist_column: "Artist Name",
    upc_column: "UPC",
    revenue_column: "Payable",
    date_column: "Transaction Date",
    source: "DashGo",
    currency: "USD"
  }
];

// Create router for templates
const router = express.Router();

// GET templates
router.get('/', async (req, res) => {
  console.log('GET /templates called');
  try {
    res.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// POST new template
router.post('/', async (req, res) => {
  console.log('POST /templates called with body:', req.body);
  try {
    const newTemplate = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'track_column', 'revenue_column', 'date_column'];
    const missingFields = requiredFields.filter(field => !newTemplate[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if template with same name exists
    if (templates.find(t => t.name === newTemplate.name)) {
      return res.status(409).json({
        error: `Template with name "${newTemplate.name}" already exists`
      });
    }

    templates.push(newTemplate);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Mount router at the root path
app.use('/.netlify/functions/templates', router);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export the serverless function
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      console.log('GET /templates called');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(templates)
      };
    }

    if (event.httpMethod === 'POST') {
      console.log('POST /templates called');
      let newTemplate;
      
      try {
        newTemplate = JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON payload' })
        };
      }

      // Validate required fields
      const requiredFields = ['name', 'track_column', 'revenue_column', 'date_column'];
      const missingFields = requiredFields.filter(field => !newTemplate[field]);
      
      if (missingFields.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Missing required fields: ${missingFields.join(', ')}`
          })
        };
      }

      // Check if template with same name exists
      if (templates.find(t => t.name === newTemplate.name)) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: `Template with name "${newTemplate.name}" already exists`
          })
        };
      }

      templates.push(newTemplate);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newTemplate)
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Error in templates function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 