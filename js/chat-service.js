class ChatService {
    constructor() {
      this.selectedModel = 'openai'; // Default model
      this.modelSelector = document.getElementById('model-selector');
      
      // Set up event listener for model changes
      if (this.modelSelector) {
        this.modelSelector.addEventListener('change', (e) => {
          this.selectedModel = e.target.value;
          console.log(`Model switched to: ${this.selectedModel}`);
        });
      }
    }
    
    async sendMessage(message, messageHistory = []) {
      const endpoint = `/.netlify/functions/${this.selectedModel}`;
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: message,
            messages: messageHistory 
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response;
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    }
  }
  
  // Export the service for use in other files
  window.ChatService = new ChatService();