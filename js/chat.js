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
            console.log('Category clicked:', this.textContent); // Debug log
            
            // Remove active class from all categories
            categories.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked category
            this.classList.add('active');

            if (this.textContent.trim() === 'Products') {
                console.log('Products category clicked'); // Debug log
                
                // Hide chat interface
                const chatInterface = document.querySelector('.chat-interface');
                if (chatInterface) {
                    chatInterface.style.display = 'none';
                }

                // Get main content area
                const mainContent = document.querySelector('.main-content');
                console.log('Main content element:', mainContent); // Debug log

                if (mainContent) {
                    mainContent.innerHTML = `
                        <div class="subscription-container">
                            <h2>Choose Your Subscription Plan</h2>
                            <div class="tiers-container">
                                <div class="tier-card">
                                    <h3>Basic</h3>
                                    <div class="price">$9.99/month</div>
                                    <ul>
                                        <li>Basic product access</li>
                                        <li>Email support</li>
                                        <li>Basic analytics</li>
                                    </ul>
                                    <button class="subscribe-btn" data-tier="basic">Subscribe Now</button>
                                </div>

                                <div class="tier-card recommended">
                                    <div class="recommended-badge">Recommended</div>
                                    <h3>Professional</h3>
                                    <div class="price">$19.99/month</div>
                                    <ul>
                                        <li>All Basic features</li>
                                        <li>Priority support</li>
                                        <li>Advanced analytics</li>
                                        <li>Custom reports</li>
                                    </ul>
                                    <button class="subscribe-btn" data-tier="pro">Subscribe Now</button>
                                </div>

                                <div class="tier-card">
                                    <h3>Enterprise</h3>
                                    <div class="price">$49.99/month</div>
                                    <ul>
                                        <li>All Professional features</li>
                                        <li>24/7 support</li>
                                        <li>White-label options</li>
                                        <li>API access</li>
                                        <li>Custom integration</li>
                                    </ul>
                                    <button class="subscribe-btn" data-tier="enterprise">Subscribe Now</button>
                                </div>
                            </div>
                        </div>
                    `;
                    console.log('Subscription content added'); // Debug log
                } else {
                    console.error('Main content element not found');
                }
            } else {
                // Handle other categories
                const chatInterface = document.querySelector('.chat-interface');
                if (chatInterface) {
                    chatInterface.style.display = 'block';
                }
            }

            // In your category click handler
            if (this.textContent.trim() === 'Products') {
                window.location.href = 'subscriptions.html';
            }
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

    // Add this function to handle category clicks
    function handleCategoryClick(category) {
        if (category === 'Products') {
            // Hide the chat interface
            document.querySelector('.chat-interface').style.display = 'none';
            
            // Create and show the subscription tiers
            const mainContent = document.querySelector('.main-content') || document.querySelector('main');
            mainContent.innerHTML = `
                <div class="subscription-container">
                    <h2>Choose Your Subscription Plan</h2>
                    <div class="tiers-container">
                        <div class="tier-card">
                            <h3>Basic</h3>
                            <div class="price">$9.99/month</div>
                            <ul>
                                <li>Basic product access</li>
                                <li>Email support</li>
                                <li>Basic analytics</li>
                            </ul>
                            <button class="subscribe-btn" data-tier="basic">Subscribe Now</button>
                        </div>

                        <div class="tier-card recommended">
                            <div class="recommended-badge">Recommended</div>
                            <h3>Professional</h3>
                            <div class="price">$19.99/month</div>
                            <ul>
                                <li>All Basic features</li>
                                <li>Priority support</li>
                                <li>Advanced analytics</li>
                                <li>Custom reports</li>
                            </ul>
                            <button class="subscribe-btn" data-tier="pro">Subscribe Now</button>
                        </div>

                        <div class="tier-card">
                            <h3>Enterprise</h3>
                            <div class="price">$49.99/month</div>
                            <ul>
                                <li>All Professional features</li>
                                <li>24/7 support</li>
                                <li>White-label options</li>
                                <li>API access</li>
                                <li>Custom integration</li>
                            </ul>
                            <button class="subscribe-btn" data-tier="enterprise">Subscribe Now</button>
                        </div>
                    </div>

                    <div class="affiliate-section">
                        <h2>Recommended Products</h2>
                        <div class="affiliate-products">
                            <div class="affiliate-product">
                                <img src="path-to-product1.jpg" alt="Product 1">
                                <h3>Healthcare Analytics Suite</h3>
                                <p>Advanced analytics tools for healthcare professionals</p>
                                <a href="#" class="affiliate-link">Learn More</a>
                            </div>
                            <div class="affiliate-product">
                                <img src="path-to-product2.jpg" alt="Product 2">
                                <h3>Medical Training Platform</h3>
                                <p>Comprehensive medical training and certification</p>
                                <a href="#" class="affiliate-link">Learn More</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add event listeners to subscription buttons
            document.querySelectorAll('.subscribe-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const tier = this.getAttribute('data-tier');
                    handleSubscription(tier);
                });
            });
        } else {
            // Handle other categories as before
            document.querySelector('.chat-interface').style.display = 'block';
            // Your existing category handling code
        }
    }

    function handleSubscription(tier) {
        // Add your subscription handling logic here
        console.log(`Subscribing to ${tier} tier`);
        alert(`Thank you for choosing the ${tier} tier! We'll process your subscription shortly.`);
    }

    // Update your category click listeners
    document.querySelectorAll('.category').forEach(category => {
        category.addEventListener('click', function() {
            // Remove active class from all categories
            document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
            // Add active class to clicked category
            this.classList.add('active');
            // Handle the category click
            handleCategoryClick(this.textContent.trim());
        });
    });
});