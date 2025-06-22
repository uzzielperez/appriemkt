const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Simple PDF text extraction function
function extractTextFromPDF(buffer) {
  try {
    const pdfString = buffer.toString('latin1');
    const textPatterns = [
      /BT\s*\/\w+\s+\d+\s+Tf\s*(.+?)\s*ET/g,
      /\(([^)]+)\)\s*Tj/g,
      /\[([^\]]+)\]\s*TJ/g,
      /\/Length\s+\d+[^>]*>\s*stream\s*(.+?)\s*endstream/gs
    ];
    
    let extractedText = '';

    for (const pattern of textPatterns) {
      const matches = pdfString.match(pattern);
      if (matches) {
        matches.forEach(match => {
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

    const textInParens = pdfString.match(/\(([^)]{3,})\)/g);
    if (textInParens) {
      textInParens.forEach(match => {
        const text = match.replace(/[()]/g, '').trim();
        if (text.length > 3 && /[a-zA-Z]/.test(text)) {
          extractedText += text + ' ';
        }
      });
    }

    extractedText = extractedText.replace(/\s+/g, ' ').trim();

    if (extractedText.length < 50) {
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

function parseMultipart(buffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = buffer.toString().split(boundaryBuffer.toString());

  const result = {};
  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;

    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headerPart = part.slice(0, headerEnd);
    const contentPart = part.slice(headerEnd + 4).trimEnd();

    const nameMatch = headerPart.match(/name="([^"]+)"/);
    const filenameMatch = headerPart.match(/filename="([^"]+)"/);
    const contentTypeMatch = headerPart.match(/Content-Type:\s*([^\r\n]+)/);

    const name = nameMatch?.[1];
    const filename = filenameMatch?.[1];
    const contentType = contentTypeMatch?.[1];

    const content = Buffer.from(contentPart, 'binary');

    if (name === 'document' && filename) {
      result.document = { filename, contentType, content };
    } else if (name === 'message') {
      result.message = content.toString('utf-8');
    }
  }

  return result;
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
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No boundary found in content-type' }) };
    }

    const boundary = boundaryMatch[1];
    const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf-8');

    const result = parseMultipart(bodyBuffer, boundary);

    if (!result.document) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No document found in upload' }) };
    }

    const file = result.document;
    const message = result.message || 'Please analyze this document';
    let documentText = '';

    try {
      if (file.contentType === 'application/pdf') {
        documentText = extractTextFromPDF(file.content);
      } else if (file.contentType === 'text/plain') {
        documentText = file.content.toString('utf-8');
      } else if (
        file.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.contentType === 'application/msword'
      ) {
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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to parse document', details: parseError.message }),
      };
    }

    if (!documentText.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No text content found in document' }),
      };
    }

    const maxLength = 8000;
    if (documentText.length > maxLength) {
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


// const { Groq } = require('groq-sdk');

// // Initialize Groq client
// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// // Simple PDF text extraction function
// function extractTextFromPDF(buffer) {
//   try {
//     // Convert buffer to string and look for text content
//     const pdfString = buffer.toString('latin1');
    
//     // Simple regex patterns to extract text from PDF
//     const textPatterns = [
//       /BT\s*\/\w+\s+\d+\s+Tf\s*(.+?)\s*ET/g,
//       /\(([^)]+)\)\s*Tj/g,
//       /\[([^\]]+)\]\s*TJ/g,
//       /\/Length\s+\d+[^>]*>\s*stream\s*(.+?)\s*endstream/gs
//     ];
    
//     let extractedText = '';
    
//     // Try different extraction methods
//     for (const pattern of textPatterns) {
//       const matches = pdfString.match(pattern);
//       if (matches) {
//         matches.forEach(match => {
//           // Clean up the extracted text
//           let text = match.replace(/BT|ET|Tj|TJ|\[|\]|\(|\)/g, '');
//           text = text.replace(/\/\w+\s+\d+\s+Tf/g, '');
//           text = text.replace(/[^\x20-\x7E\s]/g, ' ');
//           text = text.replace(/\s+/g, ' ').trim();
//           if (text.length > 3) {
//             extractedText += text + ' ';
//           }
//         });
//       }
//     }
    
//     // Alternative: Look for readable text between parentheses
//     const textInParens = pdfString.match(/\(([^)]{3,})\)/g);
//     if (textInParens) {
//       textInParens.forEach(match => {
//         const text = match.replace(/[()]/g, '').trim();
//         if (text.length > 3 && /[a-zA-Z]/.test(text)) {
//           extractedText += text + ' ';
//         }
//       });
//     }
    
//     // Clean up final text
//     extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
//     if (extractedText.length < 50) {
//       // If we couldn't extract much text, return a helpful message
//       return `I was able to detect this is a PDF file, but I had difficulty extracting the text content. This might be because:

// 1. The PDF contains scanned images rather than selectable text
// 2. The PDF has complex formatting or is password protected
// 3. The text extraction method needs improvement

// To get better results, you could:
// - Copy and paste the text directly from the PDF into the chat
// - Convert the PDF to a text file
// - Use a PDF with selectable text rather than scanned images

// I can still help answer questions about the document if you describe its contents or paste relevant sections.`;
//     }
    
//     return extractedText;
    
//   } catch (error) {
//     console.error('PDF extraction error:', error);
//     return `I encountered an error while trying to extract text from this PDF. This might be due to the PDF format or encoding. 

// Please try:
// 1. Copying the text directly from the PDF and pasting it into the chat
// 2. Converting the PDF to a text file
// 3. Describing the document contents so I can help answer your questions

// Error details: ${error.message}`;
//   }
// }

// // Improved multipart parser for better binary handling
// function parseMultipart(body, boundary) {
//   try {
//     console.log('Parsing multipart with boundary:', boundary);
    
//     // Convert body to buffer if it's a string
//     const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body, 'binary');
//     const boundaryBuffer = Buffer.from(`--${boundary}`);
    
//     // Split by boundary
//     const parts = [];
//     let start = 0;
//     let end = bodyBuffer.indexOf(boundaryBuffer, start);
    
//     while (end !== -1) {
//       if (start !== 0) { // Skip the first empty part
//         parts.push(bodyBuffer.slice(start, end));
//       }
//       start = end + boundaryBuffer.length;
//       end = bodyBuffer.indexOf(boundaryBuffer, start);
//     }
    
//     const result = {};
    
//     for (const part of parts) {
//       const partString = part.toString('binary');
      
//       if (partString.includes('Content-Disposition: form-data')) {
//         const headerEndIndex = partString.indexOf('\r\n\r\n');
//         if (headerEndIndex === -1) continue;
        
//         const headers = partString.substring(0, headerEndIndex);
//         const contentStart = headerEndIndex + 4;
//         const content = part.slice(contentStart, -2); // Remove trailing \r\n
        
//         // Parse headers
//         let name = '';
//         let filename = '';
//         let contentType = '';
        
//         const nameMatch = headers.match(/name="([^"]+)"/);
//         const filenameMatch = headers.match(/filename="([^"]+)"/);
//         const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
        
//         if (nameMatch) name = nameMatch[1];
//         if (filenameMatch) filename = filenameMatch[1];
//         if (contentTypeMatch) contentType = contentTypeMatch[1];
        
//         if (name === 'document' && filename) {
//           result.document = {
//             filename,
//             contentType,
//             content: content
//           };
//           console.log('Found document:', filename, 'Type:', contentType, 'Size:', content.length);
//         } else if (name === 'message') {
//           result.message = content.toString('utf-8');
//           console.log('Found message:', result.message);
//         }
//       }
//     }
    
//     return result;
//   } catch (error) {
//     console.error('Multipart parsing error:', error);
//     throw new Error(`Failed to parse multipart data: ${error.message}`);
//   }
// }

// exports.handler = async (event, context) => {
//   // Set CORS headers
//   const headers = {
//     'Access-Control-Allow-Origin': '*',
//     'Access-Control-Allow-Headers': 'Content-Type',
//     'Access-Control-Allow-Methods': 'POST, OPTIONS',
//   };

//   // Handle preflight OPTIONS request
//   if (event.httpMethod === 'OPTIONS') {
//     return {
//       statusCode: 200,
//       headers,
//       body: '',
//     };
//   }

//   if (event.httpMethod !== 'POST') {
//     return {
//       statusCode: 405,
//       headers,
//       body: JSON.stringify({ error: 'Method not allowed' }),
//     };
//   }

//   try {
//     console.log('Document handler called');
//     console.log('Event body type:', typeof event.body);
//     console.log('Event body length:', event.body ? event.body.length : 'undefined');
//     console.log('Content-Type:', event.headers['content-type'] || event.headers['Content-Type']);
//     console.log('Is base64 encoded:', event.isBase64Encoded);
    
//     // Check if we have a body
//     if (!event.body) {
//       return {
//         statusCode: 400,
//         headers,
//         body: JSON.stringify({ error: 'No body provided' }),
//       };
//     }

//     // Handle base64 encoded body
//     let bodyData = event.body;
//     if (event.isBase64Encoded) {
//       console.log('Decoding base64 body');
//       bodyData = Buffer.from(event.body, 'base64');
//     }

//     // Parse multipart form data
//     const contentType = event.headers['content-type'] || event.headers['Content-Type'];
//     if (!contentType || !contentType.includes('multipart/form-data')) {
//       return {
//         statusCode: 400,
//         headers,
//         body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
//       };
//     }
    
//     const boundaryMatch = contentType.match(/boundary=([^;]+)/);
//     if (!boundaryMatch) {
//       return {
//         statusCode: 400,
//         headers,
//         body: JSON.stringify({ error: 'No boundary found in content-type' }),
//       };
//     }
    
//     const boundary = boundaryMatch[1];
//     console.log('Using boundary:', boundary);

//     const result = parseMultipart(bodyData, boundary);
//     console.log('Parsed result keys:', Object.keys(result));
    
//     if (!result.document) {
//       console.log('Available fields:', Object.keys(result));
//       return {
//         statusCode: 400,
//         headers,
//         body: JSON.stringify({ error: 'No document found in upload' }),
//       };
//     }

//     const file = result.document;
//     const message = result.message || 'Please analyze this document';
    
//     console.log('File info:', {
//       filename: file.filename,
//       contentType: file.contentType,
//       size: file.content ? file.content.length : 'undefined'
//     });

//     let documentText = '';

//     // Parse document based on content type
//     try {
//       if (file.contentType === 'application/pdf') {
//         console.log('Parsing PDF with custom extractor...');
//         documentText = extractTextFromPDF(file.content);
//       } else if (file.contentType === 'text/plain') {
//         console.log('Parsing text file...');
//         documentText = file.content.toString('utf-8');
//       } else if (file.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
//         console.log('DOCX files not yet supported - extracting basic text');
//         documentText = file.content.toString('utf-8').replace(/[^\x20-\x7E]/g, ' ');
//       } else if (file.contentType === 'application/msword') {
//         console.log('DOC files not yet supported - extracting basic text');
//         documentText = file.content.toString('utf-8').replace(/[^\x20-\x7E]/g, ' ');
//       } else {
//         console.log('Unsupported file type:', file.contentType);
//         return {
//           statusCode: 400,
//           headers,
//           body: JSON.stringify({ 
//             error: `Unsupported file type: ${file.contentType}. Currently supported: .txt and .pdf files.` 
//           }),
//         };
//       }
//     } catch (parseError) {
//       console.error('Document parsing error:', parseError);
//       return {
//         statusCode: 500,
//         headers,
//         body: JSON.stringify({ error: 'Failed to parse document', details: parseError.message }),
//       };
//     }

//     console.log('Extracted text length:', documentText.length);

//     if (!documentText.trim()) {
//       return {
//         statusCode: 400,
//         headers,
//         body: JSON.stringify({ error: 'No text content found in document' }),
//       };
//     }

//     // Limit text length for API call (approximately 8000 characters)
//     const maxLength = 8000;
//     if (documentText.length > maxLength) {
//       documentText = documentText.substring(0, maxLength) + '...[truncated]';
//     }

//     // Create analysis prompt
//     const prompt = `${message}

// Document: ${file.filename}
// Content:
// ${documentText}

// Please provide a comprehensive analysis of this document, including:
// 1. Main topics and key points
// 2. Important findings or conclusions
// 3. Any medical/clinical relevance (if applicable)
// 4. Summary of key information

// Analysis:`;

//     console.log('Calling Groq API...');

//     // Check if Groq API key is available
//     if (!process.env.GROQ_API_KEY) {
//       return {
//         statusCode: 500,
//         headers,
//         body: JSON.stringify({ error: 'Groq API key not configured' }),
//       };
//     }

//     // Get AI analysis using Groq
//     const response = await groq.chat.completions.create({
//       messages: [{
//         role: 'user',
//         content: prompt
//       }],
//       model: 'mixtral-8x7b-32768',
//       temperature: 0.7,
//       max_tokens: 2000,
//     });

//     const analysis = response.choices[0].message.content;

//     console.log('Analysis completed, length:', analysis.length);

//     return {
//       statusCode: 200,
//       headers,
//       body: JSON.stringify({
//         analysis: analysis,
//         documentInfo: {
//           filename: file.filename,
//           contentType: file.contentType,
//           textLength: documentText.length
//         }
//       }),
//     };

//   } catch (error) {
//     console.error('Handler error:', error);
//     return {
//       statusCode: 500,
//       headers,
//       body: JSON.stringify({ 
//         error: 'Internal server error',
//         details: error.message 
//       }),
//     };
//   }
// }; 