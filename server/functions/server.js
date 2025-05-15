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
  origin: '*', // Allow all origins in development
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'Authorization'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Appliquer CORS à toutes les routes
app.use(cors(corsOptions));
router.use(cors(corsOptions));

// Middleware pour gérer les erreurs CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Configuration des limites Express
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configuration multer avec gestion d'erreur
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit par fichier
    files: 10, // Maximum 10 fichiers
    fieldSize: 50 * 1024 * 1024
  }
}).array('files');

// Middleware de gestion des erreurs multer
const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          details: `Le fichier dépasse la limite de 50MB`
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Too many files',
          details: 'Maximum 10 fichiers peuvent être uploadés à la fois'
        });
      }
      return res.status(400).json({
        error: 'Upload error',
        details: err.message
      });
    } else if (err) {
      return res.status(500).json({
        error: 'Server error',
        details: 'Une erreur est survenue pendant l\'upload'
      });
    }
    next();
  });
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  const logInfo = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined
  };
  
  console.log('Request details:', JSON.stringify(logInfo, null, 2));
  next();
};

// Apply validation middleware to all routes
router.use(validateRequest);

// Base path for all routes
app.use('/', router);

// Monter le router sur /api
app.use('/.netlify/functions/server', router);

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

// Initialize templates with predefined ones and load from file if exists
let templates = { ...predefinedTemplates };
const templatesFile = path.join(__dirname, 'templates.json');

try {
  if (fs.existsSync(templatesFile)) {
    const savedTemplates = JSON.parse(fs.readFileSync(templatesFile, 'utf8'));
    templates = { ...templates, ...savedTemplates };
  }
} catch (error) {
  console.error('Error loading templates:', error);
}

// Function to save templates to file
const saveTemplatesToFile = () => {
  try {
    fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2));
  } catch (error) {
    console.error('Error saving templates to file:', error);
  }
};

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

const cleanupMemory = () => {
  if (global.gc) {
    global.gc();
  }
};

