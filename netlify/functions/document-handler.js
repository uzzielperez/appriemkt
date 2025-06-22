const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Enhanced PDF text extraction function
function extractTextFromPDF(buffer) {
  try {
    console.log('Starting PDF text extraction, buffer size:', buffer.length);
    
    // Convert to different encodings to find readable text
    const pdfString = buffer.toString('latin1');
    const pdfUtf8 = buffer.toString('utf8');
    const pdfAscii = buffer.toString('ascii');
    
    let extractedText = '';
    
    // Strategy 1: Look for text between parentheses (most common in PDFs)
    console.log('Trying parentheses text extraction...');
    const parenthesesPattern = /\(([^)]{3,}?)\)/g;
    const parenthesesMatches = pdfString.match(parenthesesPattern);
    if (parenthesesMatches) {
      console.log('Found', parenthesesMatches.length, 'parentheses matches');
      parenthesesMatches.forEach(match => {
        const text = match.replace(/[()]/g, '').trim();
        // Filter out obvious binary/control data
        if (text.length > 2 && 
            /[a-zA-Z]/.test(text) && 
            !text.includes('endobj') && 
            !text.includes('stream') &&
            !text.includes('/Type') &&
            !text.includes('/Filter') &&
            !/^[0-9\s\.\-]+$/.test(text) && // Skip pure numbers
            text.split('').filter(c => c.charCodeAt(0) > 126 || c.charCodeAt(0) < 32).length < text.length * 0.3) {
          extractedText += text + ' ';
        }
      });
    }
    
    // Strategy 2: Look for readable text in stream objects
    console.log('Trying stream text extraction...');
    const streamPattern = /stream\s*([\s\S]*?)\s*endstream/g;
    let streamMatch;
    while ((streamMatch = streamPattern.exec(pdfString)) !== null) {
      const streamContent = streamMatch[1];
      // Look for readable text within streams
      const readableText = streamContent.match(/[a-zA-Z][a-zA-Z0-9\s\.,!?;:\-]{4,}/g);
      if (readableText) {
        readableText.forEach(text => {
          const cleanText = text.trim();
          if (cleanText.length > 3 && !extractedText.includes(cleanText)) {
            extractedText += cleanText + ' ';
          }
        });
      }
    }
    
    // Strategy 3: Look for text objects with Tj or TJ operators
    console.log('Trying text object extraction...');
    const textObjectPatterns = [
      /BT\s*([\s\S]*?)\s*ET/g, // Text objects
      /\[([^\]]+)\]\s*TJ/g,    // Array text positioning
      /\(([^)]+)\)\s*Tj/g      // Simple text showing
    ];
    
    textObjectPatterns.forEach((pattern, index) => {
      const matches = pdfString.match(pattern);
      if (matches) {
        console.log(`Text object pattern ${index + 1} found ${matches.length} matches`);
        matches.forEach(match => {
          // Extract text from within the match
          const textMatches = match.match(/\(([^)]+)\)/g);
          if (textMatches) {
            textMatches.forEach(textMatch => {
              const text = textMatch.replace(/[()]/g, '').trim();
              if (text.length > 2 && /[a-zA-Z]/.test(text) && 
                  !text.includes('/') && 
                  !extractedText.includes(text)) {
                extractedText += text + ' ';
              }
            });
          }
        });
      }
    });
    
    // Strategy 4: Fallback - look for any readable ASCII sequences
    if (extractedText.length < 100) {
      console.log('Trying ASCII fallback extraction...');
      const asciiPattern = /[A-Za-z][A-Za-z0-9\s\.,!?;:\-'"]{8,}/g;
      const asciiMatches = pdfString.match(asciiPattern);
      if (asciiMatches) {
        console.log('Found', asciiMatches.length, 'ASCII sequences');
        asciiMatches.forEach(match => {
          const text = match.trim();
          // Filter out PDF commands and metadata
          if (!text.includes('endobj') && 
              !text.includes('Mozilla') && 
              !text.includes('Windows NT') &&
              !text.includes('/Type') &&
              !text.includes('stream') &&
              !text.includes('BitsPerComponent') &&
              text.length > 5 &&
              !extractedText.includes(text)) {
            extractedText += text + ' ';
          }
        });
      }
    }
    
    // Strategy 5: Try UTF-8 encoding for international text
    if (extractedText.length < 50) {
      console.log('Trying UTF-8 text extraction...');
      const utf8Parentheses = pdfUtf8.match(/\(([^)]{3,}?)\)/g);
      if (utf8Parentheses) {
        utf8Parentheses.forEach(match => {
          const text = match.replace(/[()]/g, '').trim();
          if (text.length > 2 && /[a-zA-Z]/.test(text) && !extractedText.includes(text)) {
            extractedText += text + ' ';
          }
        });
      }
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ')  // Remove non-printable chars but keep unicode
      .trim();
    
    console.log('Final extracted text length:', extractedText.length);
    console.log('First 300 chars:', extractedText.substring(0, 300));
    
    if (extractedText.length < 50) {
      console.log('Insufficient readable text extracted, returning helpful message');
      return `I detected this PDF but could only extract ${extractedText.length} characters of readable text.

${extractedText ? `Extracted text: "${extractedText}"` : ''}

This PDF likely contains:
- Scanned images instead of selectable text
- Heavily compressed or encoded text streams
- Complex formatting that requires specialized PDF parsing

To analyze this document, please:
1. Copy and paste the text content directly from the PDF
2. Convert the PDF to plain text using a PDF reader
3. Describe the document contents and ask specific questions

I can help analyze the document once I have the readable text content.`;
    }
    
    console.log('Successfully extracted', extractedText.length, 'characters of readable text');
    return extractedText;

  } catch (error) {
    console.error('PDF extraction error:', error);
    return `Error extracting text from PDF: ${error.message}

Please try:
1. Copying text directly from the PDF
2. Converting to a text file
3. Describing the document contents

I can help analyze the document with the text content.`;
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