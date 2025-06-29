// AI Chat functionality for Student Productivity App

// DOM Elements - will be initialized when the module is loaded
let chatContainer;
let messagesList;
let messageInput;
let sendButton;
let topicSuggestions;
let savedResponsesSection;
let responseModal;
let modalResponseContent;
let closeModalBtn;
let useResponseBtn;
let downloadAllBtn;

// Initialize the chat module
function initChatModule() {
    console.log('Initializing AI Chat module');
    
    // Get DOM elements
    chatContainer = document.getElementById('chat-container');
    messagesList = document.getElementById('messages-list');
    messageInput = document.getElementById('message-input');
    sendButton = document.getElementById('send-message-btn');
    topicSuggestions = document.getElementById('topic-suggestions');
    savedResponsesSection = document.getElementById('saved-responses-section');
    responseModal = document.getElementById('response-modal');
    modalResponseContent = document.getElementById('modal-response-content');
    closeModalBtn = document.getElementById('close-modal-btn');
    useResponseBtn = document.getElementById('use-response-btn');
    
    // Add event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Modal event listeners
    closeModalBtn.addEventListener('click', closeResponseModal);
    useResponseBtn.addEventListener('click', useModalResponse);
    
    // Close modal when clicking outside
    responseModal.addEventListener('click', (e) => {
        if (e.target === responseModal) {
            closeResponseModal();
        }
    });
    
    // Initialize topic suggestions
    initTopicSuggestions();
    
    // Load saved responses from Firebase
    loadSavedResponses();
}

// Send a message to the AI
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Clear input field
    messageInput.value = '';
    
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Show loading indicator
    const loadingId = showLoadingIndicator();
    
    try {
        // Call the DeepSeek API via OpenRouter
        const response = await callOpenAI(message);
        
        // Remove loading indicator
        removeLoadingIndicator(loadingId);
        
        // Add AI response to chat
        addMessageToChat('ai', response);
        
        window.app.showInfoNotification('New AI response received');
        
    } catch (error) {
        console.error('Error sending message to AI:', error);
        removeLoadingIndicator(loadingId);
        
        // Provide more specific error message if possible
        if (error.message && error.message.includes('429')) {
            window.app.showErrorNotification('Rate limit exceeded. Please try again in a moment.');
        } else if (error.message && error.message.includes('401')) {
            window.app.showErrorNotification('Authentication error with AI service. Please contact support.');
        } else {
            window.app.showErrorNotification('Failed to get a response. Using fallback mode.');
            // Use fallback response
            const fallbackResponse = simulateAIResponse(message);
            addMessageToChat('ai', fallbackResponse);
        }
    }
}

// Add a message to the chat UI
function addMessageToChat(sender, content) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `message-${sender}`, 'fade-in');
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (sender === 'user') {
        messageElement.innerHTML = `
            <div class="message-bubble">
                <p>${content}</p>
                <div class="message-meta">
                    <span></span>
                    <span class="message-time">${timestamp}</span>
                </div>
            </div>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="message-bubble">
                <p>${content}</p>
                <div class="message-meta">
                    <button class="save-response-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Save
                    </button>
                    <span class="message-time">${timestamp}</span>
                </div>
            </div>
        `;
        
        // Add event listener to save button
        const saveButton = messageElement.querySelector('.save-response-btn');
        saveButton.addEventListener('click', () => saveResponse(content));
    }
    
    messagesList.appendChild(messageElement);
    
    // Scroll to bottom of chat
    messagesList.scrollTop = messagesList.scrollHeight;
}

// Show loading indicator while waiting for AI response
function showLoadingIndicator() {
    const loadingId = 'loading-' + Date.now();
    const loadingElement = document.createElement('div');
    loadingElement.id = loadingId;
    loadingElement.classList.add('message', 'message-ai');
    
    loadingElement.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    messagesList.appendChild(loadingElement);
    messagesList.scrollTop = messagesList.scrollHeight;
    
    return loadingId;
}

