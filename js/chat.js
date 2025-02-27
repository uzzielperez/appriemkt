console.log('chat.js loaded');

// Simplified configuration - just use local for now
const BACKEND_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');

    const searchInput = document.querySelector('.search-input');
    const submitButton = document.querySelector('.submit-button');
    const chatModal = document.querySelector('.chat-modal');
    const modalOverlay = document.querySelector('.modal-overlay');
    const closeChat = document.querySelector('.close-chat');
    const chatInput = document.querySelector('.chat-input');
    const chatSendButton = document.querySelector('.chat-send-button');
    const messagesContainer = document.querySelector('.messages-container');
    const modelSelect = document.querySelector('#model-select');

    const taskButtons = document.querySelectorAll('.task-button');
    const downloadPdfButton = document.querySelector('.download-pdf-button');
    let currentTask = 'chat';
    let reportData = null;

    // Initialize first task button as active
    if (taskButtons.length > 0) {
        taskButtons[0].classList.add('active');
    }

    // Make sure jsPDF is loaded
    if (window.jspdf) {
        console.log('jsPDF loaded successfully');
    } else {
        console.error('jsPDF not loaded - PDF generation will not work');
    }

    // Auto-resize textareas
    [searchInput, chatInput].forEach(textarea => {
        if (textarea) {
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }
    });

    // Show modal and overlay
    function showChat() {
        modalOverlay.style.display = 'block';
        chatModal.style.display = 'flex';
    }

    // Hide modal and overlay
    function hideChat() {
        modalOverlay.style.display = 'none';
        chatModal.style.display = 'none';
    }

    // Task button handlers
    taskButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Switching to task:', button.dataset.task);
            taskButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentTask = button.dataset.task;
            
            if (currentTask === 'report') {
                downloadPdfButton.style.display = 'block';
                console.log('PDF button shown');
            } else {
                downloadPdfButton.style.display = 'none';
                console.log('PDF button hidden');
            }
        });
    });

    async function sendMessage(message) {
        addMessage(message, true);
        const loadingId = addLoadingMessage();

        try {
            const formData = new FormData();
            formData.append('query', message);
            formData.append('model', modelSelect ? modelSelect.value : 'openai');
            formData.append('task', currentTask);

            console.log('Sending request:', {
                message,
                task: currentTask,
                model: modelSelect ? modelSelect.value : 'openai'
            });

            const response = await fetch(`${BACKEND_URL}/api/query`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            removeLoadingMessage(loadingId);

            if (currentTask === 'report') {
                console.log('Setting report data');
                reportData = data.response;
                downloadPdfButton.style.display = 'block';
            }

            addMessage(data.response, false);
            
        } catch (error) {
            console.error('Error:', error);
            removeLoadingMessage(loadingId);
            addMessage('Sorry, there was an error processing your request: ' + error.message, false);
        }
    }

    function addMessage(content, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
        messageDiv.textContent = content;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function addLoadingMessage() {
        const loadingDiv = document.createElement('div');
        const id = 'loading-' + Date.now();
        loadingDiv.id = id;
        loadingDiv.className = 'message assistant loading';
        loadingDiv.textContent = 'Thinking...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return id;
    }

    function removeLoadingMessage(id) {
        const loadingDiv = document.getElementById(id);
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    // Category selection
    const categories = document.querySelectorAll('.category');
    categories.forEach(category => {
        category.addEventListener('click', function() {
            categories.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Suggested prompts
    const promptCards = document.querySelectorAll('.prompt-card');
    promptCards.forEach(card => {
        card.addEventListener('click', function() {
            const promptText = this.querySelector('.prompt-text').textContent;
            searchInput.value = promptText;
            searchInput.style.height = 'auto';
            searchInput.style.height = (searchInput.scrollHeight) + 'px';
            searchInput.focus();
        });
    });

    // PDF Generation
    downloadPdfButton.addEventListener('click', () => {
        console.log('PDF button clicked');
        console.log('Current report data:', reportData);

        if (!reportData) {
            console.error('No report data available');
            addMessage('Error: Please generate a report first', false);
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Add title
            doc.setFontSize(20);
            doc.text('Medical Report', 105, 20, { align: 'center' });

            // Add date
            doc.setFontSize(12);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);

            // Add report content
            doc.setFontSize(12);
            const margin = 20;
            const pageWidth = doc.internal.pageSize.width - (2 * margin);
            
            // Format the content nicely
            const formattedReport = reportData.split('\n').join('\n\n'); // Add extra spacing between lines
            const splitText = doc.splitTextToSize(formattedReport, pageWidth);
            
            doc.text(splitText, margin, 50);

            // Save the PDF
            doc.save('medical-report.pdf');
            console.log('PDF generated successfully');
            addMessage('✅ PDF report generated and downloaded!', false);
        } catch (error) {
            console.error('PDF generation error:', error);
            addMessage('Error generating PDF: ' + error.message, false);
        }
    });

    // Submit button handler
    submitButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (!query) return;

        // Show chat modal
        chatModal.style.display = 'flex';
        
        // Set initial task to 'report' and update UI
        currentTask = 'report';
        taskButtons.forEach(button => {
            if (button.dataset.task === 'report') {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Show PDF button
        downloadPdfButton.style.display = 'block';
        
        // Send initial message
        sendMessage(query);
        
        // Clear search input
        searchInput.value = '';
        searchInput.style.height = 'auto';
    });

    // Chat send button handler
    chatSendButton.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (!message) return;
        
        sendMessage(message);
        chatInput.value = '';
        chatInput.style.height = 'auto';
    });

    // Close chat handler
    closeChat.addEventListener('click', () => {
        chatModal.style.display = 'none';
        // Clear report data when closing chat
        reportData = null;
    });
});