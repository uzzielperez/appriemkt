// netlify/functions/groq.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the incoming request
    const requestBody = JSON.parse(event.body);
    const { query, modelName, task } = requestBody;
    
    // Customize the prompt based on the task
    let prompt = query;
    switch (task) {
      case 'symptoms':
          prompt = `As a medical professional, analyze these symptoms and provide a detailed assessment: ${query}`;
          break;
      case 'report':
          prompt = `Generate a formal medical report summary with the following sections:

          PATIENT COMPLAINT:
          ${query}

          Please provide a structured response with these sections:
          1. Chief Complaint
          2. History of Present Illness
          3. Assessment
          4. Recommendations

          Format it clearly for a PDF report.`;
          break;
      case 'treatment':
          prompt = `Provide a detailed treatment plan for the following condition. Include medication recommendations, lifestyle changes, and follow-up care: ${query}`;
          break;
    }
    
    // Call the Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName || 'allam-2-7b',
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
        max_tokens: 1000,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const data = await groqResponse.json();
    
    // Return the successful response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        response: data.choices[0].message.content,
        tokens: data.usage?.total_tokens || 0,
        cost: (data.usage?.total_tokens || 0) * 0.00002
      })
    };
  } catch (error) {
    console.error('Error:', error);
    
    // Return the error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message,
        details: error.stack
      })
    };
  }
}; 