// Remove loading indicator
function removeLoadingIndicator(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Initialize topic suggestions
function initTopicSuggestions() {
    const suggestions = [
        'How do I solve quadratic equations?',
        'Explain photosynthesis',
        'Tips for writing a good essay',
        'What are Newton\'s laws of motion?',
        'Help me understand cellular respiration',
        'How to calculate derivatives?',
        'Explain the water cycle'
    ];
    
    topicSuggestions.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.textContent = suggestion;
        button.classList.add('topic-suggestion-btn');
        
        button.addEventListener('click', () => {
            messageInput.value = suggestion;
            messageInput.focus();
        });
        
        topicSuggestions.appendChild(button);
    });
}

// DeepSeek API integration via OpenRouter
async function callOpenAI(message) {
    const API_KEY = '';
    const API_URL = '';
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Student Productivity App'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-r1-0528-qwen3-8b',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an educational AI assistant for students. Provide helpful, accurate, and concise answers to academic questions. Focus on explaining concepts clearly and providing examples where appropriate.'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 3000,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('DeepSeek API error:', errorData);
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content.trim();
        
    } catch (error) {
        console.error('Error calling DeepSeek API:', error);
        
        // Fallback to simulated response if API fails
        return simulateAIResponse(message);
    }
}

// Save a response to Firebase
async function saveResponse(content) {
    if (!window.app.isUserAuthenticated()) {
        window.app.showErrorNotification('You must be logged in to save responses');
        return;
    }
    
    const userId = window.app.getCurrentUser().uid;
    const timestamp = firebase.database.ServerValue.TIMESTAMP;
    
    try {
        // Check for duplicate response before saving
        const savedResponsesRef = rtdb.ref(`users/${userId}/savedResponses`);
        const snapshot = await savedResponsesRef.once('value');
        let isDuplicate = false;
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const data = childSnapshot.val();
                if (data.content === content) {
                    isDuplicate = true;
                }
            });
        }
        if (isDuplicate) {
            window.app.showInfoNotification('This response is already saved.');
            return;
        }
        // Use Realtime Database instead of Firestore
        const newResponseRef = rtdb.ref(`users/${userId}/savedResponses`).push();
        await newResponseRef.set({
            content,
            timestamp
        });
        
        window.app.showSuccessNotification('Response saved successfully');
        
        // Refresh saved responses
        loadSavedResponses();
        
    } catch (error) {
        console.error('Error saving response:', error);
        window.app.showErrorNotification('Failed to save response');
    }
}

