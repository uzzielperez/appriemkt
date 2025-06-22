const { Groq } = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const PDFParser = require('pdf2json');

exports.handler = async (event, context) => {
    console.log('Analyze-selection function called');
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: ''
        };
    }

    try {
        console.log('Processing selection analysis request...');
        
        // Parse multipart form data
        const boundary = event.headers['content-type'].split('boundary=')[1];
        const parts = event.body.split(`--${boundary}`);
        
        let documentBuffer = null;
        let selectionArea = null;
        let userMessage = 'Please analyze the selected area';
        
        for (const part of parts) {
            if (part.includes('name="document"')) {
                // Extract file data
                const fileDataStart = part.indexOf('\r\n\r\n') + 4;
                const fileDataEnd = part.lastIndexOf('\r\n');
                if (fileDataStart < fileDataEnd) {
                    documentBuffer = Buffer.from(part.slice(fileDataStart, fileDataEnd), 'binary');
                }
            } else if (part.includes('name="selectionArea"')) {
                const dataStart = part.indexOf('\r\n\r\n') + 4;
                const dataEnd = part.lastIndexOf('\r\n');
                if (dataStart < dataEnd) {
                    try {
                        selectionArea = JSON.parse(part.slice(dataStart, dataEnd));
                    } catch (e) {
                        console.error('Error parsing selection area:', e);
                    }
                }
            } else if (part.includes('name="message"')) {
                const dataStart = part.indexOf('\r\n\r\n') + 4;
                const dataEnd = part.lastIndexOf('\r\n');
                if (dataStart < dataEnd) {
                    userMessage = part.slice(dataStart, dataEnd);
                }
            }
        }

        if (!documentBuffer) {
            throw new Error('No document provided');
        }

        if (!selectionArea) {
            throw new Error('No selection area provided');
        }

        console.log('Selection area:', selectionArea);
        console.log('Document buffer size:', documentBuffer.length);

        // Extract text from PDF using coordinates-based approach
        const extractedText = await extractTextFromPDFArea(documentBuffer, selectionArea);
        
        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text could be extracted from the selected area. The selection might be in an image or non-text region.');
        }

        console.log('Extracted text length:', extractedText.length);

        // Truncate if too long (6000 char safety limit)
        const maxLength = 6000;
        const finalText = extractedText.length > maxLength 
            ? extractedText.substring(0, maxLength) + '...[truncated]'
            : extractedText;

        // Create analysis prompt
        const analysisPrompt = `You are a medical AI assistant analyzing a selected portion of a medical document.

**Selected Area Details:**
- Page: ${selectionArea.page}
- Coordinates: (${selectionArea.x1.toFixed(0)}, ${selectionArea.y1.toFixed(0)}) to (${selectionArea.x2.toFixed(0)}, ${selectionArea.y2.toFixed(0)})
- Area size: ${(selectionArea.x2 - selectionArea.x1).toFixed(0)} × ${(selectionArea.y2 - selectionArea.y1).toFixed(0)} pixels

**Extracted Text from Selected Area:**
${finalText}

**User Request:** ${userMessage}

Please provide a comprehensive medical analysis of this selected content. Focus on:
1. Key medical information in the selected area
2. Clinical significance of the findings
3. Relevant medical context and interpretations
4. Any recommendations or next steps if applicable
5. Relationships to standard medical practices or guidelines

If the text appears incomplete due to selection boundaries, acknowledge this and work with the available content.`;

        console.log('Sending analysis request to Groq...');

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: analysisPrompt
                }
            ],
            model: 'allam-2-7b',
            temperature: 0.7,
            max_tokens: 2048
        });

        const analysis = chatCompletion.choices[0]?.message?.content;

        if (!analysis) {
            throw new Error('No analysis received from AI model');
        }

        console.log('Analysis completed successfully');

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({
                success: true,
                analysis: analysis,
                selectionInfo: {
                    page: selectionArea.page,
                    coordinates: `(${selectionArea.x1.toFixed(0)}, ${selectionArea.y1.toFixed(0)}) to (${selectionArea.x2.toFixed(0)}, ${selectionArea.y2.toFixed(0)})`,
                    size: `${(selectionArea.x2 - selectionArea.x1).toFixed(0)} × ${(selectionArea.y2 - selectionArea.y1).toFixed(0)} pixels`,
                    extractedLength: finalText.length
                }
            })
        };

    } catch (error) {
        console.error('Analysis error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({
                success: false,
                error: error.message || 'Analysis failed'
            })
        };
    }
};

// Function to extract text from specific area of PDF
async function extractTextFromPDFArea(buffer, selectionArea) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();
        
        pdfParser.on('pdfParser_dataError', errData => {
            console.error('PDF parsing error:', errData.parserError);
            reject(new Error('Failed to parse PDF'));
        });
        
        pdfParser.on('pdfParser_dataReady', pdfData => {
            try {
                // Get the specific page
                const pageIndex = selectionArea.page - 1; // Convert to 0-based index
                const pages = pdfData.Pages;
                
                if (!pages || !pages[pageIndex]) {
                    reject(new Error(`Page ${selectionArea.page} not found in PDF`));
                    return;
                }
                
                const page = pages[pageIndex];
                const extractedText = [];
                
                // Convert selection coordinates to PDF coordinate system
                // Note: This is a simplified approach - real implementation would need proper coordinate mapping
                const normalizedSelection = {
                    x1: selectionArea.x1 / 1.5, // Adjust for canvas scale
                    y1: selectionArea.y1 / 1.5,
                    x2: selectionArea.x2 / 1.5,
                    y2: selectionArea.y2 / 1.5
                };
                
                // Extract text from texts array
                if (page.Texts) {
                    page.Texts.forEach(textObj => {
                        const x = textObj.x;
                        const y = textObj.y;
                        
                        // Check if text is within selection area (approximate)
                        if (x >= normalizedSelection.x1 && x <= normalizedSelection.x2 &&
                            y >= normalizedSelection.y1 && y <= normalizedSelection.y2) {
                            
                            const decodedText = decodeURIComponent(textObj.R[0].T);
                            extractedText.push(decodedText);
                        }
                    });
                }
                
                // If no text found in selection, try broader area or fallback
                if (extractedText.length === 0) {
                    // Fallback: extract some text from the page
                    if (page.Texts && page.Texts.length > 0) {
                        // Get first few text elements as fallback
                        const fallbackTexts = page.Texts.slice(0, 10).map(textObj => 
                            decodeURIComponent(textObj.R[0].T)
                        );
                        
                        resolve(`[Area selection approximation] ${fallbackTexts.join(' ')}`);
                    } else {
                        reject(new Error('No text found in the selected area or page'));
                    }
                } else {
                    resolve(extractedText.join(' '));
                }
                
            } catch (error) {
                console.error('Error processing PDF data:', error);
                reject(new Error('Failed to extract text from selected area'));
            }
        });
        
        pdfParser.parseBuffer(buffer);
    });
} 