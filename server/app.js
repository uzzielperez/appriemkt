const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Fix the fetch import
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Add function to test Groq connection and get available models
async function testGroqConnection() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return "Error: GROQ_API_KEY not found";
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    if (response.ok) {
      return "Connection successful! Models available.";
    } else {
      const text = await response.text();
      return `Error: Status code ${response.status}, Response: ${text}`;
    }
  } catch (error) {
    return `Connection error: ${error.message}`;
  }
}

// Add function to get available models
async function getAvailableModels() {
  const apiKey = process.env.GROQ_API_KEY;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const models = await response.json();
    console.log("Available models:");
    models.data.forEach(model => {
      console.log(`- ${model.id}`);
    });
    return models;
  } catch (error) {
    console.error(`Error getting models: ${error.message}`);
    return null;
  }
}

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add startup checks
console.log('\n=== GROQ API Configuration ===');
console.log(`API Key loaded: ${process.env.GROQ_API_KEY ? 'Yes' : 'No'}`);
console.log(`API Key prefix: ${process.env.GROQ_API_KEY?.substring(0, 5)}...`);

// Test connection and get models on startup
(async () => {
  console.log('\n=== Testing GROQ Connection ===');
  console.log(await testGroqConnection());
  console.log('\n=== Fetching Available Models ===');
  await getAvailableModels();
})();

// Add endpoint to get available models
app.get('/api/models', async (req, res) => {
  try {
    const models = await getAvailableModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug middleware with more detailed logging
app.use((req, res, next) => {
  console.log('\n=== Incoming Request ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('========================\n');
  next();
});

// API endpoint for handling queries
app.post('/api/query', async (req, res) => {
  try {
    const { query, model = 'groq', task = 'clinical' } = req.body;
    console.log('Processing query:', query);
    console.log('Selected model:', model);
    console.log('Current task:', task);

    if (!query) {
      throw new Error('Query is required');
    }

    const selectedModel = model || 'groq';

    if (selectedModel === 'groq') {
      console.log('Making Groq API request...');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-qwq-32b', // Updated to use Qwen model
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

      const responseText = await response.text();
      console.log('Groq API response:', responseText);

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      res.json({
        response: data.choices[0].message.content,
        model: 'groq'
      });
    } else {
      throw new Error(`Unsupported model: ${selectedModel}`);
    }
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;