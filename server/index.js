require('dotenv').config();
const app = require('./app');

// Add startup logging
console.log('\n=== SERVER STARTUP ===');
console.log('----------------------------------------');
console.log('Environment Variables Check:');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✓ Present' : '✗ Missing');
console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '✓ Present' : '✗ Missing');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✓ Present' : '✗ Missing');
console.log('----------------------------------------');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
  console.log('----------------------------------------');
});

// Add error handling
server.on('error', (error) => {
  console.error('Server error:', error);
});