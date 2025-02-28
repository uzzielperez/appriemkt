const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apprie')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const upload = multer();

// Update CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const User = mongoose.model('User', userSchema);

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create new user
        const user = new User({ email, password, name });
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Authentication Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findOne({ _id: decoded.userId });

        if (!user) {
            throw new Error();
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// Initialize API clients
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Handle chat queries
app.post('/api/query', upload.single('file'), async (req, res) => {
    console.log('Received request:', {
        body: req.body,
        model: req.body.model,
        query: req.body.query
    });

    try {
        const { query, model } = req.body;
        let response;

        if (!query) {
            throw new Error('No query provided');
        }

        if (!model) {
            throw new Error('No model specified');
        }

        if (model === 'openai') {
            console.log('Using OpenAI API');
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: query }]
            });
            response = {
                response: completion.choices[0].message.content,
                tokens: completion.usage.total_tokens,
                cost: completion.usage.total_tokens * 0.00002 // Approximate cost
            };
        } else if (model === 'anthropic') {
            const message = await anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1000,
                messages: [{ role: "user", content: query }]
            });
            response = {
                response: message.content[0].text,
                tokens: message.usage.output_tokens + message.usage.input_tokens,
                cost: (message.usage.output_tokens + message.usage.input_tokens) * 0.00002 // Approximate cost
            };
        }

        res.json(response);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});