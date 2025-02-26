const { OpenAI } = require('openai');

exports.handler = async function(event, context) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const body = JSON.parse(event.body);
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: body.messages || [{ role: "user", content: body.message }]
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ response: completion.choices[0].message.content })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};