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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

// Fonction pour analyser les fichiers
const analyzeFiles = async (event) => {
  console.log('Analyzing files from event:', event);
  
  // Données de test avec le bon format
  return {
    summary: {
      totalFiles: 1,
      totalRecords: 100,
      totalRevenue: 1000.00,
      totalArtistRevenue: 700.00,
      uniqueTracks: ["Track 1", "Track 2", "Track 3"],
      uniqueArtists: ["Artist 1", "Artist 2"],
      uniquePeriods: ["2024-01", "2024-02"]
    },
    processedFiles: [{
      filename: "test.csv",
      records: 100,
      revenue: 1000.00,
      status: "success"
    }]
  };
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
        // Analyse des fichiers
        const result = await analyzeFiles(event);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(result)
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