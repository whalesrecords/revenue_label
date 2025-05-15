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
const router = express.Router();

// Configuration CORS plus permissive
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'Authorization'],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));
router.use(cors(corsOptions));

// Base path for all routes
app.use('/.netlify/functions/server', router);

// Configuration multer pour le stockage en mémoire
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files at once
  }
});

app.use(express.json());
router.use(express.json());

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

// Helper function to safely parse CSV content
const parseCSVContent = async (fileContent, fileName) => {
  return new Promise((resolve, reject) => {
    const records = [];
    let headersParsed = false;
    let headers = [];

    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
      relaxQuotes: true,
      skipEmptyLines: true,
      onRecord: (record, { lines }) => {
        if (!headersParsed) {
          headers = Object.keys(record);
          headersParsed = true;
          console.log(`Headers found in ${fileName}:`, headers);
        }
        return record;
      }
    })
    .on('data', (record) => {
      try {
        // Vérifier si l'enregistrement est valide
        const hasValidData = Object.entries(record).some(([key, value]) => 
          value !== null && value !== undefined && value.toString().trim() !== ''
        );

        if (hasValidData) {
          records.push(record);
        }
      } catch (err) {
        console.warn(`Warning: Skipping invalid record in ${fileName}:`, err.message);
      }
    })
    .on('error', (err) => {
      console.error(`Error parsing ${fileName}:`, err);
      reject(new Error(`Failed to parse ${fileName}: ${err.message}`));
    })
    .on('end', () => {
      console.log(`Successfully parsed ${records.length} records from ${fileName}`);
      resolve(records);
    });
  });
};

// Helper function to safely extract field value
const extractField = (record, fieldNames, defaultValue = '') => {
  for (const name of fieldNames) {
    if (record[name] && record[name].toString().trim() !== '') {
      return record[name].toString().trim();
    }
  }
  return defaultValue;
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
  const startTime = Date.now();
  
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`Processing ${req.files.length} files:`, req.files.map(f => f.originalname));
    const allRecords = [];
    const errors = [];
    
    // Process each file
    for (const file of req.files) {
      try {
        console.log(`Processing ${file.originalname} (${file.size} bytes)`);
        const fileContent = file.buffer.toString();
        const fileRecords = await parseCSVContent(fileContent, file.originalname);
        allRecords.push(...fileRecords);
      } catch (err) {
        console.error(`Error processing ${file.originalname}:`, err);
        errors.push({ file: file.originalname, error: err.message });
      }
    }

    if (allRecords.length === 0) {
      return res.status(400).json({ 
        error: 'No valid records found',
        details: errors.length ? errors : 'Files contained no valid data'
      });
    }

    // Initialize data structures
    const trackData = new Map();
    const artistData = new Map();
    const periodData = new Map();

    // Process records
    allRecords.forEach((record, index) => {
      try {
        const trackName = extractField(record, ['track_name', 'title', 'Track Title', 'Song Title']);
        const artist = extractField(record, ['artist', 'Artist', 'Artist Name']);
        const revenue = cleanRevenueValue(extractField(record, ['revenue', 'Payable', 'Total Earned', 'Net Income'], '0'));
        const period = extractField(record, ['period', 'Sales Period', 'Transaction Date', 'Reporting Date', 'Operation Date']);
        const source = extractField(record, ['source', 'Source', 'Platform'], 'Unknown');

        if (!trackName || !artist || !period) {
          console.warn(`Warning: Skipping record ${index + 1} due to missing required fields`);
          return;
        }

        // Update track data
        if (!trackData.has(trackName)) {
          trackData.set(trackName, {
            Track: trackName,
            Artist: artist,
            TotalRevenue: 0,
            ArtistRevenue: 0,
            Periods: new Set(),
            Sources: new Set()
          });
        }
        const track = trackData.get(trackName);
        track.TotalRevenue += revenue;
        track.ArtistRevenue += revenue * 0.7;
        track.Periods.add(period);
        track.Sources.add(source);

        // Update artist data
        if (!artistData.has(artist)) {
          artistData.set(artist, {
            Artist: artist,
            TotalRevenue: 0,
            ArtistRevenue: 0,
            TrackCount: new Set(),
            Periods: new Set()
          });
        }
        const artistRecord = artistData.get(artist);
        artistRecord.TotalRevenue += revenue;
        artistRecord.ArtistRevenue += revenue * 0.7;
        artistRecord.TrackCount.add(trackName);
        artistRecord.Periods.add(period);

        // Update period data
        if (!periodData.has(period)) {
          periodData.set(period, {
            Period: period,
            TotalRevenue: 0,
            ArtistRevenue: 0,
            TrackCount: new Set(),
            ArtistCount: new Set()
          });
        }
        const periodRecord = periodData.get(period);
        periodRecord.TotalRevenue += revenue;
        periodRecord.ArtistRevenue += revenue * 0.7;
        periodRecord.TrackCount.add(trackName);
        periodRecord.ArtistCount.add(artist);
      } catch (err) {
        console.error(`Error processing record ${index + 1}:`, err);
      }
    });

    // Convert to arrays and format
    const trackSummary = Array.from(trackData.values()).map(data => ({
      Track: data.Track,
      Artist: data.Artist,
      TotalRevenue: `${data.TotalRevenue.toFixed(2)} EUR`,
      ArtistRevenue: `${data.ArtistRevenue.toFixed(2)} EUR`,
      Periods: Array.from(data.Periods).sort().join(', '),
      Sources: Array.from(data.Sources).sort().join(', ')
    }));

    const artistSummary = Array.from(artistData.values()).map(data => ({
      Artist: data.Artist,
      TrackCount: data.TrackCount.size,
      TotalRevenue: `${data.TotalRevenue.toFixed(2)} EUR`,
      ArtistRevenue: `${data.ArtistRevenue.toFixed(2)} EUR`,
      Periods: Array.from(data.Periods).sort().join(', ')
    }));

    const periodSummary = Array.from(periodData.values()).map(data => ({
      Period: data.Period,
      TrackCount: data.TrackCount.size,
      ArtistCount: data.ArtistCount.size,
      TotalRevenue: `${data.TotalRevenue.toFixed(2)} EUR`,
      ArtistRevenue: `${data.ArtistRevenue.toFixed(2)} EUR`
    }));

    // Sort results
    trackSummary.sort((a, b) => parseFloat(b.TotalRevenue) - parseFloat(a.TotalRevenue));
    artistSummary.sort((a, b) => parseFloat(b.TotalRevenue) - parseFloat(a.TotalRevenue));
    periodSummary.sort((a, b) => a.Period.localeCompare(b.Period));

    const results = {
      trackSummary,
      artistSummary,
      periodSummary,
      totalRecords: allRecords.length,
      processedFiles: req.files.map(f => f.originalname),
      processingTime: Date.now() - startTime,
      errors: errors.length ? errors : undefined
    };

    console.log('Analysis complete:', {
      files: req.files.length,
      records: allRecords.length,
      tracks: trackSummary.length,
      artists: artistSummary.length,
      periods: periodSummary.length,
      time: results.processingTime
    });

    res.json(results);
  } catch (error) {
    console.error('Fatal error:', error);
    res.status(500).json({ 
      error: 'Failed to process files',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Export the serverless function
module.exports.handler = serverless(app); 