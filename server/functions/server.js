const express = require('express');
const serverless = require('serverless-http');
const multer = require('multer');
const cors = require('cors');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

const app = express();

// Configuration CORS plus permissive
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Base path for all routes
const router = express.Router();
app.use('/.netlify/functions/server', router);

// Middleware pour gérer les options CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With, Authorization');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Configuration multer pour le stockage en mémoire
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

app.use(express.json());

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
  },
  "Tunecore +": {
    "track_column": "Song Title",
    "artist_column": "Artist",
    "upc_column": "UPC",
    "revenue_column": "Total Earned",
    "date_column": "Posted Date",
    "source": "Tunecore",
    "currency": "EUR"
  },
  "TuneCore Real": {
    "track_column": "Song Title",
    "artist_column": "Artist",
    "upc_column": "UPC",
    "revenue_column": "Total Earned",
    "date_column": "Sales Period",
    "source": "Tunecore",
    "currency": "EUR"
  },
  "DashGo": {
    "track_column": "Track Title",
    "artist_column": "Artist Name",
    "upc_column": "UPC",
    "revenue_column": "Payable",
    "date_column": "Transaction Date",
    "currency": "USD",
    "source": "DashGo"
  },
  "DG": {
    "track_column": "Track Title",
    "artist_column": "Artist Name",
    "upc_column": "UPC",
    "revenue_column": "Payable",
    "date_column": "Transaction Date",
    "currency": "USD",
    "source": "DG"
  },
  "DD": {
    "track_column": "Track Title",
    "artist_column": "Artist Name",
    "upc_column": "UPC",
    "revenue_column": "Payable",
    "date_column": "Transaction Date",
    "currency": "USD",
    "source": "DD"
  }
};

// Initialize templates with predefined ones
let templates = { ...predefinedTemplates };
console.log('Templates initialized:', Object.keys(templates));

// Helper functions
const cleanRevenueValue = (value) => {
  if (value === null || value === undefined || value === '') return 0.0;
  try {
    if (typeof value === 'number') return parseFloat(value);
    let valueStr = String(value)
      .trim()
      .replace(/[€$]/g, '')
      .replace(/\s/g, '')
      .replace(/,/g, '.')
      .replace(/[^0-9.-]/g, '');
    if (value.includes('(') && value.includes(')')) valueStr = '-' + valueStr;
    const result = parseFloat(valueStr);
    return isNaN(result) ? 0.0 : result;
  } catch (error) {
    console.error('Error cleaning revenue value:', error);
    return 0.0;
  }
};

// Routes
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: 'success', message: 'API is working' });
});

router.get('/templates', (req, res) => {
  console.log('GET /templates called');
  console.log('Available templates:', Object.keys(templates));
  res.setHeader('Content-Type', 'application/json');
  res.json(Object.entries(templates).map(([name, template]) => ({
    name,
    ...template
  })));
});

router.post('/templates', express.json(), (req, res) => {
  try {
    const template = req.body;
    console.log('Received template:', template);
    const requiredFields = ['name', 'track_column', 'artist_column', 'upc_column', 'revenue_column', 'date_column', 'currency'];
    const missingFields = requiredFields.filter(field => !template[field]);
    
    if (missingFields.length > 0) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ 
        status: 'error',
        error: 'Invalid template format', 
        missingFields 
      });
    }

    templates[template.name] = {
      track_column: template.track_column,
      artist_column: template.artist_column,
      upc_column: template.upc_column,
      revenue_column: template.revenue_column,
      date_column: template.date_column,
      currency: template.currency,
      source: template.name
    };

    res.setHeader('Content-Type', 'application/json');
    res.json({ status: 'success', data: templates[template.name] });
  } catch (error) {
    console.error('Error saving template:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ status: 'error', error: 'Failed to save template' });
  }
});

router.post('/read-headers', upload.single('file'), (req, res) => {
  console.log('POST /read-headers called');
  if (!req.file) {
    console.log('No file uploaded');
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ status: 'error', error: 'No file uploaded' });
  }

  try {
    console.log('Processing file:', req.file.originalname);
    const fileContent = req.file.buffer.toString();
    parse(fileContent, {
      to: 1,
      skip_empty_lines: true
    }, (err, records) => {
      if (err) {
        console.error('Error reading CSV headers:', err);
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ status: 'error', error: 'Failed to read CSV headers' });
      }
      const headers = records[0] || [];
      console.log('Headers found:', headers);
      res.setHeader('Content-Type', 'application/json');
      res.json({ status: 'success', data: { headers } });
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ status: 'error', error: 'Failed to read file' });
  }
});

router.post('/analyze', upload.array('files'), async (req, res) => {
  console.log('POST /analyze called');
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    console.log(`Processing ${req.files.length} files...`);
    const allRecords = [];
    
    // Process each file
    for (const file of req.files) {
      const fileContent = file.buffer.toString();
      const fileRecords = await new Promise((resolve, reject) => {
        const records = [];
        parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
        .on('data', (record) => records.push(record))
        .on('error', reject)
        .on('end', () => resolve(records));
      });
      allRecords.push(...fileRecords);
    }

    // Process records and generate summaries
    const trackSummary = {};
    const artistSummary = {};
    const periodSummary = {};

    // Process each record
    allRecords.forEach(record => {
      // Add processing logic here based on the template structure
      // This is a placeholder for the actual processing logic
      const trackName = record.track_name || record.title || '';
      const artist = record.artist || '';
      const revenue = cleanRevenueValue(record.revenue || 0);
      const period = record.period || '';

      // Update track summary
      if (trackName) {
        if (!trackSummary[trackName]) {
          trackSummary[trackName] = { revenue: 0, count: 0 };
        }
        trackSummary[trackName].revenue += revenue;
        trackSummary[trackName].count++;
      }

      // Update artist summary
      if (artist) {
        if (!artistSummary[artist]) {
          artistSummary[artist] = { revenue: 0, tracks: new Set() };
        }
        artistSummary[artist].revenue += revenue;
        if (trackName) {
          artistSummary[artist].tracks.add(trackName);
        }
      }

      // Update period summary
      if (period) {
        if (!periodSummary[period]) {
          periodSummary[period] = { revenue: 0, tracks: new Set() };
        }
        periodSummary[period].revenue += revenue;
        if (trackName) {
          periodSummary[period].tracks.add(trackName);
        }
      }
    });

    // Convert Set objects to arrays for JSON serialization
    Object.values(artistSummary).forEach(summary => {
      summary.tracks = Array.from(summary.tracks);
    });
    Object.values(periodSummary).forEach(summary => {
      summary.tracks = Array.from(summary.tracks);
    });

    const results = {
      trackSummary,
      artistSummary,
      periodSummary
    };

    console.log('Analysis complete');
    res.json(results);
  } catch (error) {
    console.error('Error processing files:', error);
    res.status(500).json({ error: 'Failed to process files' });
  }
});

// Export the serverless function
module.exports.handler = serverless(app); 