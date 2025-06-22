// Existing chat.js code...

// Global variables for document handling
let currentFile = null;
let currentDocument = null;
let documentSections = [];

// Drag and drop functionality
function setupDragAndDrop() {
    const searchInput = document.getElementById('searchInput');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        searchInput.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        searchInput.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        searchInput.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    searchInput.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        searchInput.classList.add('drag-over');
        searchInput.placeholder = 'Drop your file here...';
    }
    
    function unhighlight(e) {
        searchInput.classList.remove('drag-over');
        searchInput.placeholder = 'Ask a question...';
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            handleFileSelection(file);
        }
    }
}

// Unified file handling function
function handleFileSelection(file) {
    // Check file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
        addMessageToChat('assistant', `Sorry, "${file.name}" is not a supported file type. Please upload PDF, TXT, DOC, or DOCX files.`);
        return;
    }
    
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
    
    // Add a message to the chat
    addMessageToChat('user', `📎 File selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
}

// Initialize drag and drop when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupDragAndDrop();
    initializeSidebar();
});

document.getElementById('attachment-button').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileSelection(file);
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
        
        // Use the enhanced file upload that shows sections
        const result = await handleFileUpload(currentFile, 'Please analyze this document');
        
        // Clear the file upload if successful
        if (result) {
            removeFile();
        }
        
    } catch (error) {
        console.error('Error:', error);
        addMessageToChat('assistant', 'Sorry, there was an error uploading your file. Please try again.');
    } finally {
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
                
                // Add file info if available
                if (result.documentInfo) {
                    const info = result.documentInfo;
                    addMessageToChat('system', `📄 **Document processed:** ${info.filename} (${info.contentType}, ${info.textLength} characters extracted)`);
                }
            } else {
                throw new Error('No analysis received from server');
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
    
    // Handle markdown/html content for system messages
    if (sender === 'system') {
        messageDiv.innerHTML = message;
    } else {
        messageDiv.textContent = message;
    }
    
    messagesContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
    
    return messageDiv; // Return the element so it can be removed if needed
}

// Add click and enter key handlers for the submit button
document.getElementById('submit-button').addEventListener('click', sendMessage);

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Sidebar functionality
const documentSidebar = document.getElementById('document-sidebar');
const documentTitle = document.getElementById('document-title');
const documentStats = document.getElementById('document-stats');
const documentSectionsContainer = document.getElementById('document-sections');
const mainContent = document.querySelector('.main-content');

// Initialize sidebar event listeners
function initializeSidebar() {
    console.log('Initializing sidebar...');
    
    // Use document.querySelector as backup
    const closeSidebarBtn = document.getElementById('close-sidebar') || document.querySelector('#close-sidebar');
    const selectAllBtn = document.getElementById('select-all-sections') || document.querySelector('#select-all-sections');
    const deselectAllBtn = document.getElementById('deselect-all-sections') || document.querySelector('#deselect-all-sections');
    const analyzeSelectedBtn = document.getElementById('analyze-selected') || document.querySelector('#analyze-selected');
    
    console.log('Elements found:', {
        closeSidebarBtn: !!closeSidebarBtn,
        selectAllBtn: !!selectAllBtn, 
        deselectAllBtn: !!deselectAllBtn,
        analyzeSelectedBtn: !!analyzeSelectedBtn
    });
    
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', hideSidebar);
        console.log('Close sidebar button listener added');
    } else {
        console.warn('Close sidebar button not found');
    }

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllSections);
        console.log('Select all button listener added');
    } else {
        console.warn('Select all button not found');
    }

    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', deselectAllSections);
        console.log('Deselect all button listener added');
    } else {
        console.warn('Deselect all button not found');
    }

    if (analyzeSelectedBtn) {
        // Add both click listener and a test
        analyzeSelectedBtn.addEventListener('click', function(e) {
            console.log('Button clicked via event listener!', e);
            analyzeSelectedSections();
        });
        
        // Test button accessibility
        analyzeSelectedBtn.style.border = '2px solid red'; // Temporary visual indicator
        setTimeout(() => {
            if (analyzeSelectedBtn.style) {
                analyzeSelectedBtn.style.border = '';
            }
        }, 2000);
        
        console.log('Analyze selected button listener added');
        console.log('Button element:', analyzeSelectedBtn);
        console.log('Button properties:', {
            disabled: analyzeSelectedBtn.disabled,
            style: analyzeSelectedBtn.style.display,
            innerHTML: analyzeSelectedBtn.innerHTML
        });
    } else {
        console.warn('Analyze selected button not found');
        // Try to find it in a different way
        setTimeout(() => {
            const altBtn = document.querySelector('.analyze-btn');
            console.log('Alternative search result:', altBtn);
        }, 1000);
    }
}

// Show sidebar with document
function showSidebar(documentData) {
    currentDocument = documentData;
    documentSections = documentData.sections;

    // Update document info
    if (documentTitle) {
        documentTitle.textContent = documentData.documentInfo.filename;
    }

    if (documentStats) {
        const stats = documentData.documentInfo;
        documentStats.innerHTML = `
            <div><i class="fas fa-file-alt"></i> ${stats.sectionCount} sections</div>
            <div><i class="fas fa-align-left"></i> ${stats.wordCount.toLocaleString()} words</div>
            <div><i class="fas fa-text-width"></i> ${stats.totalLength.toLocaleString()} characters</div>
        `;
    }

    // Populate sections
    populateSections(documentData.sections);

    // Show sidebar
    if (documentSidebar) {
        documentSidebar.classList.remove('hidden');
    }
    if (mainContent) {
        mainContent.classList.add('sidebar-open');
    }
}

// Hide sidebar
function hideSidebar() {
    if (documentSidebar) {
        documentSidebar.classList.add('hidden');
    }
    if (mainContent) {
        mainContent.classList.remove('sidebar-open');
    }
    
    // Clear current document
    currentDocument = null;
    documentSections = [];
}

// Populate sections in sidebar
function populateSections(sections) {
    if (!documentSectionsContainer) return;

    documentSectionsContainer.innerHTML = '';

    sections.forEach((section, index) => {
        const sectionElement = document.createElement('div');
        sectionElement.className = 'section-item';
        sectionElement.innerHTML = `
            <div class="section-header">
                <input type="checkbox" class="section-checkbox" id="section-${section.id}" 
                       ${section.selected ? 'checked' : ''} data-section-id="${section.id}">
                <label for="section-${section.id}" class="section-title">${section.title}</label>
            </div>
            <div class="section-info">
                ${section.wordCount} words • ${section.charCount} characters
            </div>
            <div class="section-preview">${section.preview}</div>
        `;

        // Add event listener for checkbox
        const checkbox = sectionElement.querySelector('.section-checkbox');
        checkbox.addEventListener('change', function() {
            section.selected = this.checked;
            sectionElement.classList.toggle('selected', this.checked);
            updateAnalyzeButton();
        });

        // Set initial selected state
        if (section.selected) {
            sectionElement.classList.add('selected');
        }

        documentSectionsContainer.appendChild(sectionElement);
    });

    updateAnalyzeButton();
}

// Select all sections
function selectAllSections() {
    documentSections.forEach(section => {
        section.selected = true;
    });
    updateSectionUI();
    updateAnalyzeButton();
}

// Deselect all sections
function deselectAllSections() {
    documentSections.forEach(section => {
        section.selected = false;
    });
    updateSectionUI();
    updateAnalyzeButton();
}

// Update section UI based on selection state
function updateSectionUI() {
    const checkboxes = document.querySelectorAll('.section-checkbox');
    checkboxes.forEach(checkbox => {
        const sectionId = checkbox.dataset.sectionId;
        const section = documentSections.find(s => s.id === sectionId);
        if (section) {
            checkbox.checked = section.selected;
            const sectionElement = checkbox.closest('.section-item');
            sectionElement.classList.toggle('selected', section.selected);
        }
    });
}

// Update analyze button state
function updateAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyze-selected');
    if (!analyzeBtn) return;

    const selectedCount = documentSections.filter(s => s.selected).length;
    
    if (selectedCount === 0) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-brain"></i> Select sections to analyze';
    } else {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `<i class="fas fa-brain"></i> Analyze ${selectedCount} section${selectedCount > 1 ? 's' : ''}`;
    }
}

// Analyze selected sections
async function analyzeSelectedSections() {
    console.log('Analyze button clicked!');
    console.log('Document sections:', documentSections);
    console.log('Current document:', currentDocument);
    
    const selectedSections = documentSections.filter(s => s.selected);
    console.log('Selected sections:', selectedSections);
    
    if (selectedSections.length === 0) {
        alert('Please select at least one section to analyze.');
        return;
    }

    if (!currentDocument || !currentDocument.documentInfo) {
        console.error('No current document or document info available');
        addMessageToChat('assistant', 'Error: No document loaded. Please upload a document first.');
        return;
    }

    try {
        // Show loading state
        const analyzeBtn = document.getElementById('analyze-selected');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        }
        
        console.log('Sending request to analyze-sections...');

        const requestData = {
            selectedSections: selectedSections,
            documentInfo: currentDocument.documentInfo,
            userMessage: 'Please analyze the selected sections of this document'
        };
        
        console.log('Request data:', requestData);

        const response = await fetch('/.netlify/functions/analyze-sections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);

        if (!response.ok) {
            throw new Error(result.error || `Analysis failed with status ${response.status}`);
        }

        // Add analysis to chat
        addMessageToChat('assistant', result.analysis);
        
        // Add info about what was analyzed
        const analysisInfo = `📊 **Analysis Complete**: Analyzed ${result.analyzedSections} section${result.analyzedSections > 1 ? 's' : ''} (${result.totalCharactersAnalyzed.toLocaleString()} characters) from ${currentDocument.documentInfo.filename}`;
        addMessageToChat('system', analysisInfo);

        // Hide sidebar after successful analysis
        hideSidebar();

    } catch (error) {
        console.error('Analysis error:', error);
        addMessageToChat('assistant', `Sorry, there was an error analyzing the selected sections: ${error.message}`);
    } finally {
        // Reset button state
        updateAnalyzeButton();
    }
}

// Enhanced file upload to use document parser
async function handleFileUpload(file, userMessage = '') {
    try {
        console.log('Uploading file for parsing:', file.name);
        
        const formData = new FormData();
        formData.append('document', file);
        
        // Show upload progress message
        const uploadMsg = addMessageToChat('system', `📤 Uploading and parsing ${file.name}...`);

        const response = await fetch('/.netlify/functions/document-parser', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        // Remove upload message
        if (uploadMsg && uploadMsg.parentNode) {
            uploadMsg.parentNode.removeChild(uploadMsg);
        }

        if (!response.ok) {
            throw new Error(result.error || `Upload failed with status ${response.status}`);
        }

        if (!result.success) {
            throw new Error(result.error || 'Failed to parse document');
        }

        // Show success message
        addMessageToChat('system', `✅ **Document parsed successfully!** Found ${result.sections.length} sections. Use the sidebar to select which sections to analyze.`);

        // Show sidebar with parsed document
        showSidebar(result);

        return result;

    } catch (error) {
        console.error('File upload error:', error);
        addMessageToChat('assistant', `Sorry, there was an error uploading your file: ${error.message}`);
        return null;
    }
}

