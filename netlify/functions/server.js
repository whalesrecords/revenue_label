const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

const app = express();
const upload = multer();

// Enable CORS
app.use(cors());
app.use(express.json());

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

// Analyze endpoint
app.post('/', upload.array('files[]'), async (req, res) => {
  console.log('POST /analyze called');
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const selectedTemplate = req.body.template;
    if (!selectedTemplate) {
      return res.status(400).json({ error: 'No template selected' });
    }

    const template = templates.find(t => t.name === selectedTemplate);
    if (!template) {
      return res.status(400).json({ error: `Template "${selectedTemplate}" not found` });
    }

    const trackMap = new Map();
    const artistMap = new Map();
    const periodMap = new Map();
    let totalRevenue = 0;
    let totalArtistRevenue = 0;
    let totalRecords = 0;

    for (const file of req.files) {
      const content = file.buffer.toString('utf-8');
      const records = await new Promise((resolve, reject) => {
        parse(content, {
          columns: true,
          skip_empty_lines: true
        }, (err, records) => {
          if (err) reject(err);
          else resolve(records);
        });
      });

      for (const record of records) {
        const track = record[template.track_column];
        const artist = template.artist_column ? record[template.artist_column] : 'Unknown Artist';
        let revenue = parseFloat(record[template.revenue_column].replace(/[^\d.-]/g, ''));
        
        if (isNaN(revenue) || revenue < 0) continue;
        
        if (template.currency === 'USD') {
          revenue *= 0.92; // Convert to EUR
        }
        revenue = parseFloat(revenue.toFixed(2));

        const dateStr = record[template.date_column];
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) continue;

        trackMap.set(track, (trackMap.get(track) || 0) + revenue);
        artistMap.set(artist, (artistMap.get(artist) || 0) + revenue);
        periodMap.set(dateStr, (periodMap.get(dateStr) || 0) + revenue);
        
        totalRevenue += revenue;
        if (artist !== 'Unknown Artist') {
          totalArtistRevenue += revenue;
        }
        totalRecords++;
      }
    }

    const results = {
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalArtistRevenue: parseFloat(totalArtistRevenue.toFixed(2)),
        uniqueTracks: Array.from(trackMap.keys()),
        uniqueArtists: Array.from(artistMap.keys()),
        uniquePeriods: Array.from(periodMap.keys()),
        totalRecords
      },
      details: {
        byTrack: Object.fromEntries(trackMap),
        byArtist: Object.fromEntries(artistMap),
        byPeriod: Object.fromEntries(periodMap)
      }
    };

    res.json(results);
  } catch (error) {
    console.error('Error analyzing files:', error);
    res.status(500).json({ error: 'Failed to analyze files' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export the serverless function
exports.handler = serverless(app); 