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
- **Voice Input**: Record and process audio queries.
- **Deep Search**: Pull medical insights from web/X sources.
- **Stripe Payments**: Token-based subscriptions.
- **Grok-like Design**: Dark, neon, futuristic UI.

## Prerequisites
- Node.js (v23.3.0+)
- npm
- Git
- Netlify CLI (`npm install -g netlify-cli`)
- Heroku CLI (or AWS CLI)
- API Keys: OpenAI, Anthropic, xAI, DeepSeek, Medical LLM, Stripe

```bash
npm install express axios stripe multer dotenv
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