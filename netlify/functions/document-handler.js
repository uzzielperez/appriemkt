const { Pool } = require('pg');
const { Anthropic } = require('@anthropic-ai/sdk');
const pdfParse = require('pdf-parse');
const multipart = require('lambda-multipart-parser');

// Initialize Neon client
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
      }
    };
  }

  try {
    if (event.httpMethod === 'POST') {
      if (event.path.endsWith('/upload')) {
        // Handle file upload
        const { files } = await multipart.parse(event);
        if (!files || files.length === 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'No file uploaded' })
          };
        }

        const file = files[0];
        let content;

        // Extract text based on content type
        if (file.contentType === 'application/pdf') {
          content = await extractTextFromPDF(file.content);
        } else if (file.contentType === 'text/plain') {
          content = file.content.toString('utf-8');
        } else {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Unsupported file type' })
          };
        }

        // Store document in database
        const documentId = await storeDocument(
          file.filename,
          file.originalname,
          file.contentType,
          content
        );

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'File uploaded successfully',
            documentId
          })
        };

      } else if (event.path.endsWith('/analyze')) {
        // Handle document analysis
        const { documentId, analysisType } = JSON.parse(event.body);

        // Get document content from database
        const client = await pool.connect();
        try {
          const result = await client.query(
            'SELECT content FROM documents WHERE id = $1',
            [documentId]
          );

          if (result.rows.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'Document not found' })
            };
          }

          const { content } = result.rows[0];

          // Prepare prompt based on analysis type
          let prompt;
          switch (analysisType) {
            case 'summary':
              prompt = `Please provide a concise summary of the following text:\n\n${content}`;
              break;
            case 'keyPoints':
              prompt = `Please extract the key points from the following text:\n\n${content}`;
              break;
            case 'analysis':
              prompt = `Please provide a detailed analysis of the following text, including main themes, arguments, and any notable findings:\n\n${content}`;
              break;
            default:
              prompt = `Please analyze the following text and provide key insights:\n\n${content}`;
          }

          // Get AI analysis
          const response = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: prompt
            }]
          });

          // Store analysis result
          await storeAnalysis(documentId, analysisType, response.content[0].text);

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              analysis: response.content[0].text,
              documentInfo: {
                documentId,
                analysisType
              }
            })
          };
        } finally {
          client.release();
        }
      }
    } else if (event.httpMethod === 'GET') {
      // Handle retrieving document or analysis
      const matches = event.path.match(/\/documents\/(\d+)/);
      if (matches) {
        const documentId = matches[1];
        const client = await pool.connect();
        try {
          const result = await client.query(
            `SELECT d.*, a.analysis_type, a.result as analysis_result 
             FROM documents d 
             LEFT JOIN analyses a ON d.id = a.document_id 
             WHERE d.id = $1`,
            [documentId]
          );

          if (result.rows.length === 0) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'Document not found' })
            };
          }

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(result.rows[0])
          };
        } finally {
          client.release();
        }
      }
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 