const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Enhanced PDF text extraction function
function extractTextFromPDF(buffer) {
  try {
    console.log('Starting PDF text extraction, buffer size:', buffer.length);
    const pdfString = buffer.toString('latin1');
    
    // Multiple extraction strategies
    const textPatterns = [
      /BT\s*\/\w+\s+\d+\s+Tf\s*(.+?)\s*ET/g,
      /\(([^)]+)\)\s*Tj/g,
      /\[([^\]]+)\]\s*TJ/g,
      /\/Length\s+\d+[^>]*>\s*stream\s*(.+?)\s*endstream/gs,
      // Additional patterns for different PDF structures
      /\(\s*([^)]{2,})\s*\)\s*TJ/g,
      /\[\s*\(([^)]+)\)\s*\]\s*TJ/g
    ];
    
    let extractedText = '';
    let totalMatches = 0;

    console.log('Trying pattern-based extraction...');
    for (let i = 0; i < textPatterns.length; i++) {
      const pattern = textPatterns[i];
      const matches = pdfString.match(pattern);
      if (matches) {
        console.log(`Pattern ${i + 1} found ${matches.length} matches`);
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

    console.log('Pattern extraction found', totalMatches, 'total matches');

    // Alternative: Look for readable text between parentheses (more comprehensive)
    console.log('Trying parentheses-based extraction...');
    const textInParens = pdfString.match(/\(([^)]{2,})\)/g);
    if (textInParens) {
      console.log('Found', textInParens.length, 'parentheses matches');
      textInParens.forEach(match => {
        const text = match.replace(/[()]/g, '').trim();
        if (text.length > 2 && /[a-zA-Z]/.test(text)) {
          extractedText += text + ' ';
        }
      });
    }

    // Try to extract any readable ASCII text
    console.log('Trying ASCII text extraction...');
    const asciiMatches = pdfString.match(/[a-zA-Z][a-zA-Z0-9\s,.!?;:-]{3,}/g);
    if (asciiMatches && extractedText.length < 100) {
      console.log('Found', asciiMatches.length, 'ASCII text segments');
      asciiMatches.forEach(match => {
        const cleanText = match.trim();
        if (cleanText.length > 3 && !extractedText.includes(cleanText)) {
          extractedText += cleanText + ' ';
        }
      });
    }

    // Clean up final text
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    console.log('Final extracted text length:', extractedText.length);
    console.log('First 200 chars:', extractedText.substring(0, 200));

    if (extractedText.length < 20) {
      console.log('Insufficient text extracted, returning fallback message');
      return `I detected this is a PDF file but extracted limited text content (${extractedText.length} characters). 

Extracted text: "${extractedText}"

This might be because:
1. The PDF contains scanned images rather than selectable text
2. The PDF has complex formatting or encoding
3. The document is password protected

Please try:
- Copying and pasting text directly from the PDF
- Converting to a text file
- Describing the document contents

I can still help analyze the document if you provide the text content.`;
    }

    console.log('Successfully extracted', extractedText.length, 'characters');
    return extractedText;

  } catch (error) {
    console.error('PDF extraction error:', error);
    return `I encountered an error extracting text from this PDF: ${error.message}

Please try:
1. Copying text directly from the PDF and pasting it
2. Converting the PDF to a text file  
3. Describing the document contents

I can still help analyze the document with the text content.`;
  }
}

// Enhanced multipart parser
function parseMultipart(buffer, boundary) {
  try {
    console.log('Parsing multipart with boundary:', boundary);
    console.log('Buffer size:', buffer.length);
    
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
    
    console.log('Found', parts.length, 'multipart sections');
    
    const result = {};
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partString = part.toString('binary');
      
      if (partString.includes('Content-Disposition: form-data')) {
        const headerEndIndex = partString.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) continue;
        
        const headers = partString.substring(0, headerEndIndex);
        const contentStart = headerEndIndex + 4;
        const content = part.slice(contentStart, -2); // Remove trailing \r\n
        
        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
        
        const name = nameMatch?.[1];
        const filename = filenameMatch?.[1];
        const contentType = contentTypeMatch?.[1];
        
        console.log(`Part ${i}: name=${name}, filename=${filename}, contentType=${contentType}, size=${content.length}`);
        
        if (name === 'document' && filename) {
          result.document = { filename, contentType, content };
        } else if (name === 'message') {
          result.message = content.toString('utf-8');
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Multipart parsing error:', error);
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
    console.log('=== Document Handler Called ===');
    console.log('Event body type:', typeof event.body);
    console.log('Event body length:', event.body ? event.body.length : 'undefined');
    console.log('Content-Type:', event.headers['content-type'] || event.headers['Content-Type']);
    console.log('Is base64 encoded:', event.isBase64Encoded);

    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No body provided' }) };
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType?.includes('multipart/form-data')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }) };
    }

    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No boundary found in content-type' }) };
    }

    const boundary = boundaryMatch[1];
    const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'binary');

    const result = parseMultipart(bodyBuffer, boundary);

    if (!result.document) {
      console.log('No document found in parsed result');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No document found in upload' }) };
    }

    const file = result.document;
    const message = result.message || 'Please analyze this document';
    
    console.log('Processing file:', file.filename, 'Type:', file.contentType, 'Size:', file.content.length);
    
    let documentText = '';

    try {
      if (file.contentType === 'application/pdf') {
        console.log('Processing PDF file...');
        documentText = extractTextFromPDF(file.content);
      } else if (file.contentType === 'text/plain') {
        console.log('Processing text file...');
        documentText = file.content.toString('utf-8');
      } else if (
        file.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.contentType === 'application/msword'
      ) {
        console.log('Processing Word document...');
        documentText = file.content.toString('utf-8').replace(/[^\x20-\x7E]/g, ' ');
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: `Unsupported file type: ${file.contentType}. Currently supported: .txt and .pdf files.`,
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

    console.log('Document text extracted, length:', documentText.length);

    if (!documentText.trim()) {
      console.log('No text content found in document');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No text content found in document' }),
      };
    }

    // Limit text length for API call
    const maxLength = 8000;
    if (documentText.length > maxLength) {
      console.log('Truncating document text from', documentText.length, 'to', maxLength);
      documentText = documentText.substring(0, maxLength) + '...[truncated]';
    }

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

    console.log('Calling Groq API with prompt length:', prompt.length);

    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Groq API key not configured' }),
      };
    }

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful medical AI assistant. Provide accurate, evidence-based medical information.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'allam-2-7b',
      temperature: 0.7,
      max_tokens: 2000,
    });

    const analysis = response.choices[0].message.content;
    console.log('Analysis completed, length:', analysis.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        analysis,
        documentInfo: {
          filename: file.filename,
          contentType: file.contentType,
          textLength: documentText.length,
        },
      }),
    };

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}; 