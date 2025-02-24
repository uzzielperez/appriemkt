require('dotenv').config();
const express = require('express');
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const app = express();

app.use(express.json());
app.use(express.static('../')); // Serve frontend files

const API_KEYS = {
    chatgpt: process.env.OPENAI_API_KEY,
    claude: process.env.ANTHROPIC_API_KEY,
    grok: process.env.XAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    'medical-llm': process.env.MEDICAL_LLM_API_KEY
};

const TOKEN_COSTS = {
    chatgpt: 0.002,
    claude: 0.003,
    grok: 0.0015,
    deepseek: 0.001,
    'medical-llm': 0.005
};

app.post('/api/query', upload.single('file'), async (req, res) => {
    const { api, query } = req.body;
    const file = req.file;
    let responseText = "Processing query: " + query;
    if (file) responseText += ` with file: ${file.originalname}`;
    const tokensUsed = 200; // Placeholder
    const cost = (tokensUsed / 1000) * TOKEN_COSTS[api] * 1.5;
    res.json({ response: responseText, tokens: tokensUsed, cost });
});

app.post('/api/voice', upload.single('voice'), async (req, res) => {
    const { api } = req.body;
    const voiceFile = req.file;
    const text = "Transcribed voice input"; // Replace with real transcription
    const responseText = "Response based on: " + text;
    const tokensUsed = 200;
    const cost = (tokensUsed / 1000) * TOKEN_COSTS[api] * 1.5;
    res.json({ text, response: responseText, tokens: tokensUsed, cost });
});

app.post('/api/deep-search', async (req, res) => {
    const { query } = req.body;
    const results = `Searched medical data for "${query}": [Sample result]`;
    res.json({ results });
});

app.get('/stripe/checkout', async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: { name: 'Token Subscription' },
                unit_amount: 1000,
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: 'http://localhost:3000/success.html',
        cancel_url: 'http://localhost:3000/cancel.html',
    });
    res.redirect(303, session.url);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));