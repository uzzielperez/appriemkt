const deepseekService = require('../services/deepseekService');

exports.generateDeepSeekResponse = async (req, res) => {
  try {
    const { prompt, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const response = await deepseekService.generateText(prompt, options);
    
    return res.json(response);
  } catch (error) {
    console.error('Error in DeepSeek generation:', error);
    return res.status(500).json({ 
      error: 'Failed to generate response from DeepSeek',
      details: error.response?.data || error.message
    });
  }
}; 