const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Groq route
router.post('/groq/generate', aiController.generateGroqResponse);

module.exports = router;
