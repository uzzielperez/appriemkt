const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
// Import the DeepSeek service we created
const deepseekService = require('./services/deepseekService');

// Load environment variables
dotenv.config();

const app = express();
const upload = multer();

// Update CORS configuration
app.use(cors({
    origin: '*',  // Allow all origins
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Verify API keys are present
if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in .env file');
}

if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set in .env file');
}

if (!process.env.DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY is not set in .env file');
}

// Initialize API clients
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// DeepSeek is initialized in the deepseekService module

// Log available models
console.log('Available AI models:', {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY
});

// Import routes
const aiRoutes = require('./routes/aiRoutes');

// Register routes
app.use('/api/ai', aiRoutes);

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
        if (model === 'openai') {
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                    max_tokens: 1000
                });
                response = {
                    response: completion.choices[0].message.content,
                    tokens: completion.usage.total_tokens,
                    cost: completion.usage.total_tokens * 0.00002
                };
            } catch (openaiError) {
                console.error('OpenAI API Error:', openaiError);
                throw new Error(`OpenAI API Error: ${openaiError.message}`);
            }
        } else if (model === 'anthropic') {
            try {
                const message = await anthropic.messages.create({
                    model: "claude-3-opus-20240229",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt }]
                });
                response = {
                    response: message.content[0].text,
                    tokens: message.usage.output_tokens + message.usage.input_tokens,
                    cost: (message.usage.output_tokens + message.usage.input_tokens) * 0.00002
                };
            } catch (anthropicError) {
                console.error('Anthropic API Error:', anthropicError);
                throw new Error(`Anthropic API Error: ${anthropicError.message}`);
            }
        } else if (model === 'deepseek') {
            try {
                // Use the DeepSeek service we created
                const deepseekResponse = await deepseekService.generateText(prompt, {
                    maxTokens: 1000,
                    temperature: 0.7
                });
                
                // Adjust this based on the actual response structure from DeepSeek
                response = {
                    response: deepseekResponse.choices?.[0]?.text || deepseekResponse.completion || "No response from DeepSeek",
                    tokens: deepseekResponse.usage?.total_tokens || 0,
                    cost: (deepseekResponse.usage?.total_tokens || 0) * 0.00002 // Adjust cost as needed
                };
            } catch (deepseekError) {
                console.error('DeepSeek API Error:', deepseekError);
                throw new Error(`DeepSeek API Error: ${deepseekError.message}`);
            }
        } else {
            throw new Error('Invalid model specified');
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
    
    if (!['anthropic', 'openai', 'deepseek'].includes(model)) {
      throw new Error('Invalid model specified');
    }
    
    let response;
    
    // Process based on selected model
    if (model === 'anthropic') {
      // Existing Anthropic code
      response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 4000,
        messages: [{ role: "user", content: query }]
      });
    } else if (model === 'openai') {
      // Existing OpenAI code
      response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: query }]
      });
    } else if (model === 'deepseek') {
      // New DeepSeek code
      response = await deepseekService.generateText(query);
    }
    
    res.json({ response });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this route to test DeepSeek API directly
app.get('/test-deepseek', async (req, res) => {
  try {
    console.log('Testing DeepSeek API...');
    const deepseekService = require('./services/deepseekService');
    const response = await deepseekService.generateText('Hello, this is a test prompt.');
    res.json({ success: true, response });
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
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
    });
});