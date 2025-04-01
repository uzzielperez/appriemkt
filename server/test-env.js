require('dotenv').config();

console.log('Environment Variables Test:');
console.log('---------------------------');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set (starts with: ' + process.env.OPENAI_API_KEY.substring(0, 3) + '...)' : 'Not set');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'Set (starts with: ' + process.env.ANTHROPIC_API_KEY.substring(0, 3) + '...)' : 'Not set');
console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? 'Set (starts with: ' + process.env.DEEPSEEK_API_KEY.substring(0, 3) + '...)' : 'Not set');
console.log('---------------------------');
console.log('Raw DEEPSEEK_API_KEY value:', process.env.DEEPSEEK_API_KEY);
console.log('---------------------------'); 