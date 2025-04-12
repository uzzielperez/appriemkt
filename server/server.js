const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Load environment variables
dotenv.config();

const app = express();
const upload = multer();

// Add custom Content-Security-Policy middleware
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy', 
    "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});

// Serve static files from the assets directory (where favicon.ico is located)
app.use(express.static(path.join(__dirname, '../assets')));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '../')));

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

// Log available models
console.log('Available AI models:', {
    groq: !!process.env.GROQ_API_KEY
});

// Import routes
const aiRoutes = require('./routes/aiRoutes');

// Register routes
app.use('/api/ai', aiRoutes);

// Direct favicon serving route
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '../assets/favicon.ico'));
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
                const groqResponse = await fetch('https://api.groq.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'mixtral-8x7b-32768',
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
    const groqResponse = await fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
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
    const response = await fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
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

// Update the port to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\nServer running on port ${PORT}`);
    console.log(`http://localhost:${PORT}\n`);
    console.log('Environment check:', {
        hasGroqKey: !!process.env.GROQ_API_KEY
    });
});
