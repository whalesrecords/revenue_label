const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

const app = express();
const upload = multer();

// Enable CORS with proper options
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Helper function to parse CSV file
const parseCSVFile = (file, template) => {
  return new Promise((resolve, reject) => {
    const records = [];
    const parser = parse(file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        // Validate required columns exist
        if (record[template.track_column] && record[template.revenue_column] && record[template.date_column]) {
          records.push(record);
        }
      }
    });

    parser.on('error', (err) => {
      reject(err);
    });

    parser.on('end', () => {
      resolve({
        filename: file.originalname,
        records: records
      });
    });
  });
};

// Analyze endpoint
app.post('/', upload.array('files'), async (req, res) => {
  console.log('POST /analyze called');
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log('Files received:', req.files.map(f => f.originalname));
    console.log('Template:', req.body.template);

    const selectedTemplate = req.body.template;
    if (!selectedTemplate) {
      return res.status(400).json({ error: 'No template selected' });
    }

    const template = templates.find(t => t.name === selectedTemplate);
    if (!template) {
      return res.status(400).json({ error: `Template "${selectedTemplate}" not found` });
    }

    // Process each file
    const results = await Promise.all(
      req.files.map(file => parseCSVFile(file, template))
    );

    // Validate results
    const validResults = results.filter(result => result.records.length > 0);
    if (validResults.length === 0) {
      return res.status(400).json({ 
        error: 'No valid data found in uploaded files',
        details: results.map(r => ({
          filename: r.filename,
          recordCount: r.records.length
        }))
      });
    }

    res.json({
      success: true,
      results: validResults,
      template: template // Include template info in response
    });

  } catch (error) {
    console.error('Error processing files:', error);
    res.status(500).json({ 
      error: 'Failed to process files',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export the serverless function
exports.handler = serverless(app); 