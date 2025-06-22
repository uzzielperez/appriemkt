# Apprie - Open Healthcare and AI

**Apprie** is a platform that merges healthcare with cutting-edge AI, offering a chat interface powered by multiple LLMs (ChatGPT, Claude, Grok, DeepSeek, and a Medical LLM). Users can ask medical questions, upload files (PDFs, images), record voice inputs, and trigger deep searches for medical context—all wrapped in a sleek, Grok-inspired UI.

## Project Structure
```bash
appriemkt/
├── assets/          # Images and favicon
│   ├── favicon.ico
│   └── img/
├── css/             # Stylesheets
│   ├── styles.css   # Bootstrap theme
│   └── chat.css     # Chat UI styles
├── js/              # Frontend scripts
│   ├── chat.js      # Chat logic
│   └── scripts.js   # Bootstrap JS
├── server/          # Backend
│   ├── index.js     # Express server
│   ├── .env         # API keys (not in Git)
│   ├── node_modules/
│   ├── package.json
│   └── package-lock.json
├── index.html       # Landing page
├── chat.html        # Chat interface
├── .gitignore       # Git ignore
└── README.md        # This file
``` 


## Features
- **Multi-API Chat**: Choose from ChatGPT, Claude, Grok, DeepSeek, or a Medical LLM.
- **File Uploads**: Attach medical data (PDFs, images, text).
- **Document Parsing**: Upload and analyze PDF, TXT, DOC, and DOCX files with AI-powered analysis.
- **Voice Input**: Record and process audio queries.
- **Deep Search**: Pull medical insights from web/X sources.
- **Stripe Payments**: Token-based subscriptions.
- **Grok-like Design**: Dark, neon, futuristic UI.

## Document Upload & Analysis

Apprie supports intelligent document processing with the following capabilities:

### Supported File Types
- **PDF Documents** (.pdf): Full text extraction using pdf-parse library
- **Text Files** (.txt): Direct UTF-8 text processing
- **Word Documents** (.doc/.docx): Basic text extraction (limited support)

### How to Upload Documents
1. Click the paperclip (📎) icon in the chat interface
2. Select your document from the file picker
3. Click the upload button (📤) in the file preview
4. The system will automatically:
   - Extract text content from your document
   - Send it to Groq AI for comprehensive analysis
   - Display the AI analysis in the chat

### Document Analysis Features
The AI provides comprehensive analysis including:
- Main topics and key points extraction
- Important findings and conclusions
- Medical/clinical relevance assessment (when applicable)
- Summary of key information
- Contextual insights based on document content

### PDF Viewer with Area Selection
Apprie now includes an advanced PDF viewer with interactive selection capabilities:

- **📄 High-Quality PDF Rendering**: Uses PDF.js for professional document display
- **🖱️ Interactive Navigation**: Page-by-page browsing with Previous/Next controls
- **🎯 Drag-to-Select Areas**: Draw selection boxes on any part of the PDF
- **🧠 Area-Specific Analysis**: Analyze only the selected portion of the document
- **📱 Responsive Design**: Works seamlessly across desktop and mobile devices
- **🔄 Dual Analysis Options**: Choose between section-based or area-based analysis

### How to Use PDF Viewer
1. Upload a PDF document using the paperclip icon
2. The document sidebar will open showing both sections and the PDF viewer
3. Navigate through pages using the controls
4. Click and drag on the PDF to select specific areas
5. Click "Analyze Selection" to get AI analysis of just that area

### Technical Implementation
- **Backend**: Multiple Netlify serverless functions:
  - `/netlify/functions/document-parser.js` - Document parsing and section detection
  - `/netlify/functions/analyze-sections.js` - Section-based analysis
  - `/netlify/functions/analyze-selection.js` - Area-based analysis
- **AI Processing**: Groq's allam-2-7b model
- **PDF Rendering**: PDF.js library for client-side rendering
- **Text Extraction**: 
  - PDF: Enhanced 5-strategy extraction with coordinate mapping
  - Text: Direct UTF-8 encoding
  - Word: Basic text extraction with character filtering
- **Content Limits**: Documents are processed up to ~6000 characters for optimal performance
- **Error Handling**: Comprehensive error reporting for unsupported formats or parsing failures

### 🛡️ Privacy & Security Excellence
**Your data is completely secure with Apprie:**

✅ **GDPR/Privacy Compliant** - No user data stored  
✅ **Zero Data Retention** - Files processed and immediately discarded  
✅ **Session-Based Only** - Everything cleared between sessions  
✅ **Memory-Only Processing** - No disk writes or persistent storage  

