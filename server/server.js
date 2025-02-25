const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// Load environment variables
dotenv.config();

const app = express();
const upload = multer();

// More permissive CORS setup for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Remove the previous cors() middleware and use our custom one above
app.use(express.json());

// Initialize API clients
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Add a test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Handle chat queries
app.post('/api/query', upload.none(), async (req, res) => {
    console.log('Received request:', req.body);

    try {
        const { query, model } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'No query provided' });
        }

        let response;
        if (model === 'openai') {
            console.log('Using OpenAI API');
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [{ role: "user", content: query }]
                });
                response = {
                    response: completion.choices[0].message.content,
                    tokens: completion.usage.total_tokens,
                    cost: completion.usage.total_tokens * 0.00002
                };
            } catch (error) {
                console.error('OpenAI API Error:', error);
                return res.status(500).json({ error: 'OpenAI API Error: ' + error.message });
            }
        } else if (model === 'anthropic') {
            console.log('Using Anthropic API');
            try {
                const message = await anthropic.messages.create({
                    model: "claude-3-opus-20240229",  // Updated to newer model
                    max_tokens: 1000,
                    messages: [{ role: "user", content: query }]
                });
                response = {
                    response: message.content[0].text,
                    tokens: message.usage.output_tokens + message.usage.input_tokens,
                    cost: (message.usage.output_tokens + message.usage.input_tokens) * 0.00002
                };
            } catch (error) {
                console.error('Anthropic API Error:', error);
                return res.status(500).json({ error: 'Anthropic API Error: ' + error.message });
            }
        }

        console.log('Sending response:', response);
        res.json(response);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Test the server at: http://localhost:${PORT}/test`);
});