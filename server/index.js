const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

const app = express();
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // Limit to 100MB
  }
});

// Configuration CORS détaillée
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin'],
  credentials: true
}));

app.use(express.json());

// Ensure uploads and templates directories exist
['uploads', 'templates'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Store templates in memory (in production, use a database)
let templates = {};
let analysisHistory = [];

// Load templates if they exist
const templatesFile = path.join('templates', 'templates.json');
console.log('Looking for templates file at:', templatesFile);

if (fs.existsSync(templatesFile)) {
  try {
    console.log('Templates file found, reading contents...');
    const templateData = JSON.parse(fs.readFileSync(templatesFile, 'utf8'));
    console.log('Raw template data:', JSON.stringify(templateData, null, 2).slice(0, 500) + '...');
    
    // Convert array-based templates to object format if needed
    if (templateData.templates && Array.isArray(templateData.templates)) {
      console.log('Converting array-based templates to object format...');
      const arrayTemplates = templateData.templates.reduce((acc, template) => {
        if (template.name && template.mapping) {
          acc[template.name] = {
            track_column: template.mapping['Track Name'] || template.mapping['Title'] || template.mapping['Song Title'],
            artist_column: template.mapping['Artist Name'] || template.mapping['Artist'],
            upc_column: template.mapping['UPC'],
            revenue_column: template.mapping['Total Revenue'] || template.mapping['Total Earnings'] || template.mapping['Gross Revenue'],
            date_column: template.mapping['Period'] || template.mapping['Reporting Period'] || template.mapping['Month'],
            source: template.name,
            currency: template.currency || 'EUR'
          };
        }
        return acc;
      }, {});
      
      // Merge array templates with object templates
      templates = {
        ...arrayTemplates,
        ...Object.fromEntries(
          Object.entries(templateData).filter(([key]) => key !== 'templates')
        )
      };
    } else {
      // Keep only the object-based templates
      templates = Object.fromEntries(
        Object.entries(templateData).filter(([key]) => key !== 'templates')
      );
    }
    
    if (Object.keys(templates).length === 0) {
      console.log('No valid templates found in templates.json, initializing with empty object');
      templates = {};
    } else {
      console.log('Successfully loaded templates:', Object.keys(templates));
      console.log('First template example:', JSON.stringify(Object.values(templates)[0], null, 2));
    }
  } catch (error) {
    console.error('Error loading templates:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    templates = {};
    console.log('Initializing with empty templates object due to error');
  }
} else {
  console.log('No templates.json found at path:', templatesFile);
  console.log('Creating empty template file...');
  templates = {};
  fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2));
}

// Add a global templates check
if (Object.keys(templates).length === 0) {
  console.warn('Warning: No templates available for CSV processing');
}

// Helper function to detect CSV delimiter from a sample
function detectDelimiter(sample) {
  const delimiters = [',', ';', '\t', '|'];
  const counts = delimiters.map(d => {
    const count = (sample.match(new RegExp(d === '|' ? '\\|' : d, 'g')) || []).length;
    return {
      delimiter: d,
      count: count
    };
  });

  const mostFrequent = counts.reduce((max, curr) => curr.count > max.count ? curr : max);
  console.log('Detected delimiters:', counts);
  console.log('Selected delimiter:', mostFrequent);
  return mostFrequent.delimiter;
}

// Helper function to check for empty required fields
function hasEmptyRequiredFields(record, mapping) {
  // Check if we have a valid mapping
  if (!mapping) {
    return true;
  }
  
  // Check required fields (track, artist, revenue)
  const requiredFields = [
    mapping.track,
    mapping.artist,
    mapping.revenue
  ];
  
  return requiredFields.some(field => {
    if (!field || !record[field]) {
      return true;
    }
    const value = record[field].toString().trim();
    return value === '' || value === 'null' || value === 'undefined';
  });
}