// Load saved responses from Firebase
async function loadSavedResponses() {
    if (!window.app.isUserAuthenticated()) {
        savedResponsesSection.innerHTML = '<p class="text-gray-500 text-sm p-3">Log in to see your saved responses</p>';
        return;
    }
    
    const userId = window.app.getCurrentUser().uid;
    
    try {
        // Use Realtime Database instead of Firestore
        const savedResponsesRef = rtdb.ref(`users/${userId}/savedResponses`);
        const snapshot = await savedResponsesRef.orderByChild('timestamp').limitToLast(5).once('value');
        
        savedResponsesSection.innerHTML = '';
        
        // Add download all button at the top if there are responses
        if (snapshot.exists()) {
            const downloadAllContainer = document.createElement('div');
            downloadAllContainer.className = 'flex justify-end mb-2';
            downloadAllContainer.innerHTML = `
                <button id="download-all-responses-btn" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold py-1 px-3 rounded-md text-sm transition-colors duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download All
                </button>
            `;
            savedResponsesSection.appendChild(downloadAllContainer);
            
            // Add event listener
            downloadAllBtn = document.getElementById('download-all-responses-btn');
            if (downloadAllBtn) {
                downloadAllBtn.addEventListener('click', downloadAllResponses);
            }
        } else {
            savedResponsesSection.innerHTML = '<p class="text-gray-500 text-sm p-3">No saved responses yet</p>';
            return;
        }
        
        // Convert to array and reverse to get newest first
        const responses = [];
        snapshot.forEach(childSnapshot => {
            responses.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Sort by timestamp (newest first)
        responses.sort((a, b) => b.timestamp - a.timestamp);
        
        responses.forEach(data => {
            const responseElement = document.createElement('div');
            responseElement.classList.add('saved-response-item');
            
            // Truncate content if too long
            const truncatedContent = data.content.length > 150 
                ? data.content.substring(0, 150) + '...' 
                : data.content;
            
            responseElement.innerHTML = `
                <p class="saved-response-content">${truncatedContent}</p>
                <div class="saved-response-actions">
                    <div>
                        <button class="saved-response-delete" data-id="${data.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                        <button class="view-response-btn text-xs text-indigo-600 hover:text-indigo-800 ml-2" data-content="${encodeURIComponent(data.content)}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                        </button>
                        <button class="copy-response-btn text-xs text-blue-600 hover:text-blue-800 ml-2" data-content="${encodeURIComponent(data.content)}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy
                        </button>
                        <button class="download-response-btn text-xs text-green-600 hover:text-green-800 ml-2" data-content="${encodeURIComponent(data.content)}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                        </button>
                    </div>
                    <span class="saved-response-time">
                        ${data.timestamp ? new Date(data.timestamp).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'Just now'}
                    </span>
                </div>
            `;
            
            savedResponsesSection.appendChild(responseElement);
            
            // Add event listeners
            const deleteBtn = responseElement.querySelector('.saved-response-delete');
            deleteBtn.addEventListener('click', () => deleteResponse(data.id));
            
            const viewBtn = responseElement.querySelector('.view-response-btn');
            viewBtn.addEventListener('click', () => {
                openResponseModal(data.content);
            });
            
            const downloadBtn = responseElement.querySelector('.download-response-btn');
            downloadBtn.addEventListener('click', () => {
                downloadResponse(data.content);
            });
            
            const copyBtn = responseElement.querySelector('.copy-response-btn');
            copyBtn.addEventListener('click', () => {
                copyToClipboard(data.content);
            });
        });
        
    } catch (error) {
        console.error('Error loading saved responses:', error);
        savedResponsesSection.innerHTML = '<p class="text-red-500 text-sm p-3">Error loading saved responses</p>';
    }
}

// Delete a saved response
async function deleteResponse(responseId) {
    if (!window.app.isUserAuthenticated()) {
        return;
    }
    
    const userId = window.app.getCurrentUser().uid;
    
    try {
        // Use Realtime Database instead of Firestore
        await rtdb.ref(`users/${userId}/savedResponses/${responseId}`).remove();
        window.app.showSuccessNotification('Response deleted');
        
        // Refresh saved responses
        loadSavedResponses();
        
    } catch (error) {
        console.error('Error deleting response:', error);
        window.app.showErrorNotification('Failed to delete response');
    }
}

// Open response modal with content
function openResponseModal(content) {
    // Reset scroll position
    modalResponseContent.scrollTop = 0;
    
    // Create properly formatted content with whitespace preserved
    modalResponseContent.innerHTML = `
        <p class="text-gray-800 whitespace-pre-wrap">${content}</p>
        <div class="modal-actions mt-4 text-right">
            <button id="copy-modal-response-btn" class="bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-1 px-3 rounded-md text-sm transition-colors duration-200 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy
            </button>
            <button id="download-modal-response-btn" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold py-1 px-3 rounded-md text-sm transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
            </button>
        </div>
    `;
    
    // Add event listeners to the buttons
    const downloadBtn = document.getElementById('download-modal-response-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadResponse(content));
    }
    
    const copyBtn = document.getElementById('copy-modal-response-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => copyToClipboard(content));
    }
    
    // Show modal with animation
    responseModal.classList.remove('hidden');
    
    // Prevent scrolling behind modal
    document.body.style.overflow = 'hidden';
    
    // Store the content for use later
    useResponseBtn.setAttribute('data-content', encodeURIComponent(content));
    
    // Add a small delay before adding the active class to ensure transition works
    // This creates a nice slide-up effect from the bottom
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            responseModal.classList.add('active');
            
            // Check if content needs scrolling and add a subtle indicator if needed
            if (modalResponseContent.scrollHeight > modalResponseContent.clientHeight) {
                // Add a subtle scroll indicator
                const scrollIndicator = document.createElement('div');
                scrollIndicator.className = 'scroll-indicator';
                scrollIndicator.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                `;
                
                // Append it to the modal content if it doesn't already exist
                if (!document.querySelector('.scroll-indicator')) {
                    modalResponseContent.appendChild(scrollIndicator);
                    
                    // Remove the indicator after the user starts scrolling
                    modalResponseContent.addEventListener('scroll', function removeIndicator() {
                        if (scrollIndicator && scrollIndicator.parentNode) {
                            scrollIndicator.parentNode.removeChild(scrollIndicator);
                        }
                        modalResponseContent.removeEventListener('scroll', removeIndicator);
                    }, { once: true });
                    
                    // Also remove it after 3 seconds
                    setTimeout(() => {
                        if (scrollIndicator && scrollIndicator.parentNode) {
                            scrollIndicator.parentNode.removeChild(scrollIndicator);
                        }
                    }, 3000);
                }
            }
        });
    });
}

// Close response modal
function closeResponseModal() {
    // Remove active class first to trigger animation
    responseModal.classList.remove('active');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
        responseModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }, 400); // Match the transition duration in CSS
}

// Use the response content from modal
function useModalResponse() {
    const content = decodeURIComponent(useResponseBtn.getAttribute('data-content'));
    messageInput.value = content;
    messageInput.focus();
    closeResponseModal();
}

// Simulate AI response (fallback if API fails)
function simulateAIResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Simple pattern matching for educational topics
    if (lowerMessage.includes('quadratic')) {
        return 'To solve a quadratic equation (ax² + bx + c = 0), you can use the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a. First, identify the values of a, b, and c, then substitute them into the formula. For example, if you have 2x² + 5x - 3 = 0, then a=2, b=5, c=-3. Substituting these values gives you x = (-5 ± √(25 + 24)) / 4 = (-5 ± √49) / 4 = (-5 ± 7) / 4, which simplifies to x = 0.5 or x = -3.';
    } else if (lowerMessage.includes('photosynthesis')) {
        return 'Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with carbon dioxide and water. The process can be summarized as: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ (glucose) + 6O₂. This occurs in chloroplasts, specifically in the thylakoid membranes. The process has two main stages: light-dependent reactions (which convert light energy to chemical energy) and the Calvin cycle (which uses that energy to fix carbon dioxide and produce glucose).';
    } else if (lowerMessage.includes('essay')) {
        return 'For a good essay, start with a clear thesis statement, support your arguments with evidence, ensure logical paragraph structure, use transitions between ideas, and conclude by restating your main points. Also, always proofread for grammar and clarity. A strong introduction should hook the reader and provide context for your thesis. Body paragraphs should each focus on a single idea that supports your thesis, with topic sentences that clearly state the main point of each paragraph. The conclusion should synthesize your arguments rather than simply repeating them.';
    } else if (lowerMessage.includes('newton')) {
        return "Newton's three laws of motion are: 1) An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force (Law of Inertia). 2) Force equals mass times acceleration (F = ma), which means the force acting on an object is equal to the mass of that object times its acceleration. 3) For every action, there is an equal and opposite reaction, meaning that for every force applied, there is an equal force applied in the opposite direction. These laws form the foundation of classical mechanics and explain the relationship between an object and the forces acting upon it.";
    } else if (lowerMessage.includes('cellular respiration')) {
        return 'Cellular respiration is the process by which cells convert glucose into energy in the form of ATP. The simplified equation is: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + energy (ATP). It occurs in three main stages: glycolysis (in the cytoplasm, which produces a small amount of ATP and pyruvate), the Krebs cycle (in the mitochondrial matrix, which generates electron carriers NADH and FADH2), and the electron transport chain (in the inner mitochondrial membrane, which produces most of the ATP). This process is essential for cellular function as it provides the energy needed for all cellular activities.';
    } else if (lowerMessage.includes('math') || lowerMessage.includes('calculus')) {
        return 'Mathematics is a vast field with many branches. Calculus, one of these branches, deals with rates of change and accumulation. The two main concepts in calculus are derivatives (rates of change) and integrals (accumulation of quantities). Derivatives help us understand how functions change, while integrals help us calculate areas and totals. These concepts are fundamental to physics, engineering, economics, and many other fields.';
    } else if (lowerMessage.includes('history') || lowerMessage.includes('world war')) {
        return 'Historical events are complex and multifaceted, requiring careful analysis of primary and secondary sources. When studying history, it\'s important to consider multiple perspectives and the broader context of events. For specific historical periods or events, I recommend consulting reliable academic sources and primary documents from the time period you\'re interested in.';
    } else {
        return '[Fallback Mode] I\'m currently operating in offline mode. Your question about "' + message.split(' ').slice(0, 5).join(' ') + '..." is interesting. When the connection to the AI service is restored, I\'ll be able to provide a more detailed answer. In the meantime, you might want to try a more specific question about topics like math, science, history, or literature.';
    }
}

// Download a single response as a text file
function downloadResponse(content) {
    // Create filename with date
    const date = new Date().toISOString().slice(0, 10);
    const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
    const filename = `ai_response_${date}_${time}.txt`;
    
    // Create a blob with the content
    const blob = new Blob([content], { type: 'text/plain' });
    
    // Create download link and trigger click
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;
    
    // Hide link, add to body, click, and remove
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    window.app.showSuccessNotification('Response downloaded');
}

// Download all saved responses as a single text file
async function downloadAllResponses() {
    if (!window.app.isUserAuthenticated()) {
        window.app.showErrorNotification('You must be logged in to download responses');
        return;
    }
    
    const userId = window.app.getCurrentUser().uid;
    
    try {
        // Show loading notification
        window.app.showInfoNotification('Preparing your responses for download...');
        
        // Fetch all saved responses (not just the 5 shown in the UI)
        const savedResponsesRef = rtdb.ref(`users/${userId}/savedResponses`);
        const snapshot = await savedResponsesRef.orderByChild('timestamp').once('value');
        
        if (!snapshot.exists()) {
            window.app.showInfoNotification('No responses to download');
            return;
        }
        
        // Build content for the file
        let fileContent = '# Your AI Responses\n';
        fileContent += `# Downloaded on ${new Date().toLocaleString()}\n\n`;
        
        // Convert to array
        const responses = [];
        snapshot.forEach(childSnapshot => {
            responses.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Sort by timestamp (oldest to newest)
        responses.sort((a, b) => a.timestamp - b.timestamp);
        
        // Add each response to the file
        responses.forEach((response, index) => {
            const date = response.timestamp ? new Date(response.timestamp).toLocaleString() : 'Unknown date';
            fileContent += `## Response ${index + 1} - ${date}\n\n`;
            fileContent += `${response.content}\n\n`;
            fileContent += '---\n\n';
        });
        
        // Create filename with date
        const date = new Date().toISOString().slice(0, 10);
        const filename = `all_ai_responses_${date}.txt`;
        
        // Create a blob with the content
        const blob = new Blob([fileContent], { type: 'text/plain' });
        
        // Create download link and trigger click
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = filename;
        
        // Hide link, add to body, click, and remove
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        window.app.showSuccessNotification('All responses downloaded successfully');
        
    } catch (error) {
        console.error('Error downloading all responses:', error);
        window.app.showErrorNotification('Failed to download responses');
    }
}

// Copy response to clipboard
function copyToClipboard(content) {
    // Create a temporary textarea element to copy from
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = content;
    
    // Make the textarea out of viewport to avoid showing it on screen
    tempTextarea.style.position = 'fixed';
    tempTextarea.style.left = '-999999px';
    tempTextarea.style.top = '-999999px';
    
    document.body.appendChild(tempTextarea);
    tempTextarea.focus();
    tempTextarea.select();
    
    try {
        // Execute copy command
        const successful = document.execCommand('copy');
        
        if (successful) {
            window.app.showSuccessNotification('Response copied to clipboard');
        } else {
            // Fallback for modern browsers
            navigator.clipboard.writeText(content)
                .then(() => window.app.showSuccessNotification('Response copied to clipboard'))
                .catch(err => window.app.showErrorNotification('Failed to copy: ' + err));
        }
    } catch (err) {
        // Try the modern clipboard API as fallback
        navigator.clipboard.writeText(content)
            .then(() => window.app.showSuccessNotification('Response copied to clipboard'))
            .catch(err => window.app.showErrorNotification('Failed to copy: ' + err));
    }
    
    // Clean up
    document.body.removeChild(tempTextarea);
}

// Export the initialization function
window.initChatModule = initChatModule;
