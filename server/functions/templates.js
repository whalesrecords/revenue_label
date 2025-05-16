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
  }
};

exports.handler = async (event, context) => {
  // Log the request
  console.log('Templates function called:', {
    method: event.httpMethod,
    path: event.path
  });

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const templateArray = Object.entries(predefinedTemplates).map(([name, template]) => ({
      name,
      ...template
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(templateArray)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
}; 