**How it works:**
- Files are processed entirely in memory during the HTTP request
- No databases, file systems, or persistent storage used
- All data is automatically garbage collected after analysis
- Each session is completely isolated and temporary

## Prerequisites
- Node.js (v23.3.0+)
- npm
- Git
- Netlify CLI (`npm install -g netlify-cli`)
- Heroku CLI (or AWS CLI)
- API Keys: OpenAI, Anthropic, Groq, xAI, DeepSeek, Medical LLM, Stripe

```bash
npm install express axios stripe multer dotenv groq-sdk pdf-parse lambda-multipart-parser pg
``` 

## Setup
### Frontend
1. **Check Files**:
   - Ensure `index.html`, `chat.html`, `css/`, `js/`, and `assets/` are in the root.
2. **Update URLs**:
   - In `js/chat.js`, set `BACKEND_CONFIG` to your backend URL (e.g., `http://localhost:3000`).

### Backend
1. **Navigate**:
   ```bash
   cd server
   ```
2. **Install**:
   ```bash
   npm install
   npm init -y
   ```  
   ```bash
   npm install express axios stripe multer dotenv groq-sdk pdf-parse lambda-multipart-parser pg
   ```
   - Ensure `package.json` and `package-lock.json` are present.
## Runing Locally

1. **Backend**:
   ```bash
   cd server
   node index.js   
   ```

   * Runs on `http://localhost:3000` by default

2. **Frontend**:
   ```bash
   cd ..
   npx live-server
   ```

   * Runs on `http://localhost:8080/index.html` by default

3. **Test**: Click "Test our Product" to access the chat.

4. **Serve the frontend**:
   - Using VS Code: Install "Live Server" extension and click "Go Live"
   - Or use any HTTP server of your choice

### Dependencies

Server-side packages:
- express: Web framework for Node.js
- cors: Enable Cross-Origin Resource Sharing
- dotenv: Environment variable management
- multer: Handle multipart/form-data
- openai: OpenAI API client
- @anthropic-ai/sdk: Anthropic API client
- groq-sdk: Groq AI API client for document analysis
- pdf-parse: PDF text extraction library
- lambda-multipart-parser: Netlify function multipart form handling
- pg: PostgreSQL client (for database integration)
- jspdf: PDF generation

Frontend libraries (CDN):
- jsPDF: PDF generation in browser
- Font Awesome: Icons

## Usage

1. Open the application in your browser (default: http://localhost:5500)
2. Type your medical query in the search box
3. Select a task type:
   - General Chat: General medical questions
   - Symptom Analysis: Detailed symptom assessment
   - Generate Report: Create medical reports (with PDF export)
   - Treatment Plan: Get treatment recommendations
4. View AI responses in the chat interface
5. For reports, click the PDF icon to download

## Development

### Project Structure

## Deployment

### Frontend (Netlify):

```bash
netlify deploy
netlify deploy --prod
```

### Backend (Heroku):

```bash
cd server
heroku create your-app-name
git init
git add .
git commit -m "Deploy backend"
git push heroku main
heroku config:set OPENAI_API_KEY=your_openai_key  # Repeat for all keys
```

Update js/chat.js with Heroku URL (e.g., https://your-app-name.herokuapp.com).

## Netlify

Link netlify and start local devleopment server.
```bash
npm install -g netlify-cli
netlify link 
netlify dev
```

### Automatic Environment Variables Setup from Local to Production

First go to the root directory and make sure you link your project to netlify.
Use Netlify CLI to import environment variables from local .env file to production (without exposing the .env file to the public).

```bash
netlify env: import .env
```      

Deploy to netlify.
```bash
netlify deploy
```

Important security notes:
* Never commit .env file to the repository.
* Rotate your API keys regularly.
* Consider setting up appropriate usage limits on your API keys.
* Use separate API keys for development and production environments.

# Contributing

Clone: git clone <repo-url>
Branch: git checkout -b your-feature
Commit: git commit -m "Your message"
Push: git push origin your-feature
PR: Submit on GitHub.

## License
Licensed under the [GNU Affero General Public License v3.0](./LICENSE). This project is open-source with a copyleft approach—any derivative works, including networked use, must also be licensed under AGPL-3.0 and shared with the community.

### Environment Variables

Required environment variables in `.env`:
- `OPENAI_API_KEY`: Your OpenAI API key
- `ANTHROPIC_API_KEY`: Your Anthropic API key (optional)
- `GROQ_API_KEY`: Your Groq API key (required for document analysis)
- `PORT`: Server port (default: 3000)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for GPT-4 API
- Anthropic for Claude API
- jsPDF for PDF generation