const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/auth');

// Load environment variables
dotenv.config();

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/apprie', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Successfully connected to MongoDB.');
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Please make sure MongoDB is running on your machine.');
    process.exit(1); // Exit if MongoDB connection fails
});

const app = express();
const upload = multer();

// Update CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const User = require('./models/User');

// Mount auth routes
app.use('/api/auth', authRoutes);

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

        // Remove any auth check for model selection
        if (model === 'openai') {
            console.log('Using OpenAI API');
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: query }]
            });
            response = {
                response: completion.choices[0].message.content,
                tokens: completion.usage.total_tokens,
                cost: completion.usage.total_tokens * 0.00002
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
                cost: (message.usage.output_tokens + message.usage.input_tokens) * 0.00002
            };
        }

        res.json(response);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Modify the chat endpoint to skip auth check for preset queries
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Add your preset queries list
        const presetQueries = [
            "What services do you offer?",
            "How can I contact support?",
            // Add other preset queries here
        ];

        // Skip authentication if it's a preset query
        if (!presetQueries.includes(message) && !req.isAuthenticated()) {
            return res.status(401).json({ error: 'Authentication required for custom queries' });
        }

        // Process the message and return response
        // Your existing message handling code...
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add logout route
app.post('/api/auth/logout', (req, res) => {
    // Clear the JWT cookie if you're using cookies
    res.clearCookie('jwt');
    res.status(200).json({ message: 'Logged out successfully' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});