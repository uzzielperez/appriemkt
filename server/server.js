const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const http = require('http');
const WebSocket = require('ws');
const { Groq } = require('groq-sdk');

// Load environment variables
dotenv.config();

const { getAvailableModels } = require('./app');

const app = express();
const upload = multer();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Apply CSP headers to all responses
app.use((req, res, next) => {
  // Set a permissive Content-Security-Policy that allows images, scripts, and styles
  res.setHeader(
    'Content-Security-Policy', 
    "default-src 'self'; img-src 'self' data: *; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:;"
  );
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Serve static files from the assets directory (where favicon.ico is located)
app.use(express.static(path.join(__dirname, '../assets')));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));

// Serve files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Update CORS configuration
app.use(cors({
    origin: '*',  // Allow all origins
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Verify API keys are present
if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set in .env file');
}

if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in .env file');
}

// Log available models
console.log('Available AI models:', {
    groq: !!process.env.GROQ_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY
});

// Import routes
const aiRoutes = require('./routes/aiRoutes');
const documentRoutes = require('./routes/documentRoutes');

// Register routes
app.use('/api/ai', aiRoutes);
app.use('/api/documents', documentRoutes);

// Direct favicon serving route with explicit headers
app.get('/favicon.ico', (req, res) => {
    // Explicitly set CSP header for favicon requests
    res.setHeader(
      'Content-Security-Policy', 
      "default-src 'self'; img-src 'self' data: *;"
    );
    res.sendFile(path.join(__dirname, '../assets/favicon.ico'));
});

// Handle chat.html route explicitly
app.get('/chat.html', (req, res) => {
    // Explicitly set CSP header for chat.html
    res.setHeader(
      'Content-Security-Policy', 
      "default-src 'self'; img-src 'self' data: *; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:;"
    );
    res.sendFile(path.join(__dirname, '../chat.html'));
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Handle chat queries with better error handling
app.post('/api/query', upload.none(), async (req, res) => {
    console.log('Received request:', {
        task: req.body.task,
        model: req.body.model,
        queryLength: req.body.query ? req.body.query.length : 0
    });

    try {
        const { query, model, task } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'No query provided' });
        }

        // Customize the prompt based on the task
        let prompt = query;
        switch (task) {
            case 'symptoms':
                prompt = `As a medical professional, analyze these symptoms and provide a detailed assessment: ${query}`;
                break;
            case 'report':
                prompt = `Generate a formal medical report summary with the following sections:

                PATIENT COMPLAINT:
                ${query}

                Please provide a structured response with these sections:
                1. Chief Complaint
                2. History of Present Illness
                3. Assessment
                4. Recommendations

                Format it clearly for a PDF report.`;
                break;
            case 'treatment':
                prompt = `Provide a detailed treatment plan for the following condition. Include medication recommendations, lifestyle changes, and follow-up care: ${query}`;
                break;
        }

        console.log('Using model:', model);
        console.log('Task:', task);

        let response;
        if (model === 'groq') {
            try {
                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'allam-2-7b',
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
                        temperature: 0.7,
                        max_tokens: 1000,
                    }),
                });

                if (!groqResponse.ok) {
                    const errorText = await groqResponse.text();
                    throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
                }

                const data = await groqResponse.json();
                
                response = {
                    response: data.choices[0].message.content,
                    tokens: data.usage?.total_tokens || 0,
                    cost: (data.usage?.total_tokens || 0) * 0.00002
                };
            } catch (groqError) {
                console.error('Groq API Error:', groqError);
                throw new Error(`Groq API Error: ${groqError.message}`);
            }
        } else {
            throw new Error('Invalid model specified - only groq is supported');
        }

        console.log('Sending response:', {
            responseLength: response.response.length,
            tokens: response.tokens
        });

        res.json(response);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

// Example route handler for AI processing
app.post('/api/process', upload.single('file'), async (req, res) => {
  try {
    const { task, model, query } = req.body;
    const queryLength = query ? query.length : 0;
    
    console.log('Received request:', { task, model, queryLength });
    
    // Validate model
    console.log('Using model:', model);
    console.log('Task:', task);
    
    if (model !== 'groq') {
      throw new Error('Invalid model specified - only groq is supported');
    }
    
    let response;
    
    // Process based on selected model
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'allam-2-7b',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful medical AI assistant. Provide accurate, evidence-based medical information.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const data = await groqResponse.json();
    response = data;
    
    res.json({ response });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this route to test Groq API directly
app.get('/test-groq', async (req, res) => {
  try {
    console.log('Testing Groq API...');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'allam-2-7b',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful medical AI assistant. Provide accurate, evidence-based medical information.'
          },
          {
            role: 'user',
            content: 'Hello, this is a test prompt.'
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.json({ success: true, response: data });
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || error.stack
    });
  }
});

// Catch-all route for HTML files to ensure CSP headers are applied
app.get('*.html', (req, res, next) => {
  // Explicitly set CSP header for all HTML files
  res.setHeader(
    'Content-Security-Policy', 
    "default-src 'self'; img-src 'self' data: *; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:;"
  );
  next();
});

// Update the port to 3000
const PORT = process.env.PORT || 3000;
(async () => {
  console.log("=== Fetching Available Models ===");
  await getAvailableModels();
})();
server.listen(PORT, () => {
    console.log(`\nServer running on port ${PORT}`);
    console.log(`http://localhost:${PORT}\n`);
    console.log('Environment check:', {
        hasGroqKey: !!process.env.GROQ_API_KEY
    });
});
