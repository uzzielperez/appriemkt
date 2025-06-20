const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Simple PDF text extraction function
function extractTextFromPDF(buffer) {
  try {
    // Convert buffer to string and look for text content
    const pdfString = buffer.toString('latin1');
    
    // Simple regex patterns to extract text from PDF
    const textPatterns = [
      /BT\s*\/\w+\s+\d+\s+Tf\s*(.+?)\s*ET/g,
      /\(([^)]+)\)\s*Tj/g,
      /\[([^\]]+)\]\s*TJ/g,
      /\/Length\s+\d+[^>]*>\s*stream\s*(.+?)\s*endstream/gs
    ];
    
    let extractedText = '';
    
    // Try different extraction methods
    for (const pattern of textPatterns) {
      const matches = pdfString.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Clean up the extracted text
          let text = match.replace(/BT|ET|Tj|TJ|\[|\]|\(|\)/g, '');
          text = text.replace(/\/\w+\s+\d+\s+Tf/g, '');
          text = text.replace(/[^\x20-\x7E\s]/g, ' ');
          text = text.replace(/\s+/g, ' ').trim();
          if (text.length > 3) {
            extractedText += text + ' ';
          }
        });
      }
    }
    
    // Alternative: Look for readable text between parentheses
    const textInParens = pdfString.match(/\(([^)]{3,})\)/g);
    if (textInParens) {
      textInParens.forEach(match => {
        const text = match.replace(/[()]/g, '').trim();
        if (text.length > 3 && /[a-zA-Z]/.test(text)) {
          extractedText += text + ' ';
        }
      });
    }
    
    // Clean up final text
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    if (extractedText.length < 50) {
      // If we couldn't extract much text, return a helpful message
      return `I was able to detect this is a PDF file, but I had difficulty extracting the text content. This might be because:

1. The PDF contains scanned images rather than selectable text
2. The PDF has complex formatting or is password protected
3. The text extraction method needs improvement

To get better results, you could:
- Copy and paste the text directly from the PDF into the chat
- Convert the PDF to a text file
- Use a PDF with selectable text rather than scanned images

I can still help answer questions about the document if you describe its contents or paste relevant sections.`;
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return `I encountered an error while trying to extract text from this PDF. This might be due to the PDF format or encoding. 

Please try:
1. Copying the text directly from the PDF and pasting it into the chat
2. Converting the PDF to a text file
3. Describing the document contents so I can help answer your questions

Error details: ${error.message}`;
  }
}

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
        console.log('Parsing PDF with custom extractor...');
        documentText = extractTextFromPDF(file.content);
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
            error: `Unsupported file type: ${file.contentType}. Currently supported: .txt and .pdf files.` 
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

Document: ${file.filename}
Content:
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