// Existing chat.js code...

// Global variables for document handling
let currentFile = null;
let currentDocument = null;
let documentSections = [];

// PDF viewer variables
let pdfDoc = null;
let currentPage = 1;
let canvas = null;
let ctx = null;
let isSelecting = false;
let startX = 0;
let startY = 0;
let selectionBox = null;
let selectedArea = null;

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
    
    // If it's a PDF, load it into the viewer
    if (file.type === 'application/pdf') {
        loadPDF(file);
    }
    
    // Add a message to the chat
    addMessageToChat('user', `📎 File selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
}

// Initialize drag and drop when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupDragAndDrop();
    initializeSidebar();
    initializePDFViewer();
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
// PDF Viewer Functions
function initializePDFViewer() {
    canvas = document.getElementById('pdf-canvas');
    ctx = canvas.getContext('2d');
    
    // PDF navigation
    document.getElementById('prev-page').addEventListener('click', showPrevPage);
    document.getElementById('next-page').addEventListener('click', showNextPage);
    
    // Canvas mouse events for selection
    canvas.addEventListener('mousedown', startSelection);
    canvas.addEventListener('mousemove', updateSelection);
    canvas.addEventListener('mouseup', endSelection);
    
    // Analyze selection button
    document.getElementById('analyze-selection').addEventListener('click', analyzeSelection);
}

async function loadPDF(file) {
    try {
        // Show PDF viewer
        document.getElementById('pdf-viewer-container').style.display = 'flex';
        
        const arrayBuffer = await file.arrayBuffer();
        
        // Use PDF.js to load the document
        // Note: Since we're loading as module, we need to use dynamic import
        const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
        
        // Set worker path
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
        
        pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
        currentPage = 1;
        
        await renderPage(currentPage);
        updatePageInfo();
        updateNavButtons();
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        addMessageToChat('assistant', 'Sorry, there was an error loading the PDF. Please try again.');
    }
}

async function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Clear any existing selection
        clearSelection();
        
    } catch (error) {
        console.error('Error rendering page:', error);
    }
}

function showPrevPage() {
    if (currentPage <= 1) return;
    currentPage--;
    renderPage(currentPage);
    updatePageInfo();
    updateNavButtons();
}

function showNextPage() {
    if (!pdfDoc || currentPage >= pdfDoc.numPages) return;
    currentPage++;
    renderPage(currentPage);
    updatePageInfo();
    updateNavButtons();
}

function updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    if (pdfDoc) {
        pageInfo.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
    }
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = !pdfDoc || currentPage >= pdfDoc.numPages;
}

function startSelection(e) {
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    isSelecting = true;
    
    // Clear previous selection
    clearSelection();
}

function updateSelection(e) {
    if (!isSelecting) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Clear previous selection box
    if (selectionBox) {
        selectionBox.remove();
    }
    
    // Create selection box
    selectionBox = document.createElement('div');
    selectionBox.className = 'selection-overlay';
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    selectionBox.style.left = (rect.left + left) + 'px';
    selectionBox.style.top = (rect.top + top) + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    
    document.body.appendChild(selectionBox);
}

function endSelection(e) {
    if (!isSelecting) return;
    
    isSelecting = false;
    
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    // Store selected area coordinates
    selectedArea = {
        x1: Math.min(startX, endX),
        y1: Math.min(startY, endY),
        x2: Math.max(startX, endX),
        y2: Math.max(startY, endY),
        page: currentPage
    };
    
    // Show selection info
    showSelectionInfo();
}

function clearSelection() {
    if (selectionBox) {
        selectionBox.remove();
        selectionBox = null;
    }
    selectedArea = null;
    document.getElementById('selected-area-info').style.display = 'none';
}

function showSelectionInfo() {
    if (!selectedArea) return;
    
    const info = document.getElementById('selected-area-info');
    const width = selectedArea.x2 - selectedArea.x1;
    const height = selectedArea.y2 - selectedArea.y1;
    
    info.innerHTML = `
        <div>Selected area: ${width.toFixed(0)}×${height.toFixed(0)}px on page ${selectedArea.page}</div>
        <button id="analyze-selection" class="analyze-selection-btn" onclick="analyzeSelection()">
            <i class="fas fa-brain"></i> Analyze Selection
        </button>
    `;
    info.style.display = 'block';
}

async function analyzeSelection() {
    if (!selectedArea || !currentFile) {
        addMessageToChat('assistant', 'No area selected or no PDF loaded.');
        return;
    }
    
    try {
        // Show loading state
        const analyzeBtn = document.getElementById('analyze-selection');
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        analyzeBtn.disabled = true;
        
        // Create FormData with selection coordinates
        const formData = new FormData();
        formData.append('document', currentFile);
        formData.append('selectionArea', JSON.stringify(selectedArea));
        formData.append('message', `Please analyze the selected area on page ${selectedArea.page}`);
        
        const response = await fetch('/.netlify/functions/analyze-selection', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Analysis failed: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.analysis) {
            addMessageToChat('assistant', result.analysis);
            addMessageToChat('system', `📍 **Analyzed selected area:** ${(selectedArea.x2 - selectedArea.x1).toFixed(0)}×${(selectedArea.y2 - selectedArea.y1).toFixed(0)}px on page ${selectedArea.page}`);
        }
        
        // Clear selection
        clearSelection();
        
    } catch (error) {
        console.error('Error analyzing selection:', error);
        addMessageToChat('assistant', 'Sorry, there was an error analyzing the selected area. Please try again.');
    } finally {
        // Reset button
        const analyzeBtn = document.getElementById('analyze-selection');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = '<i class="fas fa-brain"></i> Analyze Selection';
            analyzeBtn.disabled = false;
        }
    }
}

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

    // Show PDF viewer if it's a PDF file
    if (currentFile && currentFile.type === 'application/pdf') {
        loadPDF(currentFile);
    }

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

