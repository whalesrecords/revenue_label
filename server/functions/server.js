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
  
  try {
    if (!event.body) {
      throw new Error('No files provided');
    }

    // Parse the multipart form data
    const formData = event.body;
    const files = formData.files || [];
    const templateName = formData.template;

    if (!files.length) {
      throw new Error('No files found in request');
    }

    // Find the selected template
    const template = templates.find(t => t.name === templateName);
    if (!template) {
      throw new Error('Template not found');
    }

    let totalRevenue = 0;
    let totalArtistRevenue = 0;
    let totalRecords = 0;
    const uniqueTracks = new Set();
    const uniqueArtists = new Set();
    const uniquePeriods = new Set();
    const processedFiles = [];

    // Process each file
    for (const file of files) {
      const fileContent = file.toString('utf-8');
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      // Validate required columns exist
      const columnIndexes = {
        track: headers.indexOf(template.track_column),
        artist: headers.indexOf(template.artist_column),
        revenue: headers.indexOf(template.revenue_column),
        date: headers.indexOf(template.date_column)
      };

      for (const [field, index] of Object.entries(columnIndexes)) {
        if (index === -1) {
          throw new Error(`Required column ${field} not found in file ${file.name}`);
        }
      }

      let fileRevenue = 0;
      let fileRecords = 0;

      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        
        const track = values[columnIndexes.track];
        const artist = values[columnIndexes.artist];
        const revenue = parseFloat(values[columnIndexes.revenue]) || 0;
        const date = values[columnIndexes.date];

        if (track) uniqueTracks.add(track);
        if (artist) uniqueArtists.add(artist);
        if (date) {
          // Normalize date to YYYY-MM format
          const dateObj = new Date(date);
          if (!isNaN(dateObj.getTime())) {
            const period = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            uniquePeriods.add(period);
          }
        }

        fileRevenue += revenue;
        fileRecords++;
      }

      totalRevenue += fileRevenue;
      totalRecords += fileRecords;
      // Assuming artist revenue is 70% of total revenue
      totalArtistRevenue += fileRevenue * 0.7;

      processedFiles.push({
        filename: file.name,
        records: fileRecords,
        revenue: fileRevenue,
        status: 'success'
      });
    }

    return {
      summary: {
        totalFiles: files.length,
        totalRecords,
        totalRevenue,
        totalArtistRevenue,
        uniqueTracks: Array.from(uniqueTracks),
        uniqueArtists: Array.from(uniqueArtists),
        uniquePeriods: Array.from(uniquePeriods)
      },
      processedFiles
    };
  } catch (error) {
    console.error('Error analyzing files:', error);
    throw new Error('Failed to analyze files: ' + error.message);
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
  console.log('Body:', event.body);

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