// Offline Chat Module for Apprie Medical Assistant
// This provides a fallback chat experience when the user is offline

const ApprieOfflineChat = {
  // Initialize with basic medical knowledge
  medicalKnowledge: {
    greetings: [
      "How can I help you with your medical questions today?",
      "Hello! I'm here to assist with medical information. What can I help you with?",
      "Welcome to Apprie. How can I assist with your healthcare needs?",
      "I'm your offline medical assistant. What would you like to know?"
    ],
    
    // Basic responses for common medical topics
    topics: {
      headache: "Headaches can be caused by stress, dehydration, lack of sleep, or more serious conditions. For mild headaches, try rest, hydration, and over-the-counter pain relievers like acetaminophen or ibuprofen. If headaches are severe, persistent, or accompanied by other symptoms, please consult a healthcare provider.",
      
      fever: "Fever is usually a sign that your body is fighting an infection. For adults, a temperature above 100.4°F (38°C) is considered a fever. Rest, stay hydrated, and take acetaminophen or ibuprofen to reduce fever. Seek medical attention if fever is very high (above 103°F/39.4°C), lasts more than three days, or is accompanied by severe symptoms.",
      
      cold: "Common colds are viral infections affecting the upper respiratory tract. Symptoms include runny nose, congestion, sore throat, and cough. Treatment involves rest, hydration, and over-the-counter medications for symptom relief. Most colds resolve within 7-10 days. See a doctor if symptoms worsen or last longer than two weeks.",
      
      flu: "Influenza (flu) is a viral infection with symptoms including fever, chills, muscle aches, fatigue, cough, and headache. Treatment includes rest, fluids, and antiviral medications if started early. Complications can be serious, especially for high-risk individuals. Annual vaccination is recommended for prevention.",
      
      covid19: "COVID-19 symptoms include fever, cough, shortness of breath, fatigue, body aches, loss of taste/smell, sore throat, and congestion. If you suspect COVID-19, get tested and follow isolation guidelines. Seek emergency care for severe symptoms like trouble breathing or persistent chest pain.",
      
      nutrition: "A balanced diet includes fruits, vegetables, whole grains, lean proteins, and healthy fats. Limit processed foods, added sugars, and excessive sodium. Stay hydrated by drinking plenty of water. Individual nutritional needs vary based on age, sex, activity level, and health conditions.",
      
      exercise: "Regular physical activity is important for health. Adults should aim for at least 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity weekly, plus muscle-strengthening activities twice a week. Start slowly and increase gradually. Consult a healthcare provider before starting a new exercise program if you have health concerns.",
      
      sleep: "Adults typically need 7-9 hours of sleep per night. Good sleep hygiene includes maintaining a regular sleep schedule, creating a restful environment, limiting screen time before bed, avoiding caffeine and large meals near bedtime, and being physically active during the day.",
      
      stress: "Chronic stress can negatively impact health. Stress management techniques include deep breathing, meditation, physical activity, adequate sleep, connecting with others, limiting alcohol and caffeine, and seeking professional help when needed.",
      
      firstaid: "For minor cuts, clean with soap and water, apply antiseptic, and cover with a sterile bandage. For burns, cool with cold water (not ice) and cover loosely. For choking, perform abdominal thrusts. For suspected heart attack or stroke, call emergency services immediately."
    },
    
    // Fallback response
    fallback: "I'm currently in offline mode and have limited information. When you're back online, I'll be able to provide more detailed and personalized assistance. For now, I can offer basic guidance on common health topics. For medical emergencies, please seek professional medical help immediately."
  },
  
  // Process user message in offline mode
  processMessage: function(message) {
    // Convert message to lowercase for easier matching
    const lowerMessage = message.toLowerCase();
    
    // Check if it's a greeting
    if (this.isGreeting(lowerMessage)) {
      return this.getRandomGreeting();
    }
    
    // Check for medical topics
    for (const [topic, response] of Object.entries(this.medicalKnowledge.topics)) {
      if (lowerMessage.includes(topic)) {
        return response;
      }
    }
    
    // Check for keywords
    const matchedResponses = this.matchKeywords(lowerMessage);
    if (matchedResponses.length > 0) {
      // Return the most relevant response (first match)
      return matchedResponses[0];
    }
    
    // Fallback response if no match found
    return this.medicalKnowledge.fallback;
  },
  
  // Check if message is a greeting
  isGreeting: function(message) {
    const greetingPatterns = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'howdy'];
    return greetingPatterns.some(pattern => message.includes(pattern));
  },
  
  // Get random greeting
  getRandomGreeting: function() {
    const greetings = this.medicalKnowledge.greetings;
    return greetings[Math.floor(Math.random() * greetings.length)];
  },
  
  // Match keywords in message to potential responses
  matchKeywords: function(message) {
    const matchedResponses = [];
    
    // Medical keywords and their related topics
    const keywordMap = {
      'pain': ['headache', 'firstaid'],
      'ache': ['headache'],
      'temperature': ['fever', 'covid19'],
      'hot': ['fever'],
      'cough': ['cold', 'flu', 'covid19'],
      'sneeze': ['cold', 'flu'],
      'congestion': ['cold', 'flu'],
      'tired': ['flu', 'sleep', 'stress'],
      'fatigue': ['flu', 'sleep', 'stress'],
      'sore throat': ['cold', 'flu', 'covid19'],
      'taste': ['covid19'],
      'smell': ['covid19'],
      'breathe': ['covid19'],
      'food': ['nutrition'],
      'diet': ['nutrition'],
      'eat': ['nutrition'],
      'workout': ['exercise'],
      'fitness': ['exercise'],
      'active': ['exercise'],
      'insomnia': ['sleep'],
      'awake': ['sleep'],
      'anxious': ['stress'],
      'worried': ['stress'],
      'cut': ['firstaid'],
      'burn': ['firstaid'],
      'bleeding': ['firstaid'],
      'emergency': ['firstaid']
    };
    
    // Check for keyword matches
    for (const [keyword, topics] of Object.entries(keywordMap)) {
      if (message.includes(keyword)) {
        // Add responses for all related topics
        topics.forEach(topic => {
          if (this.medicalKnowledge.topics[topic]) {
            matchedResponses.push(this.medicalKnowledge.topics[topic]);
          }
        });
      }
    }
    
    return [...new Set(matchedResponses)]; // Remove duplicates
  },
  
  // Check if we're online
  isOnline: function() {
    return navigator.onLine;
  },
  
  // Generate a simple report based on symptoms
  generateSimpleReport: function(symptoms) {
    const report = {
      date: new Date().toLocaleDateString(),
      summary: "Offline Generated Report",
      sections: [
        {
          title: "Symptom Assessment",
          content: `Based on the symptoms you've shared (${symptoms}), here are some general considerations. Please note this is not a diagnosis and you should consult with a healthcare provider when possible.`
        },
        {
          title: "General Recommendations",
          content: "Rest adequately, stay hydrated, and monitor your symptoms. If your condition worsens or you develop severe symptoms such as difficulty breathing, chest pain, or confusion, seek immediate medical attention."
        },
        {
          title: "Follow-up",
          content: "Please consult with a healthcare provider for proper evaluation and treatment recommendations when online connectivity is restored or you have access to medical care."
        }
      ]
    };
    
    // Add some relevant info based on keywords
    const lowerSymptoms = symptoms.toLowerCase();
    
    if (lowerSymptoms.includes('fever') || lowerSymptoms.includes('temperature')) {
      report.sections.splice(1, 0, {
        title: "Fever Management",
        content: "For fever, ensure adequate hydration and rest. Over-the-counter medications like acetaminophen or ibuprofen may help reduce fever. Cold compresses can provide comfort. If fever is high (above 103°F/39.4°C) or persistent, seek medical care when available."
      });
    }
    
    if (lowerSymptoms.includes('cough') || lowerSymptoms.includes('congestion') || lowerSymptoms.includes('sore throat')) {
      report.sections.splice(1, 0, {
        title: "Respiratory Symptoms",
        content: "For cough and congestion, staying hydrated helps thin mucus. A humidifier or steam from a shower may provide relief. For sore throat, warm saltwater gargles and throat lozenges can be soothing. Avoid irritants like smoking."
      });
    }
    
    if (lowerSymptoms.includes('pain') || lowerSymptoms.includes('ache')) {
      report.sections.splice(1, 0, {
        title: "Pain Management",
        content: "For general pain or aches, rest the affected area if possible. Over-the-counter pain relievers like acetaminophen or ibuprofen may help. Apply ice for acute pain or heat for muscle aches, using a barrier between the source and your skin."
      });
    }
    
    return report;
  }
};

// Export module
window.ApprieOfflineChat = ApprieOfflineChat; 