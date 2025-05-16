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
  }
];

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json; charset=utf-8'
};

// Fonction pour analyser les fichiers
const analyzeFiles = async (event) => {
  console.log('Starting file analysis');
  console.log('Content-Type:', event.headers['content-type']);
  
  try {
    if (!event.body) {
      throw new Error('No data provided');
    }

    // Since we're receiving multipart/form-data, the body will be a Buffer
    const body = Buffer.from(event.body, 'base64');
    console.log('Decoded body size:', body.length);

    // Get the boundary from the content type
    const contentType = event.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      throw new Error('Invalid content type. Expected multipart/form-data');
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      throw new Error('No boundary found in content type');
    }

    console.log('Found boundary:', boundary);
    const bodyStr = body.toString('utf-8');
    const parts = bodyStr.split(`--${boundary}`);
    console.log('Found parts:', parts.length);

    const files = [];
    let selectedTemplate = null;

    // Parse multipart form data
    for (const part of parts) {
      if (!part.trim() || part === '--') continue;

      const [headers, ...contentParts] = part.split('\r\n\r\n');
      const content = contentParts.join('\r\n\r\n');

      console.log('Processing part headers:', headers);

      if (headers.includes('name="files"')) {
        console.log('Found file part');
        const filename = headers.match(/filename="([^"]+)"/)?.[1];
        console.log('Filename:', filename);
        
        if (content) {
          files.push({
            content: content.trim(),
            filename: filename || `File ${files.length + 1}`
          });
        }
      } else if (headers.includes('name="template"')) {
        console.log('Found template part');
        selectedTemplate = content.trim();
        console.log('Selected template:', selectedTemplate);
      }
    }

    if (!files.length) {
      throw new Error('No files found in request');
    }

    if (!selectedTemplate) {
      throw new Error('No template selected');
    }

    // Find the selected template
    const template = templates.find(t => t.name === selectedTemplate);
    if (!template) {
      throw new Error(`Template "${selectedTemplate}" not found`);
    }

    let totalRevenue = 0;
    let totalArtistRevenue = 0;
    let totalRecords = 0;
    const uniqueTracks = new Set();
    const uniqueArtists = new Set();
    const uniquePeriods = new Set();
    const processedFiles = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.filename}`);
        const lines = file.content.split('\n');
        
        if (lines.length < 2) {
          errors.push(`File ${file.filename} is empty or invalid`);
          continue;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        console.log('File headers:', headers);

        // Validate required columns exist
        const columnIndexes = {
          track: headers.indexOf(template.track_column),
          artist: headers.indexOf(template.artist_column),
          revenue: headers.indexOf(template.revenue_column),
          date: headers.indexOf(template.date_column)
        };

        console.log('Column indexes:', columnIndexes);

        const missingColumns = Object.entries(columnIndexes)
          .filter(([_, index]) => index === -1)
          .map(([field]) => template[`${field}_column`]);

        if (missingColumns.length > 0) {
          errors.push(`Missing required columns in ${file.filename}: ${missingColumns.join(', ')}`);
          continue;
        }

        let fileRevenue = 0;
        let fileRecords = 0;
        let fileErrors = [];

        // Process each data row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim());
          
          if (values.length !== headers.length) {
            fileErrors.push(`Line ${i}: Invalid number of columns`);
            continue;
          }

          const track = values[columnIndexes.track];
          const artist = values[columnIndexes.artist];
          const revenueStr = values[columnIndexes.revenue].replace(/[^0-9.-]+/g, '');
          const revenue = parseFloat(revenueStr);
          
          if (isNaN(revenue)) {
            console.warn(`Invalid revenue value at line ${i}: ${values[columnIndexes.revenue]}`);
            continue;
          }
          
          const date = values[columnIndexes.date];

          if (track) uniqueTracks.add(track);
          if (artist) uniqueArtists.add(artist);
          if (date) {
            try {
              const dateObj = new Date(date);
              if (!isNaN(dateObj.getTime())) {
                const period = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                uniquePeriods.add(period);
              }
            } catch (error) {
              fileErrors.push(`Line ${i}: Invalid date format: ${date}`);
            }
          }

          fileRevenue += revenue;
          fileRecords++;
        }

        console.log(`File ${file.filename} processed:`, {
          records: fileRecords,
          revenue: fileRevenue,
          errors: fileErrors.length
        });

        totalRevenue += fileRevenue;
        totalRecords += fileRecords;
        totalArtistRevenue += fileRevenue * 0.7;

        processedFiles.push({
          filename: file.filename,
          records: fileRecords,
          revenue: fileRevenue,
          status: fileErrors.length > 0 ? 'partial' : 'success',
          errors: fileErrors
        });
      } catch (error) {
        console.error(`Error processing file ${file.filename}:`, error);
        errors.push(`Error processing file ${file.filename}: ${error.message}`);
      }
    }

    const result = {
      summary: {
        totalFiles: files.length,
        totalRecords,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalArtistRevenue: parseFloat(totalArtistRevenue.toFixed(2)),
        uniqueTracks: Array.from(uniqueTracks),
        uniqueArtists: Array.from(uniqueArtists),
        uniquePeriods: Array.from(uniquePeriods)
      },
      processedFiles,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Analysis result:', result);
    return result;
  } catch (error) {
    console.error('Error analyzing files:', error);
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

// Fonction helper pour retourner une réponse formatée
const sendResponse = (statusCode, body) => {
  const response = {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
  };
  console.log('Sending response:', response);
  return response;
};

// Fonction helper pour retourner une erreur
const sendError = (statusCode, error) => {
  console.error('Sending error response:', error);
  return sendResponse(statusCode, {
    summary: {
      totalFiles: 0,
      totalRecords: 0,
      totalRevenue: 0,
      totalArtistRevenue: 0,
      uniqueTracks: [],
      uniqueArtists: [],
      uniquePeriods: []
    },
    processedFiles: [],
    error: error.message || error
  });
};

exports.handler = async (event, context) => {
  console.log('Event path:', event.path);
  console.log('HTTP method:', event.httpMethod);
  console.log('Headers:', event.headers);
  console.log('Body size:', event.body ? Buffer.from(event.body, 'base64').length : 0);

  // Gestion des requêtes OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Gestion des routes en fonction de la méthode HTTP
    switch (event.httpMethod) {
      case 'GET':
        // Route pour obtenir les templates
        console.log('Sending templates:', templates);
        return sendResponse(200, templates);

      case 'POST':
        console.log('Processing POST request');
        try {
          // Si le chemin contient "template", c'est une mise à jour de template
          if (event.path.includes('template')) {
            console.log('Updating template');
            const updatedTemplates = await updateTemplate(event);
            return sendResponse(200, updatedTemplates);
          }
          
          // Sinon, c'est une analyse de fichiers
          console.log('Analyzing files');
          const result = await analyzeFiles(event);
          console.log('Analysis result:', result);
          
          if (result.error) {
            return sendError(400, result.error);
          }
          
          return sendResponse(200, result);
        } catch (error) {
          console.error('Error in POST handler:', error);
          return sendError(400, error);
        }

      case 'PUT':
        console.log('Processing PUT request');
        try {
          const updatedTemplates = await updateTemplate(event);
          return sendResponse(200, updatedTemplates);
        } catch (error) {
          console.error('Error in PUT handler:', error);
          return sendError(400, error);
        }

      default:
        return sendError(405, 'Method not allowed');
    }
  } catch (error) {
    console.error('Error in handler:', error);
    return sendError(500, error);
  }
}; 