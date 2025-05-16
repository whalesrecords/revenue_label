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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Fonction pour analyser les fichiers
const analyzeFiles = async (files) => {
  // Pour le moment, retournons des données de test
  return {
    summary: {
      totalFiles: files.length,
      totalRecords: 100,
      totalRevenue: "1000.00 EUR",
      totalArtistRevenue: "700.00 EUR",
      uniqueTracks: 50,
      uniqueArtists: 20,
      uniquePeriods: 12
    },
    processedFiles: files.map(file => ({
      filename: file.filename,
      records: 100,
      revenue: "1000.00 EUR",
      status: "success"
    }))
  };
};

exports.handler = async (event, context) => {
  // Log pour le débogage
  console.log('Event path:', event.path);
  console.log('HTTP method:', event.httpMethod);
  console.log('Headers:', event.headers);

  // Gestion des requêtes OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

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
      try {
        // Pour le test, simulons une analyse réussie
        const result = await analyzeFiles([
          { filename: "test1.csv" },
          { filename: "test2.csv" }
        ]);

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(result)
        };
      } catch (error) {
        console.error('Error in analyze:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            error: error.message || 'Internal server error'
          })
        };
      }

    default:
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
  }
}; 