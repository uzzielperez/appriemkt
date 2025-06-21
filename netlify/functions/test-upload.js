const multipart = require('lambda-multipart-parser');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Test upload handler called');
    console.log('Event body type:', typeof event.body);
    console.log('Content-Type:', event.headers['content-type'] || event.headers['Content-Type']);
    
    // Parse multipart form data
    const result = await multipart.parse(event);
    console.log('Parsed result keys:', Object.keys(result));
    
    if (!result.document) {
      console.log('Available fields:', Object.keys(result));
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No document provided',
          availableFields: Object.keys(result)
        }),
      };
    }

    const file = result.document;
    const message = result.message || 'Test upload successful';
    
    console.log('File info:', {
      filename: file.filename,
      contentType: file.contentType,
      size: file.content ? file.content.length : 'undefined'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'File uploaded successfully (test mode)',
        fileInfo: {
          filename: file.filename,
          contentType: file.contentType,
          size: file.content ? file.content.length : 0
        }
      }),
    };

  } catch (error) {
    console.error('Test handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      }),
    };
  }
}; 