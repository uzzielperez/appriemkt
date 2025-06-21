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
        
        // Show file preview with upload button
        container.classList.add('show');
        preview.innerHTML = `
            <i class="fas fa-file"></i>
            <span class="file-name">${file.name}</span>
            <button class="upload-file-btn" onclick="uploadFile()" title="Upload and analyze file">
                <i class="fas fa-upload"></i>
            </button>
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

// Function to upload file directly
async function uploadFile() {
    if (!currentFile) return;
    
    try {
        // Show uploading state
        const uploadBtn = document.querySelector('.upload-file-btn');
        if (uploadBtn) {
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            uploadBtn.disabled = true;
        }
        
        // Add user message indicating file upload
        addMessageToChat('user', `📎 Uploaded: ${currentFile.name}`);
        
        // Create FormData and append file
        const formData = new FormData();
        formData.append('document', currentFile);
        formData.append('message', 'Please analyze this document');

        // Upload file and get analysis
        const uploadResponse = await fetch('/.netlify/functions/document-handler', {
            method: 'POST',
            body: formData
        });

        console.log('Upload response status:', uploadResponse.status);
        console.log('Upload response headers:', uploadResponse.headers);

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Server error response:', errorText);
            throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const result = await uploadResponse.json();
        console.log('Upload result:', result);
        
        if (result.analysis) {
            addMessageToChat('assistant', result.analysis);
        } else if (result.documentId) {
            addMessageToChat('assistant', 'Document uploaded successfully! You can now ask questions about it.');
        }

        // Clear the file upload
        removeFile();
        
    } catch (error) {
        console.error('Error:', error);
        addMessageToChat('assistant', 'Sorry, there was an error uploading your file. Please try again.');
        
        // Reset upload button
        const uploadBtn = document.querySelector('.upload-file-btn');
        if (uploadBtn) {
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i>';
            uploadBtn.disabled = false;
        }
    }
}

// Modified sendMessage function to handle file uploads
async function sendMessage() {
    const messageInput = document.getElementById('searchInput');
    const message = messageInput.value.trim();
    
    // Allow sending if there's a message OR a file
    if (!message && !currentFile) return;

    // Add user message to chat (if there's a message)
    if (message) {
        addMessageToChat('user', message);
    }
    messageInput.value = '';

    try {
        let response;
        
        if (currentFile) {
            // Create FormData and append file
            const formData = new FormData();
            formData.append('document', currentFile);
            formData.append('message', message || 'Please analyze this document');

            // Upload file and get analysis
            const uploadResponse = await fetch('/.netlify/functions/document-handler', {
                method: 'POST',
                body: formData
            });

            console.log('Upload response status:', uploadResponse.status);
            console.log('Upload response headers:', uploadResponse.headers);

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('Server error response:', errorText);
                throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
            }

            const result = await uploadResponse.json();
            console.log('Upload result:', result);
            
            if (result.analysis) {
                addMessageToChat('assistant', result.analysis);
            } else if (result.documentId) {
                addMessageToChat('assistant', 'Document uploaded successfully! You can now ask questions about it.');
            }

            // Clear the file upload
            removeFile();
        } else {
            // Regular chat message processing
            response = await fetch('/.netlify/functions/groq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: message,
                    model: 'groq',
                    modelName: document.getElementById('model-select').value,
                    task: 'clinical'
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

// Helper function to add messages to chat
function addMessageToChat(sender, message) {
    const messagesContainer = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = message;
    messagesContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
}

// Add click and enter key handlers for the submit button
document.getElementById('submit-button').addEventListener('click', sendMessage);

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}); 