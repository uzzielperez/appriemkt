const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// DeepSeek route
router.post('/deepseek/generate', aiController.generateDeepSeekResponse);

module.exports = router; 