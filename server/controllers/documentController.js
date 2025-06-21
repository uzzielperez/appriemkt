const fs = require('fs');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');
const pdfParse = require('pdf-parse');

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper function to extract text from PDF
async function extractTextFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
}

// Helper function to read text file
function readTextFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Store file info in memory or database
        const documentInfo = {
            id: Date.now().toString(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            mimetype: req.file.mimetype
        };

        // You might want to store this in a database instead
        // For now, we'll just return the info
        res.json({
            message: 'File uploaded successfully',
            document: documentInfo
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
};

exports.analyzeDocument = async (req, res) => {
    try {
        const { documentPath, analysisType } = req.body;
        
        if (!documentPath) {
            return res.status(400).json({ error: 'Document path is required' });
        }

        // Extract text based on file type
        let text;
        const ext = path.extname(documentPath).toLowerCase();
        
        if (ext === '.pdf') {
            text = await extractTextFromPDF(documentPath);
        } else if (ext === '.txt') {
            text = readTextFile(documentPath);
        } else {
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        // Prepare prompt based on analysis type
        let prompt = '';
        switch (analysisType) {
            case 'summary':
                prompt = `Please provide a concise summary of the following text:\n\n${text}`;
                break;
            case 'keyPoints':
                prompt = `Please extract the key points from the following text:\n\n${text}`;
                break;
            case 'analysis':
                prompt = `Please provide a detailed analysis of the following text, including main themes, arguments, and any notable findings:\n\n${text}`;
                break;
            default:
                prompt = `Please analyze the following text and provide key insights:\n\n${text}`;
        }

        // Get AI analysis
        const response = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 4000,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        res.json({
            analysis: response.content[0].text,
            documentInfo: {
                textLength: text.length,
                analysisType
            }
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Error analyzing document' });
    }
};

exports.getDocumentSummary = async (req, res) => {
    try {
        const { documentId } = req.params;
        
        // Here you would typically fetch the document from your database
        // For now, we'll just return an error
        res.status(404).json({ error: 'Document not found' });
        
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ error: 'Error getting document summary' });
    }
}; 