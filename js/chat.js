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

    // Initialize privacy mode
    let isPrivacyMode = localStorage.getItem('privacyMode') === 'true';
    const privacyToggle = document.querySelector('.settings-item.privacy-toggle');

    // Set initial privacy state
    if (isPrivacyMode && privacyToggle) {
        privacyToggle.classList.add('active');
        const icon = privacyToggle.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-eye-slash';
        }
        applyPrivacyToExistingMessages();
    }

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

        // Ask for confirmation if privacy mode is active
        if (isPrivacyMode) {
            if (!confirm('Privacy mode is active. Do you want to include all messages in the PDF?')) {
                return;
            }
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

    // Privacy toggle handler
    if (privacyToggle) {
        privacyToggle.addEventListener('click', () => {
            isPrivacyMode = !isPrivacyMode;
            privacyToggle.classList.toggle('active');
            
            const icon = privacyToggle.querySelector('i');
            if (icon) {
                icon.className = isPrivacyMode ? 'fas fa-eye-slash' : 'fas fa-eye';
            }

            localStorage.setItem('privacyMode', isPrivacyMode);
            applyPrivacyToExistingMessages();
            
            // Debug log
            console.log('Privacy mode:', isPrivacyMode);
        });
    }

    function applyPrivacyToExistingMessages() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => {
            if (isPrivacyMode) {
                msg.classList.add('private');
            } else {
                msg.classList.remove('private');
            }
        });
    }

    // Update message adding function
    function addMessageToChat(message, role) {
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.textContent = message;
        
        if (isPrivacyMode) {
            messageDiv.classList.add('private');
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Debug log
        console.log('Added message with privacy:', isPrivacyMode);
    }

    // Add keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            if (privacyToggle) {
                privacyToggle.click();
            }
        }
    });

    // Auto-blur on inactivity
    let blurTimeout;
    document.addEventListener('mouseleave', () => {
        if (isPrivacyMode) {
            blurTimeout = setTimeout(applyPrivacyToExistingMessages, 30000);
        }
    });

    document.addEventListener('mouseenter', () => {
        if (blurTimeout) {
            clearTimeout(blurTimeout);
        }
    });

    // Add login-related elements
    const loginButton = document.querySelector('.login-button');
    const loginModal = document.querySelector('.login-modal');
    const loginForm = document.querySelector('.login-form');
    const loginMessage = document.querySelector('.login-message');
    const attachButton = document.querySelector('.fa-paperclip').parentElement;
    const microphoneButton = document.querySelector('.fa-microphone').parentElement;
    const modelOptions = document.querySelectorAll('.model-select option');

    let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    let currentFeature = '';

    // Initialize login state
    if (isLoggedIn && loginButton) {
        loginButton.classList.add('logged-in');
        loginButton.querySelector('i').className = 'fas fa-user-check';
    }

    // Login button handler
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            if (!isLoggedIn) {
                showLoginModal('account');
            }
        });
    }

    // Attach file handler
    if (attachButton) {
        attachButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isLoggedIn) {
                showLoginModal('file attachment');
            } else {
                // Handle file attachment for logged-in users
                // Add your file handling code here
            }
        });
    }

    // Microphone handler
    if (microphoneButton) {
        microphoneButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isLoggedIn) {
                showLoginModal('voice input');
            } else {
                // Handle microphone for logged-in users
                // Add your microphone handling code here
            }
        });
    }

    // Model select handler
    modelSelect?.addEventListener('change', (e) => {
        if (!isLoggedIn) {
            e.preventDefault();
            const selectedOption = e.target.options[e.target.selectedIndex].text;
            showLoginModal(`${selectedOption} model`);
            // Reset to first option
            e.target.selectedIndex = 0;
        }
    });

    function showLoginModal(feature) {
        currentFeature = feature;
        loginMessage.textContent = `Please login to access ${feature}`;
        modalOverlay.style.display = 'block';
        loginModal.style.display = 'block';
    }

    // Close modal on overlay click
    modalOverlay?.addEventListener('click', () => {
        loginModal.style.display = 'none';
        modalOverlay.style.display = 'none';
    });

    // Handle login form submission
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        // Add your actual login logic here
        console.log('Login attempt:', { email, feature: currentFeature });

        // For demo purposes, always "succeed"
        isLoggedIn = true;
        localStorage.setItem('isLoggedIn', 'true');
        
        // Update UI
        loginButton.classList.add('logged-in');
        loginButton.querySelector('i').className = 'fas fa-user-check';
        
        // Close modal
        loginModal.style.display = 'none';
        modalOverlay.style.display = 'none';

        // Clear form
        loginForm.reset();

        // Handle the original feature request
        handlePostLogin(currentFeature);
    });

    function handlePostLogin(feature) {
        switch(feature) {
            case 'file attachment':
                // Trigger file input
                break;
            case 'voice input':
                // Start voice recording
                break;
            default:
                if (feature.includes('model')) {
                    // Handle model selection
                }
                break;
        }
    }
});