const parseCSVContent = async (fileContent, fileName) => {
  return new Promise((resolve, reject) => {
    const records = [];
    let headersParsed = false;
    let rowCount = 0;
    const MAX_ROWS = 500000; // Augmenter la limite de lignes

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
      relaxQuotes: true,
      skipEmptyLines: true,
      bom: true,
      chunk_size: 2 * 1024 * 1024, // Augmenter à 2MB par chunk
      on_record: (record) => {
        // Nettoyage et validation basique des données
        const cleanRecord = {};
        Object.keys(record).forEach(key => {
          if (typeof record[key] === 'string') {
            cleanRecord[key] = record[key].trim();
          } else {
            cleanRecord[key] = record[key];
          }
        });
        return cleanRecord;
      }
    });

    parser.on('readable', function() {
      let record;
      while (rowCount < MAX_ROWS && (record = parser.read())) {
        try {
          if (Object.keys(record).length > 0) {
            records.push(record);
            rowCount++;

            // Nettoyage périodique de la mémoire
            if (rowCount % 10000 === 0) {
              cleanupMemory();
            }
          }
        } catch (err) {
          console.warn(`Warning: Invalid record in ${fileName} at row ${rowCount + 1}`);
        }
      }
    });

    parser.on('error', (err) => {
      console.error(`Error parsing ${fileName}:`, err);
      cleanupMemory();
      reject(new Error(`Failed to parse ${fileName}: ${err.message}`));
    });

    parser.on('end', () => {
      if (rowCount >= MAX_ROWS) {
        console.warn(`Warning: File ${fileName} exceeded maximum row limit of ${MAX_ROWS}`);
      }
      cleanupMemory();
      resolve(records);
    });

    parser.write(fileContent);
    parser.end();
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

router.get('/templates', async (req, res) => {
  try {
    console.log('GET /templates called');
    console.log('Request URL:', req.url);
    console.log('Request path:', req.path);
    console.log('Request headers:', req.headers);
    console.log('Current templates:', templates);

    // Set proper headers before any response
    res.set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Cache-Control': 'no-cache'
    });

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Ensure templates is properly initialized
    if (!templates || typeof templates !== 'object') {
      console.warn('Templates not properly initialized, reinitializing...');
      templates = { ...predefinedTemplates };
      
      // Try to load from file
      try {
        if (fs.existsSync(templatesFile)) {
          const savedTemplates = JSON.parse(fs.readFileSync(templatesFile, 'utf8'));
          templates = { ...templates, ...savedTemplates };
        }
      } catch (loadError) {
        console.error('Error loading templates from file:', loadError);
      }
    }

    // Convert templates to array format
    const templateArray = Object.entries(templates).map(([name, template]) => ({
      name,
      ...template
    }));

    console.log('Sending templates response:', JSON.stringify(templateArray, null, 2));
    return res.json(templateArray);
  } catch (error) {
    console.error('Error in /templates route:', error);
    // Ensure error response is also JSON
    return res.status(500).json({
      error: 'Failed to get templates',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.post('/templates', express.json(), (req, res) => {
  try {
    console.log('POST /templates called with body:', req.body);
    const { name, ...templateData } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Invalid template',
        message: 'Template name is required'
      });
    }

    // Validate required fields
    const requiredFields = ['track_column', 'artist_column', 'revenue_column', 'date_column'];
    const missingFields = requiredFields.filter(field => !templateData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Invalid template',
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Add the template
    templates[name] = {
      ...templateData,
      currency: templateData.currency || 'EUR'
    };

    // Save to file
    saveTemplatesToFile();

    console.log('Template saved:', name);
    res.json({ name, ...templates[name] });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({
      error: 'Failed to save template',
      message: error.message
    });
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

// Fonction optimisée pour le traitement des fichiers
const processFileOptimized = async (fileContent, fileName) => {
  return new Promise((resolve, reject) => {
    const results = {
      records: [],
      totalRevenue: 0,
      totalArtistRevenue: 0,
      uniqueTracks: new Set(),
      uniqueArtists: new Set(),
      uniquePeriods: new Set()
    };

    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true,
      relaxQuotes: true,
      skipEmptyLines: true,
      bom: true,
      chunk_size: 512 * 1024, // Réduire à 512KB par chunk pour Netlify
    });

    parser.on('readable', function() {
      let record;
      while ((record = parser.read())) {
        try {
          // Extraction et nettoyage minimal des données essentielles
          const track = (record['track_name'] || record['title'] || record['Track Title'] || record['Song Title'] || '').trim();
          const artist = (record['artist'] || record['Artist'] || record['Artist Name'] || '').trim();
          const period = (record['period'] || record['Sales Period'] || record['Transaction Date'] || record['Reporting Date'] || record['Operation Date'] || '').trim();
          const revenue = cleanRevenueValue(record['revenue'] || record['Payable'] || record['Total Earned'] || record['Net Income'] || '0');

          if (track && artist && period) {
            results.records.push({ track, artist, period, revenue });
            results.totalRevenue += revenue;
            results.totalArtistRevenue += revenue * 0.7;
            results.uniqueTracks.add(`${track}-${artist}`);
            results.uniqueArtists.add(artist);
            results.uniquePeriods.add(period);
          }
        } catch (err) {
          console.warn(`Warning: Invalid record in ${fileName}`);
        }
      }
    });

    parser.on('error', (err) => {
      console.error(`Error parsing ${fileName}:`, err);
      reject(err);
    });

    parser.on('end', () => {
      resolve({
        ...results,
        uniqueTracks: Array.from(results.uniqueTracks),
        uniqueArtists: Array.from(results.uniqueArtists),
        uniquePeriods: Array.from(results.uniquePeriods)
      });
    });

    parser.write(fileContent);
    parser.end();
  });
};

// Fonction pour traiter un lot de fichiers
const processBatch = async (files) => {
  const results = [];
  const errors = [];
  const summary = {
    totalRevenue: 0,
    totalArtistRevenue: 0,
    uniqueTracks: new Set(),
    uniqueArtists: new Set(),
    uniquePeriods: new Set()
  };

  for (const file of files) {
    try {
      console.log(`Processing ${file.originalname} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      const fileContent = file.buffer.toString();

      if (!fileContent.trim()) {
        errors.push({ file: file.originalname, error: 'File is empty' });
        continue;
      }

      const fileResults = await processFileOptimized(fileContent, file.originalname);
      
      // Agréger les résultats
      results.push(...fileResults.records);
      summary.totalRevenue += fileResults.totalRevenue;
      summary.totalArtistRevenue += fileResults.totalArtistRevenue;
      fileResults.uniqueTracks.forEach(track => summary.uniqueTracks.add(track));
      fileResults.uniqueArtists.forEach(artist => summary.uniqueArtists.add(artist));
      fileResults.uniquePeriods.forEach(period => summary.uniquePeriods.add(period));

      // Libérer la mémoire
      file.buffer = null;
      if (global.gc) global.gc();
      
      console.log(`Processed ${fileResults.records.length} records from ${file.originalname}`);
    } catch (err) {
      console.error(`Error processing ${file.originalname}:`, err);
      errors.push({ file: file.originalname, error: err.message });
    }
  }

  return {
    records: results,
    summary: {
      ...summary,
      uniqueTracks: Array.from(summary.uniqueTracks),
      uniqueArtists: Array.from(summary.uniqueArtists),
      uniquePeriods: Array.from(summary.uniquePeriods)
    },
    errors
  };
};

// Route d'analyse optimisée
router.post('/analyze', uploadMiddleware, async (req, res) => {
  console.log('POST /analyze called');
  
  try {
    if (!req.files?.length) {
      return res.status(400).json({
        error: 'No files uploaded',
        details: 'Veuillez sélectionner au moins un fichier CSV à analyser'
      });
    }

    console.log(`Processing ${req.files.length} files`);
    
    const { records, summary, errors } = await processBatch(req.files);

    if (records.length === 0) {
      return res.status(400).json({
        error: 'No valid records found',
        details: 'Aucun enregistrement valide n\'a pu être extrait des fichiers',
        errors
      });
    }

    const response = {
      summary: {
        totalFiles: req.files.length,
        totalRecords: records.length,
        totalRevenue: summary.totalRevenue.toFixed(2) + ' EUR',
        totalArtistRevenue: summary.totalArtistRevenue.toFixed(2) + ' EUR',
        uniqueTracks: summary.uniqueTracks.length,
        uniqueArtists: summary.uniqueArtists.length,
        uniquePeriods: summary.uniquePeriods.length
      },
      processedFiles: req.files.map(f => ({
        name: f.originalname,
        size: (f.size / (1024 * 1024)).toFixed(2)
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Fatal error:', error);
    res.status(500).json({
      error: 'Failed to process files',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.name || 'Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Export the serverless handler
module.exports = app;
module.exports.handler = serverless(app); 