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
  'Content-Type': 'application/json'
};

// Fonction pour analyser les fichiers
const analyzeFiles = async (event) => {
  console.log('Analyzing files from event:', event);
  console.log('Event body:', event.body);
  console.log('Event headers:', event.headers);
  
  try {
    if (!event.body) {
      throw new Error('No data provided');
    }

    // Since we're receiving multipart/form-data, the body will be a Buffer
    // We need to parse it properly
    const body = Buffer.from(event.body, 'base64');
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const parts = body.toString().split('--' + boundary);
    
    const files = [];
    let selectedTemplate = null;

    // Parse multipart form data
    for (const part of parts) {
      if (part.includes('name="files"')) {
        const fileContent = part.split('\r\n\r\n')[1];
        if (fileContent) {
          files.push(fileContent);
        }
      } else if (part.includes('name="template"')) {
        selectedTemplate = part.split('\r\n\r\n')[1].trim();
      }
    }

    console.log('Parsed files:', files.length);
    console.log('Selected template:', selectedTemplate);

    if (!files.length) {
      return {
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
        error: 'No files found in request'
      };
    }

    if (!selectedTemplate) {
      return {
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
        error: 'No template selected'
      };
    }

    // Find the selected template
    const template = templates.find(t => t.name === selectedTemplate);
    if (!template) {
      return {
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
        error: `Template "${selectedTemplate}" not found`
      };
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
    for (let i = 0; i < files.length; i++) {
      try {
        const fileContent = files[i];
        const lines = fileContent.split('\n');
        
        if (lines.length < 2) {
          errors.push(`File ${i + 1} is empty or invalid`);
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
          errors.push(`Missing required columns in file ${i + 1}: ${missingColumns.join(', ')}`);
          continue;
        }

        let fileRevenue = 0;
        let fileRecords = 0;
        let fileErrors = [];

        // Process each data row
        for (let j = 1; j < lines.length; j++) {
          const line = lines[j].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim());
          
          if (values.length !== headers.length) {
            fileErrors.push(`Line ${j}: Invalid number of columns`);
            continue;
          }

          const track = values[columnIndexes.track];
          const artist = values[columnIndexes.artist];
          const revenue = parseFloat(values[columnIndexes.revenue].replace(/[^0-9.-]+/g, '')) || 0;
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
              fileErrors.push(`Line ${j}: Invalid date format: ${date}`);
            }
          }

          fileRevenue += revenue;
          fileRecords++;
        }

        totalRevenue += fileRevenue;
        totalRecords += fileRecords;
        totalArtistRevenue += fileRevenue * 0.7;

        processedFiles.push({
          filename: `File ${i + 1}`,
          records: fileRecords,
          revenue: fileRevenue,
          status: fileErrors.length > 0 ? 'partial' : 'success',
          errors: fileErrors
        });
      } catch (error) {
        console.error(`Error processing file ${i + 1}:`, error);
        errors.push(`Error processing file ${i + 1}: ${error.message}`);
      }
    }

    return {
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
  } catch (error) {
    console.error('Error analyzing files:', error);
    return {
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
      error: error.message || 'Internal server error'
    };
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

exports.handler = async (event, context) => {
  // Log pour le débogage
  console.log('Event path:', event.path);
  console.log('HTTP method:', event.httpMethod);
  console.log('Headers:', event.headers);
  console.log('Body size:', event.body ? Buffer.from(event.body, 'base64').length : 0);

  // Augmenter la limite de taille du payload si nécessaire
  const maxPayloadSize = process.env.MAX_PAYLOAD_SIZE || '100mb';
  if (event.body && Buffer.from(event.body, 'base64').length > parseInt(maxPayloadSize)) {
    return {
      statusCode: 413,
      headers: corsHeaders,
      body: JSON.stringify({
        error: `File size exceeds limit of ${maxPayloadSize}`
      })
    };
  }

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
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(templates)
        };

      case 'POST':
        // Si le chemin contient "template", c'est une mise à jour de template
        if (event.path.includes('template')) {
          const updatedTemplates = await updateTemplate(event);
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(updatedTemplates)
          };
        }
        
        // Sinon, c'est une analyse de fichiers
        const result = await analyzeFiles(event);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(result)
        };

      case 'PUT':
        // Mise à jour d'un template
        const updatedTemplates = await updateTemplate(event);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(updatedTemplates)
        };

      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || 'Internal server error'
      })
    };
  }
}; 