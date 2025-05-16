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

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Credentials': 'true'
};

// Fonction pour analyser les fichiers
const analyzeFiles = async (event) => {
  console.log('Starting file analysis');
  
  try {
    if (!event.body) {
      throw new Error('No data provided in request body');
    }

    const body = Buffer.from(event.body, 'base64');
    if (body.length === 0) {
      throw new Error('Empty request body');
    }

    const contentType = event.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new Error('Invalid content type. Expected multipart/form-data');
    }

    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      throw new Error('No boundary found in content type');
    }
    const boundary = boundaryMatch[1] || boundaryMatch[2];

    const bodyStr = body.toString('utf-8');
    const parts = bodyStr.split(`--${boundary}`).filter(part => part.trim() && !part.includes('--\r\n'));

    const files = [];
    let selectedTemplate = null;

    for (const part of parts) {
      const [headerSection, ...contentSections] = part.split(/\r?\n\r?\n/);
      if (!headerSection || contentSections.length === 0) continue;

      const content = contentSections.join('\n\n').trim();
      if (!content) continue;

      const nameMatch = headerSection.match(/name="([^"]+)"/);
      const filenameMatch = headerSection.match(/filename="([^"]+)"/);

      if (!nameMatch) continue;
      const partName = nameMatch[1];

      if (partName === 'files[]' && filenameMatch) {
        const filename = filenameMatch[1];
        const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line);
        
        if (lines.length < 2 || !lines[0].includes(',')) continue;

        files.push({
          content: lines.join('\n'),
          filename,
          headers: lines[0].split(',').map(h => h.trim().replace(/(^"|"$)/g, ''))
        });
      } else if (partName === 'template') {
        selectedTemplate = content.trim();
      }
    }

    if (!files.length) {
      throw new Error('No valid CSV files found');
    }

    if (!selectedTemplate) {
      throw new Error('No template selected');
    }

    const template = templates.find(t => t.name === selectedTemplate);
    if (!template) {
      throw new Error(`Template "${selectedTemplate}" not found`);
    }

    const trackMap = new Map();
    const artistMap = new Map();
    const periodMap = new Map();
    
    let totalRevenue = 0;
    let totalArtistRevenue = 0;
    let totalRecords = 0;

    for (const file of files) {
      const lines = file.content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const columns = {
        track: headers.indexOf(template.track_column),
        artist: template.artist_column ? headers.indexOf(template.artist_column) : -1,
        revenue: headers.indexOf(template.revenue_column),
        date: headers.indexOf(template.date_column)
      };

      if (columns.track === -1 || columns.revenue === -1 || columns.date === -1) {
        console.warn(`Skipping file ${file.filename}: Missing required columns`);
        continue;
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        if (values.length !== headers.length) continue;

        const track = values[columns.track];
        const artist = columns.artist !== -1 ? values[columns.artist] : 'Unknown Artist';
        
        let revenue = parseFloat(values[columns.revenue].replace(/[^\d.-]/g, ''));
        if (isNaN(revenue) || revenue < 0) continue;
        
        if (template.currency === 'USD') {
          revenue *= 0.92;
        }
        revenue = parseFloat(revenue.toFixed(2));

        const dateStr = values[columns.date];
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) continue;
        
        const period = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

        // Update track data
        const trackKey = `${track}|${artist}`;
        if (!trackMap.has(trackKey)) {
          trackMap.set(trackKey, { track, artist, revenue: 0, periods: new Set() });
        }
        const trackData = trackMap.get(trackKey);
        trackData.revenue += revenue;
        trackData.periods.add(period);

        // Update artist data
        if (!artistMap.has(artist)) {
          artistMap.set(artist, { artist, revenue: 0, tracks: new Set(), periods: new Set() });
        }
        const artistData = artistMap.get(artist);
        artistData.revenue += revenue;
        artistData.tracks.add(track);
        artistData.periods.add(period);

        // Update period data
        if (!periodMap.has(period)) {
          periodMap.set(period, { period, revenue: 0, tracks: new Set() });
        }
        const periodData = periodMap.get(period);
        periodData.revenue += revenue;
        periodData.tracks.add(track);

        totalRevenue += revenue;
        totalArtistRevenue += revenue * 0.7;
        totalRecords++;
      }
    }

    const result = {
      summary: {
        totalFiles: files.length,
        totalRecords,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalArtistRevenue: parseFloat(totalArtistRevenue.toFixed(2)),
        uniqueTracksCount: trackMap.size,
        uniqueArtistsCount: artistMap.size,
        uniquePeriodsCount: periodMap.size
      },
      tracks: Array.from(trackMap.values()).map(t => ({
        track: t.track,
        artist: t.artist,
        revenue: parseFloat(t.revenue.toFixed(2)),
        periods: Array.from(t.periods).sort()
      })).sort((a, b) => b.revenue - a.revenue),
      artists: Array.from(artistMap.values()).map(a => ({
        artist: a.artist,
        revenue: parseFloat(a.revenue.toFixed(2)),
        trackCount: a.tracks.size,
        periods: Array.from(a.periods).sort()
      })).sort((a, b) => b.revenue - a.revenue),
      periods: Array.from(periodMap.values()).map(p => ({
        period: p.period,
        revenue: parseFloat(p.revenue.toFixed(2)),
        trackCount: p.tracks.size
      })).sort((a, b) => a.period.localeCompare(b.period))
    };

    return result;
  } catch (error) {
    console.error('Error in analyzeFiles:', error);
    throw error;
  }
};

// Fonction pour mettre à jour un template
const updateTemplate = async (event) => {
  try {
    const updatedTemplate = JSON.parse(event.body);
    const index = templates.findIndex(t => t.name === updatedTemplate.name);
    
    if (index === -1) {
      templates.push(updatedTemplate);
    } else {
      templates[index] = updatedTemplate;
    }
    
    return templates;
  } catch (error) {
    console.error('Error updating template:', error);
    throw new Error('Failed to update template: ' + error.message);
  }
};

const sendResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Vary': 'Origin'
    },
    body: JSON.stringify(body, (key, value) => {
      if (value instanceof Set) return Array.from(value);
      if (typeof value === 'number') return parseFloat(value.toFixed(2));
      return value;
    })
  };
};

const sendError = (statusCode, error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return sendResponse(statusCode, { error: errorMessage });
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    switch (event.httpMethod) {
      case 'GET':
        return sendResponse(200, templates);

      case 'POST':
        if (event.path.includes('template')) {
          const updatedTemplates = await updateTemplate(event);
          return sendResponse(200, updatedTemplates);
        }
        
        if (!event.body) {
          return sendError(400, 'No request body provided');
        }

        if (!event.headers['content-type']?.includes('multipart/form-data')) {
          return sendError(400, 'Invalid content type');
        }

        try {
          const result = await analyzeFiles(event);
          return sendResponse(200, result);
        } catch (error) {
          return sendError(400, error);
        }

      default:
        return sendError(405, 'Method not allowed');
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return sendError(500, 'Internal server error');
  }
}; 