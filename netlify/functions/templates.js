const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// Predefined templates
let templates = [
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
  }
];

// GET templates
app.get('/', async (req, res) => {
  console.log('GET /templates called');
  try {
    res.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// POST new template
app.post('/', async (req, res) => {
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export the serverless function
exports.handler = serverless(app); 