// Helper function to clean revenue values
function cleanRevenueValue(value) {
  if (value === null || value === undefined || value === '') {
    return 0.0;
  }

  try {
    if (typeof value === 'number') return parseFloat(value);

    let valueStr = String(value)
      .trim()
      .replace(/[€$]/g, '')
      .replace(/\s/g, '')
      .replace(/,/g, '.')
      .replace(/[^0-9.-]/g, '');

    if (value.includes('(') && value.includes(')')) {
      valueStr = '-' + valueStr;
    }

    const result = parseFloat(valueStr);
    return isNaN(result) ? 0.0 : result;
  } catch (error) {
    console.error('Error cleaning revenue value:', error);
    return 0.0;
  }
}

function getPeriodLabel(date) {
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  } catch (e) {
    return date;
  }
}

function calculateArtistRevenue(totalRevenue, artistShare = 0.7) {
  const revenue = cleanRevenueValue(totalRevenue);
  const share = typeof artistShare === 'number' ? artistShare : 0.7;
  return revenue * share;
}

function getCurrencyFromTemplate(template) {
  return template?.currency || 'EUR';
}

// Fonction pour analyser le fichier CSV
async function analyzeCSVFile(filePath, sendMessage) {
  return new Promise((resolve, reject) => {
    const results = {
      trackSummary: {},
      artistSummary: {},
      periodSummary: {}
    };

    // Lire un échantillon pour détecter le délimiteur
    const sample = fs.readFileSync(filePath, { encoding: 'utf-8', flag: 'r' }).slice(0, 4096);
    const delimiter = detectDelimiter(sample);
    console.log(`Using delimiter: "${delimiter}" for file: ${filePath}`);
    
    let recordCount = 0;
    let errorCount = 0;
    let selectedTemplate = null;
    let columnMapping = null;

    const parser = parse({
      delimiter: delimiter,
      columns: true,
      skip_empty_lines: true,
      trim: true,
      skip_records_with_error: true,
      bom: true,
      relaxColumnCount: true,
      relaxQuotes: true,
      comment: '#',
    });

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });

    fileStream
      .pipe(parser)
      .on('data', (record) => {
        try {
          recordCount++;
          
          // Log first few records for debugging
          if (recordCount <= 2) {
            console.log('Sample record:', record);
          }

          // Detect template on first record
          if (recordCount === 1) {
            const columns = Object.keys(record);
            console.log('Available columns:', columns);
            
            // Try to match template
            let bestMatchScore = 0;
            
            for (const [templateName, template] of Object.entries(templates)) {
              let score = 0;
              const templateColumns = [
                template.track_column,
                template.artist_column,
                template.upc_column,
                template.revenue_column,
                template.date_column
              ].filter(Boolean);
              
              templateColumns.forEach(col => {
                if (columns.includes(col)) score++;
              });
              
              console.log(`Template "${templateName}" match score: ${score}/${templateColumns.length}`);
              
              if (score === templateColumns.length && templateColumns.length >= 3) {
                console.log(`Using template "${templateName}" (perfect match)`);
                selectedTemplate = {
                  ...template,
                  name: templateName
                };
                bestMatchScore = score;
                sendMessage('processing_status', { 
                  message: `Using template "${templateName}" for processing (perfect match)` 
                });
                break;
              }
              
              if (score > bestMatchScore) {
                bestMatchScore = score;
                selectedTemplate = {
                  ...template,
                  name: templateName
                };
              }
            }

            // Set up column mapping
            if (!selectedTemplate) {
              console.log('No matching template found, using fallback column mapping');
              columnMapping = {
                track: columns.find(c => /track|title|song/i.test(c)) || columns[0] || '',
                artist: columns.find(c => /artist|performer|creator/i.test(c)) || columns[1] || '',
                upc: columns.find(c => /upc|isrc|identifier/i.test(c)) || '',
                revenue: columns.find(c => /revenue|amount|earnings|income/i.test(c)) || columns[2] || '',
                date: columns.find(c => /date|period|time/i.test(c)) || columns[3] || ''
              };
            } else {
              columnMapping = {
                track: selectedTemplate.track_column,
                artist: selectedTemplate.artist_column,
                upc: selectedTemplate.upc_column,
                revenue: selectedTemplate.revenue_column,
                date: selectedTemplate.date_column
              };
            }
          }

          // Skip if no valid mapping
          if (!columnMapping) {
            return;
          }

          // Skip empty records
          if (hasEmptyRequiredFields(record, columnMapping)) {
            return;
          }

          // Map the record
          const mapped = {
            Track: record[columnMapping.track] || '',
            Artist: record[columnMapping.artist] || 'Unknown',
            UPC: record[columnMapping.upc] || '',
            TotalRevenue: cleanRevenueValue(record[columnMapping.revenue]),
            Period: getPeriodLabel(record[columnMapping.date] || new Date().toISOString()),
            Source: selectedTemplate ? selectedTemplate.name : path.basename(filePath),
            Currency: selectedTemplate ? selectedTemplate.currency : 'EUR'
          };

          mapped.ArtistRevenue = calculateArtistRevenue(mapped.TotalRevenue);

          // Update summaries
          if (!results.trackSummary[mapped.Track]) {
            results.trackSummary[mapped.Track] = {
              Track: mapped.Track,
              Artist: mapped.Artist,
              TotalRevenue: 0,
              ArtistRevenue: 0,
              Currency: mapped.Currency,
              Periods: new Set(),
              Sources: new Set()
            };
          }
          
          if (!results.artistSummary[mapped.Artist]) {
            results.artistSummary[mapped.Artist] = {
              Artist: mapped.Artist,
              TotalRevenue: 0,
              ArtistRevenue: 0,
              Currency: mapped.Currency,
              TrackCount: new Set(),
              Periods: new Set()
            };
          }
          
          if (!results.periodSummary[mapped.Period]) {
            results.periodSummary[mapped.Period] = {
              Period: mapped.Period,
              TotalRevenue: 0,
              ArtistRevenue: 0,
              Currency: mapped.Currency,
              TrackCount: new Set(),
              ArtistCount: new Set()
            };
          }

          // Update track summary
          const trackSummary = results.trackSummary[mapped.Track];
          trackSummary.TotalRevenue += mapped.TotalRevenue;
          trackSummary.ArtistRevenue += mapped.ArtistRevenue;
          trackSummary.Periods.add(mapped.Period);
          trackSummary.Sources.add(mapped.Source);

          // Update artist summary
          const artistSummary = results.artistSummary[mapped.Artist];
          artistSummary.TotalRevenue += mapped.TotalRevenue;
          artistSummary.ArtistRevenue += mapped.ArtistRevenue;
          artistSummary.TrackCount.add(mapped.Track);
          artistSummary.Periods.add(mapped.Period);

          // Update period summary
          const periodSummary = results.periodSummary[mapped.Period];
          periodSummary.TotalRevenue += mapped.TotalRevenue;
          periodSummary.ArtistRevenue += mapped.ArtistRevenue;
          periodSummary.TrackCount.add(mapped.Track);
          periodSummary.ArtistCount.add(mapped.Artist);

          if (recordCount % 1000 === 0) {
            sendMessage('processing_status', {
              message: `Processed ${recordCount} records...`
            });
          }
        } catch (error) {
          errorCount++;
          console.error(`Error processing record ${recordCount}:`, error);
          if (errorCount <= 5) {
            console.error('Problematic record:', record);
          }
        }
      })
      .on('error', (error) => {
        console.error('Parser error:', error);
        reject(error);
      })
      .on('end', () => {
        console.log(`Finished processing file. Records: ${recordCount}, Errors: ${errorCount}`);
        resolve(results);
      });
  });
}

