const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
  }

  async testConnection() {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const models = await response.json();
      console.log('Available Groq models:', models.data.map(m => m.id));
      return true;
    } catch (error) {
      console.error('Groq API Error:', error);
      return false;
    }
  }

  async getModels() {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Groq models:', error);
      throw error;
    }
  }

  async generateText(prompt, model = 'mixtral-8x7b') {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful medical AI assistant. Provide accurate, evidence-based medical information.'
            },
            {
              role: 'user',
              content: prompt
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
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error generating text with Groq:', error);
      throw error;
    }
  }
}

module.exports = new GroqService(); 