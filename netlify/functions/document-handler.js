const { Pool } = require('pg');
const { Groq } = require('groq-sdk');
const pdfParse = require('pdf-parse');
const multipart = require('lambda-multipart-parser');

// Initialize Neon client
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Helper function to create database tables if they don't exist
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create tables in a transaction
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id),
        analysis_type TEXT NOT NULL,
        result TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Initialize database tables
initializeDatabase().catch(console.error);

// Helper function to extract text from PDF buffer
async function extractTextFromPDF(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

// Helper function to store document in database
async function storeDocument(filename, originalName, contentType, content) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO documents (filename, original_name, content_type, content) VALUES ($1, $2, $3, $4) RETURNING id',
      [filename, originalName, contentType, content]
    );
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

// Helper function to store analysis in database
async function storeAnalysis(documentId, analysisType, result) {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO analyses (document_id, analysis_type, result) VALUES ($1, $2, $3)',
      [documentId, analysisType, result]
    );
  } finally {
    client.release();
  }
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
    
    // Parse multipart form data
    const result = await multipart.parse(event);
    console.log('Parsed result:', Object.keys(result));
    
    if (!result.document) {
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
      size: file.content.length
    });

    let documentText = '';

    // Parse document based on content type
    try {
      if (file.contentType === 'application/pdf') {
        console.log('Parsing PDF...');
        const pdfData = await pdfParse(file.content);
        documentText = pdfData.text;
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
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Unsupported file type' }),
        };
      }
    } catch (parseError) {
      console.error('Document parsing error:', parseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to parse document' }),
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