// Predefined templates
let templates = [
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

exports.handler = async function(event, context) {
  // Log request details
  console.log('Function called:', event.path);
  console.log('HTTP method:', event.httpMethod);
  console.log('Request body:', event.body);
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Handle GET request
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templates)
    };
  }

  // Handle POST request (create template)
  if (event.httpMethod === 'POST') {
    try {
      const newTemplate = JSON.parse(event.body);
      
      // Validate required fields
      const requiredFields = ['name', 'track_column', 'artist_column', 'revenue_column', 'date_column'];
      const missingFields = requiredFields.filter(field => !newTemplate[field]);
      
      if (missingFields.length > 0) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: `Missing required fields: ${missingFields.join(', ')}`
          })
        };
      }

      // Check if template with same name exists
      const existingTemplate = templates.find(t => t.name === newTemplate.name);
      if (existingTemplate) {
        return {
          statusCode: 409,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: `Template with name "${newTemplate.name}" already exists`
          })
        };
      }

      // Add new template
      templates.push(newTemplate);

      return {
        statusCode: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTemplate)
      };
    } catch (error) {
      console.error('Error creating template:', error);
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Invalid template data'
        })
      };
    }
  }

  // Handle unsupported methods
  return {
    statusCode: 405,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ error: 'Method not allowed' })
  };
}; 