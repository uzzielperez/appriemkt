const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Enhanced PDF text extraction function (same as before but returns sections)
function extractTextFromPDF(buffer) {
  try {
    console.log('Starting PDF text extraction, buffer size:', buffer.length);
    
    const pdfString = buffer.toString('latin1');
    const pdfUtf8 = buffer.toString('utf8');
    
    let extractedText = '';
    
    // Strategy 1: Look for text between parentheses (most common in PDFs)
    console.log('Trying parentheses text extraction...');
    const parenthesesPattern = /\(([^)]{3,}?)\)/g;
    const parenthesesMatches = pdfString.match(parenthesesPattern);
    if (parenthesesMatches) {
      console.log('Found', parenthesesMatches.length, 'parentheses matches');
      parenthesesMatches.forEach(match => {
        const text = match.replace(/[()]/g, '').trim();
        if (text.length > 2 && 
            /[a-zA-Z]/.test(text) && 
            !text.includes('endobj') && 
            !text.includes('stream') &&
            !text.includes('/Type') &&
            !text.includes('/Filter') &&
            !/^[0-9\s\.\-]+$/.test(text) &&
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
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ')
      .trim();
    
    console.log('Final extracted text length:', extractedText.length);
    
    return extractedText;

  } catch (error) {
    console.error('PDF extraction error:', error);
    throw error;
  }
}

// Function to split document into logical sections
function parseDocumentIntoSections(text, filename) {
  console.log('Parsing document into sections, text length:', text.length);
  
  const sections = [];
  
  // Split by common section markers
  const sectionMarkers = [
    // Medical document sections
    /(?:^|\n)\s*(?:ABSTRACT|Abstract|abstract)\s*[:\n]/i,
    /(?:^|\n)\s*(?:INTRODUCTION|Introduction|introduction)\s*[:\n]/i,
    /(?:^|\n)\s*(?:BACKGROUND|Background|background)\s*[:\n]/i,
    /(?:^|\n)\s*(?:METHODS|Methods|methods|METHODOLOGY|Methodology)\s*[:\n]/i,
    /(?:^|\n)\s*(?:RESULTS|Results|results|FINDINGS|Findings)\s*[:\n]/i,
    /(?:^|\n)\s*(?:DISCUSSION|Discussion|discussion)\s*[:\n]/i,
    /(?:^|\n)\s*(?:CONCLUSION|Conclusion|conclusion|CONCLUSIONS|Conclusions)\s*[:\n]/i,
    /(?:^|\n)\s*(?:REFERENCES|References|references|BIBLIOGRAPHY)\s*[:\n]/i,
    
    // Clinical sections
    /(?:^|\n)\s*(?:CHIEF COMPLAINT|Chief Complaint|chief complaint)\s*[:\n]/i,
    /(?:^|\n)\s*(?:HISTORY OF PRESENT ILLNESS|History of Present Illness|HPI)\s*[:\n]/i,
    /(?:^|\n)\s*(?:PAST MEDICAL HISTORY|Past Medical History|PMH)\s*[:\n]/i,
    /(?:^|\n)\s*(?:MEDICATIONS|Medications|medications|CURRENT MEDICATIONS)\s*[:\n]/i,
    /(?:^|\n)\s*(?:ALLERGIES|Allergies|allergies)\s*[:\n]/i,
    /(?:^|\n)\s*(?:PHYSICAL EXAMINATION|Physical Examination|PHYSICAL EXAM)\s*[:\n]/i,
    /(?:^|\n)\s*(?:ASSESSMENT|Assessment|assessment|IMPRESSION|Impression)\s*[:\n]/i,
    /(?:^|\n)\s*(?:PLAN|Plan|plan|TREATMENT PLAN|Treatment Plan)\s*[:\n]/i,
    
    // General document sections
    /(?:^|\n)\s*(?:SUMMARY|Summary|summary|EXECUTIVE SUMMARY)\s*[:\n]/i,
    /(?:^|\n)\s*(?:OVERVIEW|Overview|overview)\s*[:\n]/i,
    
    // Number-based sections
    /(?:^|\n)\s*(?:[1-9]\d*\.?\s+[A-Z][A-Za-z\s]{3,})\s*[:\n]/,
    /(?:^|\n)\s*(?:[IVX]+\.?\s+[A-Z][A-Za-z\s]{3,})\s*[:\n]/,
  ];
  
  // Find all section breaks
  let sectionBreaks = [];
  
  sectionMarkers.forEach(marker => {
    let match;
    while ((match = marker.exec(text)) !== null) {
      sectionBreaks.push({
        index: match.index,
        title: match[0].trim().replace(/[:\n]/g, ''),
        marker: match[0]
      });
    }
  });
  
  // Sort by position in document
  sectionBreaks.sort((a, b) => a.index - b.index);
  
  // If no clear sections found, split by paragraphs or length
  if (sectionBreaks.length === 0) {
    console.log('No section markers found, splitting by paragraphs');
    return splitByParagraphs(text, filename);
  }
  
  // Create sections from breaks
  for (let i = 0; i < sectionBreaks.length; i++) {
    const currentBreak = sectionBreaks[i];
    const nextBreak = sectionBreaks[i + 1];
    
    const startIndex = currentBreak.index;
    const endIndex = nextBreak ? nextBreak.index : text.length;
    
    const sectionText = text.substring(startIndex, endIndex).trim();
    
    if (sectionText.length > 50) { // Only include substantial sections
      sections.push({
        id: `section-${i + 1}`,
        title: currentBreak.title || `Section ${i + 1}`,
        content: sectionText,
        wordCount: sectionText.split(/\s+/).length,
        charCount: sectionText.length,
        preview: sectionText.substring(0, 200) + (sectionText.length > 200 ? '...' : ''),
        selected: true // Default to selected
      });
    }
  }
  
  // If we have a substantial amount of text before the first section, add it as an introduction
  if (sectionBreaks.length > 0 && sectionBreaks[0].index > 200) {
    const introText = text.substring(0, sectionBreaks[0].index).trim();
    if (introText.length > 100) {
      sections.unshift({
        id: 'section-0',
        title: 'Introduction/Overview',
        content: introText,
        wordCount: introText.split(/\s+/).length,
        charCount: introText.length,
        preview: introText.substring(0, 200) + (introText.length > 200 ? '...' : ''),
        selected: true
      });
    }
  }
  
  console.log(`Created ${sections.length} sections`);
  return sections;
}

// Fallback: split by paragraphs if no sections found
function splitByParagraphs(text, filename) {
  console.log('Splitting by paragraphs');
  
  // Split by double line breaks or significant spacing
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 100);
  
  const sections = [];
  const maxSections = 10; // Limit to prevent too many sections
  const sectionsToCreate = Math.min(paragraphs.length, maxSections);
  
  for (let i = 0; i < sectionsToCreate; i++) {
    const paragraph = paragraphs[i].trim();
    
    // Try to find a title from the first line
    const lines = paragraph.split('\n');
    const firstLine = lines[0].trim();
    let title = `Section ${i + 1}`;
    
    // If the first line is short and looks like a title, use it
    if (firstLine.length < 100 && firstLine.length > 5 && !firstLine.endsWith('.')) {
      title = firstLine;
    }
    
    sections.push({
      id: `section-${i + 1}`,
      title: title,
      content: paragraph,
      wordCount: paragraph.split(/\s+/).length,
      charCount: paragraph.length,
      preview: paragraph.substring(0, 200) + (paragraph.length > 200 ? '...' : ''),
      selected: true
    });
  }
  
  return sections;
}

// Enhanced multipart parser (same as before)
function parseMultipart(buffer, boundary) {
  try {
    console.log('Parsing multipart with boundary:', boundary);
    
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
    console.log('=== Document Parser Called ===');

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
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No document found in upload' }) };
    }

    const file = result.document;
    console.log('Processing file:', file.filename, 'Type:', file.contentType, 'Size:', file.content.length);
    
    let documentText = '';

    // Extract text based on file type
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
        body: JSON.stringify({ 
          error: 'No text content found in document',
          suggestion: 'This might be a scanned PDF or image-based document. Please try converting it to text first.'
        }),
      };
    }

    // Parse document into sections
    const sections = parseDocumentIntoSections(documentText, file.filename);

    if (sections.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Could not parse document into sections',
          suggestion: 'The document structure could not be automatically detected.'
        }),
      };
    }

    // Return the parsed document with sections
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        documentInfo: {
          filename: file.filename,
          contentType: file.contentType,
          totalLength: documentText.length,
          wordCount: documentText.split(/\s+/).length,
          sectionCount: sections.length
        },
        sections: sections,
        fullText: documentText // Include full text for reference
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