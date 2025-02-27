console.log('chat.js loaded');

// Simplified configuration - just use local for now
const BACKEND_URL = 'http://localhost:3000';

let isSubscriber = false; // This will come from your auth system
let isPrivacyEnabled = false;
let encryptionKey = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat.js loaded');

    // Get DOM elements
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

    console.log('Submit button:', submitButton);
    console.log('Chat modal:', chatModal);

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

    const privacyToggle = document.querySelector('.privacy-toggle');
    const privacyMenu = document.querySelector('.privacy-menu');
    const upgradeButton = document.querySelector('.upgrade-button');
    
    // Privacy toggle handler
    privacyToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        privacyMenu.style.display = privacyMenu.style.display === 'none' ? 'block' : 'none';
    });

    // Close privacy menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!privacyMenu.contains(e.target) && !privacyToggle.contains(e.target)) {
            privacyMenu.style.display = 'none';
        }
    });

    // Upgrade button handler
    upgradeButton.addEventListener('click', () => {
        // Replace with your subscription flow
        window.location.href = '/subscribe';
    });

    async function sendMessage(message) {
        if (isPrivacyEnabled && !isSubscriber) {
            addMessage('Please upgrade to Pro to enable privacy features', false);
            return;
        }

        let processedMessage = message;
        if (isPrivacyEnabled && isSubscriber) {
            // Encrypt message if privacy is enabled
            processedMessage = await encryptMessage(message);
        }

        addMessage(processedMessage, true);
        const loadingId = addLoadingMessage();

        try {
            const formData = new FormData();
            formData.append('query', processedMessage);
            formData.append('model', modelSelect ? modelSelect.value : 'openai');
            formData.append('task', currentTask);

            console.log('Sending request:', {
                message: processedMessage,
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
    submitButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Submit clicked!');
        
        if (chatModal) {
            chatModal.style.display = 'flex';
            console.log('Showing modal');
        } else {
            console.error('Chat modal not found!');
        }
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

    // Encryption helper functions
    async function generateEncryptionKey() {
        const key = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
        return key;
    }

    async function encryptMessage(message) {
        if (!encryptionKey) {
            encryptionKey = await generateEncryptionKey();
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            encryptionKey,
            data
        );

        return {
            data: Array.from(new Uint8Array(encryptedData)),
            iv: Array.from(iv)
        };
    }

    async function decryptMessage(encryptedData) {
        if (!encryptionKey) return null;

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: new Uint8Array(encryptedData.iv)
            },
            encryptionKey,
            new Uint8Array(encryptedData.data)
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }

    // Add subscription check
    function checkSubscription() {
        // Replace with your actual subscription check
        fetch('/api/check-subscription')
            .then(response => response.json())
            .then(data => {
                isSubscriber = data.isSubscriber;
                updatePrivacyControls();
            })
            .catch(error => console.error('Subscription check failed:', error));
    }

    function updatePrivacyControls() {
        const privacyOptions = document.querySelectorAll('.privacy-option input');
        const subscriptionStatus = document.querySelector('.subscription-status');
        
        if (isSubscriber) {
            privacyOptions.forEach(option => option.disabled = false);
            subscriptionStatus.textContent = 'Pro Plan';
            subscriptionStatus.style.color = 'var(--primary-color)';
        }
    }

    // Initial subscription check
    checkSubscription();

    const themeToggle = document.querySelector('.theme-toggle-btn');
    let currentTheme = 'dark';

    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission
            
            switch(currentTheme) {
                case 'dark':
                    setTheme('light');
                    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                    break;
                case 'light':
                    setTheme('teal');
                    themeToggle.innerHTML = '<i class="fas fa-palette"></i>';
                    break;
                case 'teal':
                    setTheme('dark');
                    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                    break;
            }
        });
    }

    const privacyToggle = document.querySelector('.privacy-toggle');
    if (privacyToggle) {
        privacyToggle.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission
            // Toggle privacy menu or settings
            alert('Privacy settings coming soon!');
        });
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        currentTheme = theme;
        localStorage.setItem('preferred-theme', theme);
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme) {
        setTheme(savedTheme);
        // Update toggle button icon
        switch(savedTheme) {
            case 'light':
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                break;
            case 'teal':
                themeToggle.innerHTML = '<i class="fas fa-palette"></i>';
                break;
            case 'dark':
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                break;
        }
    }

    // Also try clicking anywhere to show modal (temporary test)
    document.addEventListener('click', () => {
        console.log('Document clicked');
        if (chatModal) {
            chatModal.style.display = 'flex';
        }
    });

    // Make sure the modal is in the correct initial state
    if (chatModal) {
        chatModal.style.display = 'none';
        chatModal.style.position = 'fixed';
        chatModal.style.zIndex = '9999';
    }
});