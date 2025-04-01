const axios = require('axios');
// Make sure dotenv is configured at the top level
const dotenv = require('dotenv');
dotenv.config();

class DeepSeekService {
  constructor() {
    // Get the API key from environment variables
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    
    console.log('DeepSeek Service initialized');
    console.log('API Key present:', !!this.apiKey);
    
    if (this.apiKey) {
      // Only log the first few characters for security
      console.log('API Key starts with:', this.apiKey.substring(0, 5));
    } else {
      console.error('⚠️ WARNING: DeepSeek API key is not set in environment variables');
    }
  }

  /**
   * Generate text using DeepSeek API
   * @param {string} prompt - The prompt for text generation
   * @param {Object} options - Additional options for the API call
   * @returns {Promise<Object>} - The API response
   */
  async generateText(prompt, options = {}) {
    try {
      // Verify that we have an API key
      if (!this.apiKey) {
        throw new Error('DeepSeek API key is not set');
      }
      
      console.log('DeepSeek API Request:');
      console.log('- Prompt (first 50 chars):', prompt.substring(0, 50) + '...');
      
      const response = await axios.post(
        'https://api.deepinfra.com/v1/openai/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('DeepSeek API Response Success!');
      return {
        choices: [{ text: response.data.choices[0].message.content }],
        usage: response.data.usage
      };
    } catch (error) {
      console.error('DeepSeek API Error:', error.response ? error.response.data : error.message);
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }
  
  // Add a simple test method
  async testConnection() {
    try {
      const result = await this.generateText('Hello, this is a test prompt.');
      console.log('Test successful:', result);
      return { success: true, result };
    } catch (error) {
      console.error('Test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export an instance of the service
const deepseekService = new DeepSeekService();

// Run a test when the service is first imported
console.log('Running DeepSeek API test...');
deepseekService.testConnection()
  .then(result => console.log('Test completed with result:', result.success))
  .catch(error => console.error('Test error:', error));

// Export the service
module.exports = deepseekService; 