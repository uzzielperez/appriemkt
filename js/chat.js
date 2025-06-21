// Existing chat.js code...

// File upload handling
let currentFile = null;

document.getElementById('attachment-button').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentFile = file;
        const container = document.getElementById('file-upload-container');
        const preview = document.getElementById('file-preview');
        
        // Show file preview
        container.classList.add('show');
        preview.innerHTML = `
            <i class="fas fa-file"></i>
            <span class="file-name">${file.name}</span>
            <i class="fas fa-times remove-file" onclick="removeFile()"></i>
        `;
    }
});

function removeFile() {
    currentFile = null;
    const container = document.getElementById('file-upload-container');
    const preview = document.getElementById('file-preview');
    container.classList.remove('show');
    preview.innerHTML = '';
    document.getElementById('file-input').value = '';
}

// Modified sendMessage function to handle file uploads
async function sendMessage() {
    const messageInput = document.getElementById('searchInput');
    const message = messageInput.value.trim();
    
    if (!message && !currentFile) return;

    // Add user message to chat
    addMessageToChat('user', message);
    messageInput.value = '';

    try {
        let response;
        
        if (currentFile) {
            // Create FormData and append file
            const formData = new FormData();
            formData.append('document', currentFile);
            formData.append('message', message);

            // Upload file and get analysis
            const uploadResponse = await fetch('/.netlify/functions/document-handler', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('File upload failed');
            }

            const { documentId } = await uploadResponse.json();

            // Get analysis of the document
            response = await fetch('/.netlify/functions/document-handler', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    documentId,
                    analysisType: 'analysis',
                    message
                })
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const analysisResult = await response.json();
            addMessageToChat('assistant', analysisResult.analysis);

            // Clear the file upload
            removeFile();
        } else {
            // Regular chat message processing
            response = await fetch('/.netlify/functions/chat-handler', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    model: document.getElementById('modelSelect').value
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            addMessageToChat('assistant', data.response);
        }
    } catch (error) {
        console.error('Error:', error);
        addMessageToChat('assistant', 'Sorry, there was an error processing your request. Please try again.');
    }
}

// Add click and enter key handlers for the submit button
document.getElementById('submit-button').addEventListener('click', sendMessage);

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}); 