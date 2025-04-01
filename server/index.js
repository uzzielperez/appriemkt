require('dotenv').config();
const app = require('./app');

// Add startup logging
console.log('\n=== SERVER STARTUP ===');
console.log('----------------------------------------');
console.log('Environment Variables Check:');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✓ Present' : '✗ Missing');
console.log('----------------------------------------');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
  console.log('----------------------------------------');
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    const newServer = app.listen(PORT + 1, () => {
      console.log(`\n🚀 Server is running at http://localhost:${PORT + 1}`);
      console.log('----------------------------------------');
    });
  } else {
    console.error('Server error:', error);
  }
});