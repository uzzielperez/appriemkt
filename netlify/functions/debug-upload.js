const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Enhanced PDF text extraction function (same as document-handler)
function extractTextFromPDF(buffer) {
  try {
    console.log('Starting PDF text extraction, buffer size:', buffer.length);
    const pdfString = buffer.toString('latin1');
    
    const textPatterns = [
      /BT\s*\/\w+\s+\d+\s+Tf\s*(.+?)\s*ET/g,
      /\(([^)]+)\)\s*Tj/g,
      /\[([^\]]+)\]\s*TJ/g,
      /\/Length\s+\d+[^>]*>\s*stream\s*(.+?)\s*endstream/gs,
      /\(\s*([^)]{2,})\s*\)\s*TJ/g,
      /\[\s*\(([^)]+)\)\s*\]\s*TJ/g
    ];
    
    let extractedText = '';
    let totalMatches = 0;

    for (let i = 0; i < textPatterns.length; i++) {
      const pattern = textPatterns[i];
      const matches = pdfString.match(pattern);
      if (matches) {
        totalMatches += matches.length;
        matches.forEach(match => {
          let text = match.replace(/BT|ET|Tj|TJ|\[|\]|\(|\)/g, '');
          text = text.replace(/\/\w+\s+\d+\s+Tf/g, '');
          text = text.replace(/[^\x20-\x7E\s]/g, ' ');
          text = text.replace(/\s+/g, ' ').trim();
          if (text.length > 2) {
            extractedText += text + ' ';
          }
        });
      }
    }

    const textInParens = pdfString.match(/\(([^)]{2,})\)/g);
    if (textInParens) {
      textInParens.forEach(match => {
        const text = match.replace(/[()]/g, '').trim();
        if (text.length > 2 && /[a-zA-Z]/.test(text)) {
          extractedText += text + ' ';
        }
      });
    }

    const asciiMatches = pdfString.match(/[a-zA-Z][a-zA-Z0-9\s,.!?;:-]{3,}/g);
    if (asciiMatches && extractedText.length < 100) {
      asciiMatches.forEach(match => {
        const cleanText = match.trim();
        if (cleanText.length > 3 && !extractedText.includes(cleanText)) {
          extractedText += cleanText + ' ';
        }
      });
    }

    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    return extractedText;

  } catch (error) {
    console.error('PDF extraction error:', error);
    return `Error extracting PDF: ${error.message}`;
  }
}

// Simple multipart parser
function parseMultipart(buffer, boundary) {
  try {
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = 0;
    let end = buffer.indexOf(boundaryBuffer, start);
    
    while (end !== -1) {
      if (start !== 0) {
        parts.push(buffer.slice(start, end));
      }
      start = end + boundaryBuffer.length;
      end = buffer.indexOf(boundaryBuffer, start);
    }
    
    const result = {};
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partString = part.toString('binary');
      
      if (partString.includes('Content-Disposition: form-data')) {
        const headerEndIndex = partString.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) continue;
        
        const headers = partString.substring(0, headerEndIndex);
        const contentStart = headerEndIndex + 4;
        const content = part.slice(contentStart, -2);
        
        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
        
        const name = nameMatch?.[1];
        const filename = filenameMatch?.[1];
        const contentType = contentTypeMatch?.[1];
        
        if (name === 'document' && filename) {
          result.document = { filename, contentType, content };
        } else if (name === 'message') {
          result.message = content.toString('utf-8');
        }
      }
    }
    
    return result;
  } catch (error) {
    throw new Error(`Failed to parse multipart data: ${error.message}`);
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No body provided' }) };
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType?.includes('multipart/form-data')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }) };
    }

    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No boundary found' }) };
    }

    const boundary = boundaryMatch[1];
    const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'binary');

    const result = parseMultipart(bodyBuffer, boundary);

    if (!result.document) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No document found' }) };
    }

    const file = result.document;
    const message = result.message || 'Please analyze this document';
    
    let documentText = '';

    if (file.contentType === 'application/pdf') {
      documentText = extractTextFromPDF(file.content);
    } else if (file.contentType === 'text/plain') {
      documentText = file.content.toString('utf-8');
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Unsupported file type: ${file.contentType}` }),
      };
    }

    if (!documentText.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No text content found' }),
      };
    }

    // Limit text for debugging
    const maxLength = 2000; // Shorter for debugging
    let truncatedText = documentText;
    if (documentText.length > maxLength) {
      truncatedText = documentText.substring(0, maxLength) + '...[truncated]';
    }

    const prompt = `${message}

Document: ${file.filename}
Content:
${truncatedText}

Please provide a comprehensive analysis of this document.`;

    // Return debug information instead of calling AI
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        debug: true,
        filename: file.filename,
        contentType: file.contentType,
        originalTextLength: documentText.length,
        truncatedTextLength: truncatedText.length,
        extractedTextPreview: documentText.substring(0, 500),
        promptPreview: prompt.substring(0, 800),
        fullPrompt: prompt,
        message: message
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}; 