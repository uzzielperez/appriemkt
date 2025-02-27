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
    const pdfButton = document.querySelector('.pdf-button');
    let currentTask = 'symptoms';
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
    if (pdfButton) {
        pdfButton.addEventListener('click', generatePDF);
    }

    function generatePDF() {
        if (!messagesContainer || !messagesContainer.children.length) {
            alert('No content to generate PDF from!');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let yPosition = margin;

            // Add logo
            const logoImg = new Image();
            logoImg.src = 'assets/img/triangular-logo.png';

            logoImg.onload = function() {
                // Add logo
                const logoWidth = 20;
                const logoHeight = (logoWidth * logoImg.height) / logoImg.width;
                doc.addImage(logoImg, 'PNG', margin, yPosition, logoWidth, logoHeight);

                // Add Apprie text next to logo
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.text('Apprie', margin + logoWidth + 5, yPosition + (logoHeight/2));

                // Move position down after header
                yPosition += Math.max(logoHeight, 10) + 10;

                // Add report title and date
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                const title = `Medical Report`;
                const date = `Date: ${new Date().toLocaleString()}`;
                
                doc.text(title, margin, yPosition);
                yPosition += 7;
                doc.text(date, margin, yPosition);
                yPosition += 15;

                // Add messages with pagination
                doc.setFontSize(12);
                const messages = Array.from(messagesContainer.children);
                
                messages.forEach(msg => {
                    const role = msg.classList.contains('user') ? 'Patient' : 'MedCopilot';
                    const content = `${role}: ${msg.textContent}`;
                    
                    // Split text to fit page width
                    const splitText = doc.splitTextToSize(content, pageWidth - (2 * margin));
                    
                    // Check if we need a new page
                    if (yPosition + (splitText.length * 7) > pageHeight - margin) {
                        doc.addPage();
                        yPosition = margin;
                    }
                    
                    // Add text
                    doc.text(splitText, margin, yPosition);
                    yPosition += (splitText.length * 7) + 5;
                });

                // Save the PDF
                doc.save(`apprie-medical-report-${new Date().toISOString().slice(0,10)}.pdf`);
            };

            logoImg.onerror = function() {
                console.error('Error loading logo');
                generatePDFWithoutLogo();
            };

        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Error generating PDF. Please try again.');
        }
    }

    // Fallback function if logo fails to load
    function generatePDFWithoutLogo() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPosition = margin;

        // Add title without logo
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Apprie Medical Report', margin, yPosition);
        yPosition += 15;

        // Add date
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${new Date().toLocaleString()}`, margin, yPosition);
        yPosition += 15;

        // Add messages with pagination
        const messages = Array.from(messagesContainer.children);
        
        messages.forEach(msg => {
            const role = msg.classList.contains('user') ? 'Patient' : 'MedCopilot';
            const content = `${role}: ${msg.textContent}`;
            
            const splitText = doc.splitTextToSize(content, pageWidth - (2 * margin));
            
            if (yPosition + (splitText.length * 7) > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
            }
            
            doc.text(splitText, margin, yPosition);
            yPosition += (splitText.length * 7) + 5;
        });

        doc.save(`apprie-medical-report-${new Date().toISOString().slice(0,10)}.pdf`);
    }

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

    // Add clear chat functionality
    const clearChatButton = document.querySelector('.clear-chat');

    if (clearChatButton && messagesContainer) {
        clearChatButton.addEventListener('click', () => {
            // Ask for confirmation
            if (confirm('Are you sure you want to clear the chat history?')) {
                messagesContainer.innerHTML = ''; // Clear all messages
                console.log('Chat history cleared');
            }
        });
    }

    // Settings dropdown functionality
    const settingsButton = document.querySelector('.settings-button');
    const settingsDropdown = document.querySelector('.settings-dropdown');
    
    settingsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        settingsDropdown.classList.remove('show');
    });

    // Settings actions
    document.querySelector('.settings-item.generate-pdf').addEventListener('click', generatePDF);
    
    document.querySelector('.settings-item.clear-chat').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the chat history?')) {
            document.querySelector('.messages-container').innerHTML = '';
        }
    });

    document.querySelector('.settings-item.privacy-toggle').addEventListener('click', () => {
        const icon = document.querySelector('.settings-item.privacy-toggle i');
        const isPrivate = icon.classList.contains('fa-eye-slash');
        
        icon.className = isPrivate ? 'fas fa-eye' : 'fas fa-eye-slash';
        togglePrivacyMode(!isPrivate);
    });

    document.querySelector('.settings-item.login').addEventListener('click', () => {
        // Implement login functionality
        alert('Login functionality coming soon!');
    });

    function togglePrivacyMode(enabled) {
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => {
            msg.classList.toggle('private', enabled);
        });
    }
});