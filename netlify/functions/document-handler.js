const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Simple multipart parser for basic file uploads
function parseMultipart(body, boundary) {
  const parts = body.split(`--${boundary}`);
  const result = {};
  
  for (const part of parts) {
    if (part.includes('Content-Disposition: form-data')) {
      const lines = part.split('\r\n');
      let name = '';
      let filename = '';
      let contentType = '';
      let content = '';
      
      // Parse headers
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Content-Disposition')) {
          const nameMatch = line.match(/name="([^"]+)"/);
          const filenameMatch = line.match(/filename="([^"]+)"/);
          if (nameMatch) name = nameMatch[1];
          if (filenameMatch) filename = filenameMatch[1];
        }
        if (line.includes('Content-Type')) {
          contentType = line.split(': ')[1];
        }
        if (line === '' && i < lines.length - 1) {
          // Content starts after empty line
          content = lines.slice(i + 1, -1).join('\r\n');
          break;
        }
      }
      
      if (name === 'document' && filename) {
        result.document = {
          filename,
          contentType,
          content: Buffer.from(content, 'binary')
        };
      } else if (name === 'message') {
        result.message = content;
      }
    }
  }
  
  return result;
}

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
    console.log('Document handler called');
    console.log('Event body type:', typeof event.body);
    console.log('Content-Type:', event.headers['content-type'] || event.headers['Content-Type']);
    
    // Check if we have a body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No body provided' }),
      };
    }

    // Parse multipart form data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No boundary found in content-type' }),
      };
    }

    const result = parseMultipart(event.body, boundary);
    console.log('Parsed result keys:', Object.keys(result));
    
    if (!result.document) {
      console.log('Available fields:', Object.keys(result));
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No document provided' }),
      };
    }

    const file = result.document;
    const message = result.message || 'Please analyze this document';
    
    console.log('File info:', {
      filename: file.filename,
      contentType: file.contentType,
      size: file.content ? file.content.length : 'undefined'
    });

    let documentText = '';

    // Parse document based on content type
    try {
      if (file.contentType === 'application/pdf') {
        console.log('PDF parsing temporarily disabled - will add support soon');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            analysis: `I see you've uploaded a PDF file named "${file.filename}". 

PDF parsing is temporarily disabled due to technical limitations in our serverless environment. 

Here are your options:
1. **Convert to text**: Copy the text content from your PDF and paste it directly into the chat
2. **Use a text file**: Save your content as a .txt file and upload that instead
3. **Wait for PDF support**: We're working on implementing proper PDF parsing and it will be available soon

For now, you can ask me questions about medical topics directly in the chat, or upload text files for analysis.`,
            documentInfo: {
              filename: file.filename,
              contentType: file.contentType,
              textLength: 0,
              note: "PDF parsing temporarily unavailable"
            }
          }),
        };
      } else if (file.contentType === 'text/plain') {
        console.log('Parsing text file...');
        documentText = file.content.toString('utf-8');
      } else if (file.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log('DOCX files not yet supported - extracting basic text');
        documentText = file.content.toString('utf-8').replace(/[^\x20-\x7E]/g, ' ');
      } else if (file.contentType === 'application/msword') {
        console.log('DOC files not yet supported - extracting basic text');
        documentText = file.content.toString('utf-8').replace(/[^\x20-\x7E]/g, ' ');
      } else {
        console.log('Unsupported file type:', file.contentType);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Unsupported file type: ${file.contentType}. Currently supported: .txt files. PDF support coming soon.` 
          }),
        };
      }
    } catch (parseError) {
      console.error('Document parsing error:', parseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to parse document', details: parseError.message }),
      };
    }

    console.log('Extracted text length:', documentText.length);

    if (!documentText.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No text content found in document' }),
      };
    }

    // Limit text length for API call (approximately 8000 characters)
    const maxLength = 8000;
    if (documentText.length > maxLength) {
      documentText = documentText.substring(0, maxLength) + '...[truncated]';
    }

    // Create analysis prompt
    const prompt = `${message}

Document content:
${documentText}

Please provide a comprehensive analysis of this document, including:
1. Main topics and key points
2. Important findings or conclusions
3. Any medical/clinical relevance (if applicable)
4. Summary of key information

Analysis:`;

    console.log('Calling Groq API...');

    // Check if Groq API key is available
    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Groq API key not configured' }),
      };
    }

    // Get AI analysis using Groq
    const response = await groq.chat.completions.create({
      messages: [{
        role: 'user',
        content: prompt
      }],
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 2000,
    });

    const analysis = response.choices[0].message.content;

    console.log('Analysis completed, length:', analysis.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        analysis: analysis,
        documentInfo: {
          filename: file.filename,
          contentType: file.contentType,
          textLength: documentText.length
        }
      }),
    };

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
    };
  }
}; 