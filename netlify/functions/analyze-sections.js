const { Groq } = require('groq-sdk');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    console.log('=== Analyze Sections Called ===');

    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No body provided' }) };
    }

    const requestData = JSON.parse(event.body);
    console.log('Request data received:', {
      documentInfo: requestData.documentInfo,
      selectedSectionsCount: requestData.selectedSections?.length,
      userMessage: requestData.userMessage
    });

    if (!requestData.selectedSections || requestData.selectedSections.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No sections selected for analysis' }),
      };
    }

    if (!requestData.documentInfo) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Document information missing' }),
      };
    }

    const { selectedSections, documentInfo, userMessage } = requestData;

    // Combine selected sections text
    let combinedText = '';
    let totalCharCount = 0;
    let sectionSummary = [];

    selectedSections.forEach((section, index) => {
      combinedText += `\n\n=== ${section.title} ===\n${section.content}`;
      totalCharCount += section.charCount;
      sectionSummary.push(`${index + 1}. ${section.title} (${section.wordCount} words)`);
    });

    console.log('Combined text length:', combinedText.length);
    console.log('Total character count:', totalCharCount);

    // Ensure we don't exceed context limits - keep under 6000 characters for safety
    const maxLength = 6000;
    if (combinedText.length > maxLength) {
      console.log('Text too long, truncating from', combinedText.length, 'to', maxLength);
      combinedText = combinedText.substring(0, maxLength) + '\n\n[Note: Content truncated due to length. Consider selecting fewer sections for complete analysis.]';
    }

    // Create analysis prompt
    const analysisPrompt = userMessage || 'Please provide a comprehensive medical analysis of these document sections';
    
    const prompt = `Please analyze the following sections from the document "${documentInfo.filename}":

Selected Sections:
${sectionSummary.join('\n')}

User Request: ${analysisPrompt}

Document Content:
${combinedText}

Please provide a comprehensive analysis that includes:
1. **Summary of Key Points**: Main findings and important information from the selected sections
2. **Medical Insights**: Clinical significance, implications, and interpretation
3. **Critical Information**: Any urgent findings, contraindications, or important notes
4. **Recommendations**: Suggested actions, follow-up, or areas requiring attention
5. **Section-Specific Notes**: Key points from each analyzed section

Focus on the medical content and provide evidence-based insights where applicable.

Analysis:`;

    console.log('Calling Groq API with prompt length:', prompt.length);

    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Groq API key not configured' }),
      };
    }

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful medical AI assistant with expertise in analyzing medical documents, research papers, clinical reports, and healthcare-related content. Provide accurate, evidence-based medical information and insights. When analyzing documents, focus on clinical relevance, medical accuracy, and practical implications for patient care.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'allam-2-7b',
      temperature: 0.7,
      max_tokens: 2000,
    });

    const analysis = response.choices[0].message.content;
    console.log('Analysis completed, length:', analysis.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: analysis,
        analyzedSections: selectedSections.length,
        documentInfo: documentInfo,
        sectionSummary: sectionSummary,
        totalCharactersAnalyzed: totalCharCount,
        promptLength: prompt.length
      }),
    };

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Handle specific Groq API errors
    if (error.message && error.message.includes('context_length_exceeded')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Selected content is too long for analysis',
          suggestion: 'Please select fewer sections or shorter sections to stay within context limits.',
          details: 'The combined text from selected sections exceeds the AI model\'s context window.'
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Analysis failed', 
        details: error.message,
        suggestion: 'Please try again with fewer or shorter sections selected.'
      }),
    };
  }
}; 