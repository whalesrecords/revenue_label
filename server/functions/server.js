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
    fileSize: 5 * 1024 * 1024, // 5MB limit
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

    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
      relaxQuotes: true,
      skipEmptyLines: true
    })
    .on('data', (record) => {
      try {
        // Vérifier si l'enregistrement est valide
        if (Object.keys(record).length > 0) {
          records.push(record);
        }
      } catch (err) {
        console.warn(`Warning: Invalid record in ${fileName}`);
      }
    })
    .on('error', (err) => {
      reject(new Error(`Failed to parse ${fileName}: ${err.message}`));
    })
    .on('end', () => {
      resolve(records);
    });
  });
};

// Helper function to safely extract field value
const extractField = (record, fieldNames, defaultValue = '') => {
  for (const name of fieldNames) {
    const value = record[name];
    if (value && String(value).trim()) {
      return String(value).trim();
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
  
  try {
    // Vérifier les fichiers
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Traiter chaque fichier
    const allRecords = [];
    const errors = [];
    
    for (const file of req.files) {
      try {
        const fileContent = file.buffer.toString();
        if (!fileContent.trim()) {
          errors.push({ file: file.originalname, error: 'File is empty' });
          continue;
        }

        const records = await parseCSVContent(fileContent, file.originalname);
        if (records.length > 0) {
          allRecords.push(...records);
        } else {
          errors.push({ file: file.originalname, error: 'No valid records found in file' });
        }
      } catch (err) {
        errors.push({ file: file.originalname, error: err.message });
      }
    }

    if (allRecords.length === 0) {
      return res.status(400).json({
        error: 'No valid records found',
        details: errors
      });
    }

    // Initialiser les structures de données
    const tracks = new Map();
    const artists = new Map();
    const periods = new Map();

    // Traiter les enregistrements
    for (const record of allRecords) {
      try {
        // Extraire les données
        const track = extractField(record, ['track_name', 'title', 'Track Title', 'Song Title']);
        const artist = extractField(record, ['artist', 'Artist', 'Artist Name']);
        const period = extractField(record, ['period', 'Sales Period', 'Transaction Date', 'Reporting Date', 'Operation Date']);
        const revenue = cleanRevenueValue(extractField(record, ['revenue', 'Payable', 'Total Earned', 'Net Income'], '0'));

        if (!track || !artist || !period) continue;

        // Mettre à jour les pistes
        const trackKey = `${track}-${artist}`;
        if (!tracks.has(trackKey)) {
          tracks.set(trackKey, {
            Track: track,
            Artist: artist,
            TotalRevenue: 0,
            ArtistRevenue: 0,
            Periods: new Set(),
            Sources: new Set()
          });
        }
        const trackData = tracks.get(trackKey);
        trackData.TotalRevenue += revenue;
        trackData.ArtistRevenue += revenue * 0.7;
        trackData.Periods.add(period);

        // Mettre à jour les artistes
        if (!artists.has(artist)) {
          artists.set(artist, {
            Artist: artist,
            TotalRevenue: 0,
            ArtistRevenue: 0,
            TrackCount: new Set(),
            Periods: new Set()
          });
        }
        const artistData = artists.get(artist);
        artistData.TotalRevenue += revenue;
        artistData.ArtistRevenue += revenue * 0.7;
        artistData.TrackCount.add(track);
        artistData.Periods.add(period);

        // Mettre à jour les périodes
        if (!periods.has(period)) {
          periods.set(period, {
            Period: period,
            TotalRevenue: 0,
            ArtistRevenue: 0,
            TrackCount: new Set(),
            ArtistCount: new Set()
          });
        }
        const periodData = periods.get(period);
        periodData.TotalRevenue += revenue;
        periodData.ArtistRevenue += revenue * 0.7;
        periodData.TrackCount.add(track);
        periodData.ArtistCount.add(artist);
      } catch (err) {
        console.warn('Error processing record:', err.message);
      }
    }

    // Préparer les résultats
    const results = {
      trackSummary: Array.from(tracks.values()).map(data => ({
        Track: data.Track,
        Artist: data.Artist,
        TotalRevenue: `${data.TotalRevenue.toFixed(2)} EUR`,
        ArtistRevenue: `${data.ArtistRevenue.toFixed(2)} EUR`,
        Periods: Array.from(data.Periods).sort().join(', ')
      })),
      artistSummary: Array.from(artists.values()).map(data => ({
        Artist: data.Artist,
        TrackCount: data.TrackCount.size,
        TotalRevenue: `${data.TotalRevenue.toFixed(2)} EUR`,
        ArtistRevenue: `${data.ArtistRevenue.toFixed(2)} EUR`,
        Periods: Array.from(data.Periods).sort().join(', ')
      })),
      periodSummary: Array.from(periods.values()).map(data => ({
        Period: data.Period,
        TrackCount: data.TrackCount.size,
        ArtistCount: data.ArtistCount.size,
        TotalRevenue: `${data.TotalRevenue.toFixed(2)} EUR`,
        ArtistRevenue: `${data.ArtistRevenue.toFixed(2)} EUR`
      })),
      totalRecords: allRecords.length,
      processedFiles: req.files.map(f => f.originalname),
      errors: errors.length ? errors : undefined
    };

    // Trier les résultats
    results.trackSummary.sort((a, b) => parseFloat(b.TotalRevenue) - parseFloat(a.TotalRevenue));
    results.artistSummary.sort((a, b) => parseFloat(b.TotalRevenue) - parseFloat(a.TotalRevenue));
    results.periodSummary.sort((a, b) => a.Period.localeCompare(b.Period));

    res.json(results);
  } catch (error) {
    console.error('Fatal error:', error);
    res.status(500).json({
      error: 'Failed to process files',
      details: error.message
    });
  }
});

// Export the serverless function
module.exports.handler = serverless(app); 