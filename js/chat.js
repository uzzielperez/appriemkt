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
    const loginButton = document.querySelector('.top-right.login') || 
                       document.querySelector('.top-right-login') ||
                       document.querySelector('[class*="top-right"][class*="login"]');
    
    console.log('Login button found:', loginButton); // Debug log

    // Create username span
    let usernameSpan = document.querySelector('.username-display');
    if (!usernameSpan) {
        usernameSpan = document.createElement('span');
        usernameSpan.className = 'username-display';
        if (loginButton && loginButton.parentNode) {
            loginButton.parentNode.insertBefore(usernameSpan, loginButton);
        }
    }

    // Create modal
    const modalHTML = `
        <div id="loginModal" class="login-modal" style="display: none;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Login</h2>
                <form id="loginForm">
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password:</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit">Login</button>
                </form>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.querySelector('#loginModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.querySelector('#loginModal');
    const closeBtn = modal.querySelector('.close');
    const loginForm = document.querySelector('#loginForm');

    console.log('Modal elements:', { modal, closeBtn, loginForm }); // Debug log

    // Login button click handler
    loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Login button clicked'); // Debug log
        
        const isLoggedIn = localStorage.getItem('token');
        if (!isLoggedIn) {
            modal.style.display = 'block';
            console.log('Showing modal'); // Debug log
        } else {
            handleLogout();
        }
    });

    // Close button handler
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        console.log('Modal closed'); // Debug log
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            console.log('Modal closed (outside click)'); // Debug log
        }
    });

    // Form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted'); // Debug log

        const email = document.querySelector('#email').value;
        const password = document.querySelector('#password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            console.log('Login response:', response); // Debug log

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.user.email || data.user.username);
                modal.style.display = 'none';
                checkLoginStatus();
                window.location.reload();
            } else {
                const error = await response.json();
                alert(error.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        }
    });

    async function handleLogout() {
        console.log('Handling logout'); // Debug log
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                checkLoginStatus();
                window.location.reload();
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    function checkLoginStatus() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        console.log('Checking login status:', { token, username }); // Debug log

        if (token) {
            usernameSpan.textContent = username || 'User';
            usernameSpan.style.display = 'inline';
            loginButton.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            loginButton.title = 'Logout';
            loginButton.classList.add('logged-in');
        } else {
            usernameSpan.style.display = 'none';
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
            loginButton.title = 'Login';
            loginButton.classList.remove('logged-in');
        }
    }

    // Initial check
    checkLoginStatus();

    // Model select handler
    modelSelect?.addEventListener('change', (e) => {
        // Remove the auth check, allowing direct model switching
        const selectedOption = e.target.options[e.target.selectedIndex].text;
        console.log(`Switched to ${selectedOption}`);
    });

    // Add these new variables
    const registerModal = document.querySelector('.register-modal');
    const registerForm = document.querySelector('.register-form');
    const switchToRegister = document.querySelector('.switch-to-register');
    const switchToLogin = document.querySelector('.switch-to-login');

    // Add switch between login and register
    switchToRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'block';
    });

    switchToLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.style.display = 'none';
        loginModal.style.display = 'block';
    });

    // Handle registration form submission
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = registerForm.querySelector('input[type="text"]').value;
        const email = registerForm.querySelector('input[type="email"]').value;
        const password = registerForm.querySelector('input[type="password"]').value;

        try {
            await registerUser(name, email, password);
            
            // Auto login after successful registration
            await loginUser(email, password);
            
            // Update UI
            loginButton.classList.add('logged-in');
            loginButton.querySelector('i').className = 'fas fa-user-check';
            
            // Close modal
            registerModal.style.display = 'none';
            modalOverlay.style.display = 'none';

            // Clear form
            registerForm.reset();

            alert('Registration successful! You are now logged in.');
        } catch (error) {
            alert(error.message);
        }
    });

    // Add registration function
    async function registerUser(name, email, password) {
        try {
            console.log('Attempting to register user:', { name, email });
            
            const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            // Log the raw response for debugging
            const rawResponse = await response.text();
            console.log('Raw server response:', rawResponse);

            let data;
            try {
                data = JSON.parse(rawResponse);
            } catch (e) {
                console.error('Failed to parse server response:', e);
                throw new Error('Server returned invalid JSON');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.user.username || data.user.email);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('isLoggedIn', 'true');
            }

            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    // Add this function near the other message-related functions
    function displayMessage(message, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.textContent = message;
        
        if (messagesContainer) {
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
});

// Add these functions to handle authentication
async function loginUser(email, password) {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.user.username || data.user.email);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

.username-display {
    margin-right: 10px;
    font-weight: 500;
    color: #333;
}

.top-right-login {
    cursor: pointer;
    padding: 8px;
    transition: color 0.3s ease;
    display: inline-flex;
    align-items: center;
}

.top-right-login i {
    font-size: 20px;
}

.top-right-login:hover {
    color: #ff4444;
}

.top-right-login.logged-in:hover {
    color: #ff0000;
}

.login-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    z-index: 1000;
}

.modal-content {
    background-color: white;
    margin: 15% auto;
    padding: 20px;
    border-radius: 5px;
    width: 80%;
    max-width: 500px;
    position: relative;
}

.close {
    position: absolute;
    right: 10px;
    top: 10px;
    font-size: 24px;
    cursor: pointer;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
}

.form-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

#loginForm button {
    background-color: #4CAF50;
    color: white;
    padding: 10px 15px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

#loginForm button:hover {
    background-color: #45a049;
}