// Route pour l'upload des fichiers
app.post('/api/analyze/upload', upload.array('files'), async (req, res) => {
  try {
    console.log('Files received:', req.files?.map(f => f.originalname));
    
    // Stocker les fichiers pour traitement
    const fileIds = req.files.map(file => file.path);
    
    // Renvoyer les IDs des fichiers pour le streaming
    res.json({ 
      status: 'success',
      fileIds: fileIds
    });
  } catch (error) {
    console.error('Error during upload:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Route pour le streaming SSE
app.get('/api/analyze/stream', async (req, res) => {
  const fileIds = req.query.fileIds?.split(',');
  
  if (!fileIds || fileIds.length === 0) {
    res.status(400).json({ error: 'No files to process' });
    return;
  }

  console.log('Starting SSE stream for files:', fileIds);
  
  // Configuration des headers pour SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Helper function pour envoyer des messages SSE
  const sendMessage = (type, data) => {
    const message = JSON.stringify({ type, ...data });
    console.log('Sending SSE message:', { type, messageSize: message.length });
    res.write(`data: ${message}\n\n`);
  };

  try {
    // Envoyer un message initial
    sendMessage('processing_status', { 
      message: 'Starting analysis...' 
    });

    const results = {
      trackSummary: {},
      artistSummary: {},
      periodSummary: {}
    };

    // Process each file
    for (const fileId of fileIds) {
      if (!fs.existsSync(fileId)) {
        sendMessage('error', { message: `File ${fileId} not found` });
        continue;
      }

      console.log(`Processing file (${fs.statSync(fileId).size} bytes)`);
      
      try {
        const fileResults = await analyzeCSVFile(fileId, sendMessage);
        console.log(`File processed, merging results:`, {
          tracksCount: Object.keys(fileResults.trackSummary).length,
          artistsCount: Object.keys(fileResults.artistSummary).length,
          periodsCount: Object.keys(fileResults.periodSummary).length
        });
        
        // Merge results
        Object.assign(results.trackSummary, fileResults.trackSummary);
        Object.assign(results.artistSummary, fileResults.artistSummary);
        Object.assign(results.periodSummary, fileResults.periodSummary);
      } catch (error) {
        console.error(`Error processing file:`, error);
        sendMessage('processing_status', {
          message: `Error processing file: ${error.message}`
        });
      }

      // Clean up the temporary file
      try {
        fs.unlinkSync(fileId);
        console.log('Cleaned up temporary file:', fileId);
      } catch (error) {
        console.error('Error cleaning up file:', error);
      }
    }

    // Format and send results
    const formattedResults = {
      trackSummary: Object.values(results.trackSummary).map(s => ({
        Track: s.Track,
        Artist: s.Artist,
        TotalRevenue: `${s.TotalRevenue.toFixed(2)} ${s.Currency}`,
        ArtistRevenue: `${s.ArtistRevenue.toFixed(2)} ${s.Currency}`,
        Periods: Array.from(s.Periods).sort().join(', '),
        Sources: Array.from(s.Sources).join(', ')
      })),
      artistSummary: Object.values(results.artistSummary).map(s => ({
        Artist: s.Artist,
        TotalRevenue: `${s.TotalRevenue.toFixed(2)} ${s.Currency}`,
        ArtistRevenue: `${s.ArtistRevenue.toFixed(2)} ${s.Currency}`,
        TrackCount: s.TrackCount.size,
        Periods: Array.from(s.Periods).sort().join(', ')
      })),
      periodSummary: Object.values(results.periodSummary).map(s => ({
        Period: s.Period,
        TotalRevenue: `${s.TotalRevenue.toFixed(2)} ${s.Currency}`,
        ArtistRevenue: `${s.ArtistRevenue.toFixed(2)} ${s.Currency}`,
        TrackCount: s.TrackCount.size,
        ArtistCount: s.ArtistCount.size
      }))
    };

    console.log('Sending final results:', {
      tracksCount: formattedResults.trackSummary.length,
      artistsCount: formattedResults.artistSummary.length,
      periodsCount: formattedResults.periodSummary.length
    });

    // Send final results
    sendMessage('analysis_complete', {
      results: formattedResults
    });

    // Send completion message
    sendMessage('processing_complete', {
      message: 'Analysis completed successfully'
    });

  } catch (error) {
    console.error('Error during analysis:', error);
    sendMessage('error', { 
      message: error.message || 'Error analyzing files' 
    });
  } finally {
    // End the response
    res.end();
  }
});

// Template management endpoints
app.get('/api/templates', (req, res) => {
  try {
    if (!fs.existsSync(templatesFile)) {
      return res.json({});
    }
    const templates = JSON.parse(fs.readFileSync(templatesFile, 'utf8'));
    res.json(templates);
  } catch (error) {
    console.error('Error reading templates:', error);
    res.status(500).json({ error: 'Failed to read templates' });
  }
});

app.post('/api/templates', express.json(), (req, res) => {
  try {
    console.log('Received template save request:', req.body);
    const template = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'track_column', 'artist_column', 'upc_column', 'revenue_column', 'date_column', 'currency'];
    const missingFields = requiredFields.filter(field => !template[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: 'Invalid template format', 
        missingFields,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Load existing templates
    let existingTemplates = {};
    if (fs.existsSync(templatesFile)) {
      try {
        existingTemplates = JSON.parse(fs.readFileSync(templatesFile, 'utf8'));
        console.log('Loaded existing templates:', Object.keys(existingTemplates));
      } catch (error) {
        console.error('Error reading templates file:', error);
        existingTemplates = {};
      }
    }

    // Add or update template
    const newTemplate = {
      track_column: template.track_column,
      artist_column: template.artist_column,
      upc_column: template.upc_column,
      revenue_column: template.revenue_column,
      date_column: template.date_column,
      currency: template.currency,
      source: template.name
    };

    existingTemplates[template.name] = newTemplate;
    console.log('Saving template:', template.name, newTemplate);

    // Save templates
    try {
      fs.writeFileSync(templatesFile, JSON.stringify(existingTemplates, null, 2));
      console.log('Templates saved successfully');
      templates = existingTemplates; // Update in-memory templates
      res.json(newTemplate);
    } catch (error) {
      console.error('Error writing templates file:', error);
      res.status(500).json({ error: 'Failed to save template', details: error.message });
    }
  } catch (error) {
    console.error('Error in template save endpoint:', error);
    res.status(500).json({ error: 'Failed to save template', details: error.message });
  }
});

app.delete('/api/templates/:name', (req, res) => {
  try {
    const { name } = req.params;
    if (!fs.existsSync(templatesFile)) {
      return res.sendStatus(204);
    }

    const templates = JSON.parse(fs.readFileSync(templatesFile, 'utf8'));
    if (templates[name]) {
      delete templates[name];
      fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2));
    }
    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

app.post('/api/template-response', express.json(), (req, res) => {
  const { response } = req.body;
  // Émettre l'événement de réponse
  if (req.templateConfirmationEmitter) {
    req.templateConfirmationEmitter.emit('template_response', response);
    res.sendStatus(200);
  } else {
    res.status(400).json({ error: 'No pending template confirmation' });
  }
});

// Analysis history endpoints
app.get('/api/history', (req, res) => {
  res.json(analysisHistory);
});

app.get('/api/history/:id', (req, res) => {
  const analysis = analysisHistory.find(a => a.id === req.params.id);
  if (!analysis) {
    return res.status(404).json({ error: 'Analysis not found' });
  }
  res.json(analysis);
});

app.delete('/api/history/:id', (req, res) => {
  const index = analysisHistory.findIndex(a => a.id === req.params.id);
  if (index !== -1) {
    analysisHistory.splice(index, 1);
  }
  res.sendStatus(204);
});

// Add endpoint to read CSV headers
app.post('/api/read-headers', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const headers = [];
  
  fs.createReadStream(filePath)
    .pipe(parse({
      delimiter: ',',
      from_line: 1,
      to_line: 1,
      skip_empty_lines: true
    }))
    .on('data', (row) => {
      headers.push(...row);
    })
    .on('end', () => {
      // Clean up the temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });
      
      res.json({ headers });
    })
    .on('error', (error) => {
      console.error('Error reading CSV headers:', error);
      res.status(500).json({ error: 'Failed to read CSV headers' });
    });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 