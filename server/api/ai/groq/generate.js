const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// API endpoint for handling queries
app.post('/api/query', async (req, res) => {
  try {
    const { query, model, task } = req.body;
    console.log('Processing query:', query);
    console.log('Selected model:', model);
    console.log('Current task:', task);

    let response;
    
    if (model === 'groq') {
      response = await fetch('https://api.groq.com/v1/chat/completions', {
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Groq API response:', data);
      
      res.json({
        response: data.choices[0].message.content,
        model: 'groq'
      });
    } 
    else {
      throw new Error(`Unsupported model: ${model}`);
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
  res.status(500).json({ 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('GROQ API Key present:', !!process.env.GROQ_API_KEY);
});

module.exports = app;
