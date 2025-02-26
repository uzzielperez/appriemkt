const { Anthropic } = require('@anthropic-ai/sdk');

exports.handler = async function(event, context) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const body = JSON.parse(event.body);
  
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      messages: body.messages || [{ role: "user", content: body.message }]
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ response: message.content[0].text })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};