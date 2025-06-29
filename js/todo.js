// To-Do List Module Functionality
// This module implements the task management features with Firebase Realtime Database integration

// Global variables
let currentUser = null;
let userTasks = [];
let userNotes = [];
let isInitialized = false;
let taskTimers = {};
let countdownIntervals = {};

// Timer & Stopwatch variables
let timerMode = 'timer'; // 'timer' or 'stopwatch'
let timerInterval = null;
let timerStartTime = 0;
let timerPausedTime = 0;
let timerDuration = 0;
let timerStatus = 'stopped'; // 'stopped', 'running', 'paused'
let timerHistory = [];

// DOM Elements
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const rewardDisplay = document.getElementById('reward-display');
const notesForm = document.getElementById('notes-form');
const notesList = document.getElementById('notes-list');

// Create audio element for alarm sound
const alarmSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
alarmSound.loop = false;

// Initialize the To-Do List Module
function initTodoModule() {
    console.log('Initializing To-Do List Module');
    
    // Check if user is authenticated
    if (!window.app.isUserAuthenticated()) {
        console.log('User not authenticated, skipping To-Do List initialization');
        return;
    }
    
    // Get current user
    currentUser = window.app.getCurrentUser();
    
    // Initialize UI only if not already initialized
    if (!isInitialized) {
        initUI();
        isInitialized = true;
    }
    
    // Load user tasks and notes from Firebase
    loadTasks();
    loadNotes();
    
    // Load timer history from Firebase
    loadTimerHistory();
    
    // Initialize Calendar Module if available
    if (typeof window.initCalendarModule === 'function') {
        window.initCalendarModule();
    }
}

// Initialize UI components and event listeners
function initUI() {
    console.log('Setting up To-Do List event listeners');
    
    // Remove any existing event listeners before adding new ones
    taskForm.removeEventListener('submit', handleTaskSubmit);
    notesForm.removeEventListener('submit', handleNoteSubmit);
    
    // Setup task form submission
    taskForm.addEventListener('submit', handleTaskSubmit);

    // Setup notes form submission
    notesForm.addEventListener('submit', handleNoteSubmit);
    
    // Setup download all tasks button
    const downloadAllTasksBtn = document.getElementById('download-all-tasks-btn');
    if (downloadAllTasksBtn) {
        downloadAllTasksBtn.addEventListener('click', downloadAllTasks);
        
        // Initially hide the button - it will be shown in renderTasks if tasks exist
        downloadAllTasksBtn.classList.add('hidden');
    }
    
    // Initialize reward display
    updateRewardDisplay();
    
    // Load existing notes
    loadNotes();
    
    // Initialize Timer & Stopwatch
    initTimerUI();
}

// Handle note submission
async function handleNoteSubmit(event) {
    event.preventDefault();
    
    const titleInput = document.getElementById('note-title');
    const descriptionInput = document.getElementById('note-description');
    
    const note = {
        id: Date.now().toString(),
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        timestamp: Date.now(),
        userId: currentUser.uid
    };
    
    try {
        // Save note to Firebase
        await firebase.database().ref(`notes/${currentUser.uid}/${note.id}`).set(note);
        
        // Add to local array and update display
        userNotes.push(note);
        displayNote(note);
        
        // Reset form
        event.target.reset();
        
        window.app.showSuccessNotification('Note saved successfully!');
    } catch (error) {
        console.error('Error saving note:', error);
        window.app.showErrorNotification('Failed to save note. Please try again.');
    }
}

// Load notes from Firebase
async function loadNotes() {
    if (!currentUser) return;
    
    try {
        const snapshot = await firebase.database().ref(`notes/${currentUser.uid}`).once('value');
        const notes = snapshot.val() || {};
        
        // Clear existing notes
        userNotes = [];
        notesList.innerHTML = '';
        
        // Sort notes by timestamp (newest first)
        Object.values(notes)
            .sort((a, b) => b.timestamp - a.timestamp)
            .forEach(note => {
                userNotes.push(note);
                displayNote(note);
            });
    } catch (error) {
        console.error('Error loading notes:', error);
        window.app.showErrorNotification('Failed to load notes. Please refresh the page.');
    }
}

// Display a single note in the UI
function displayNote(note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'bg-gray-50 p-4 rounded-lg shadow-sm';
    noteElement.id = `note-${note.id}`;
    
    const timestamp = new Date(note.timestamp).toLocaleString();
    
    noteElement.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <h4 class="text-lg font-medium text-gray-800">${escapeHtml(note.title)}</h4>
            <div class="flex space-x-2">
                <button onclick="downloadNote('${note.id}')" class="text-blue-500 hover:text-blue-700" title="Download as text file">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
                <button onclick="deleteNote('${note.id}')" class="text-red-500 hover:text-red-700" title="Delete note">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
        <p class="text-gray-600 whitespace-pre-wrap mb-2">${escapeHtml(note.description)}</p>
        <span class="text-sm text-gray-500">${timestamp}</span>
    `;
    
    notesList.insertBefore(noteElement, notesList.firstChild);
}

// Download a note as a text file
function downloadNote(noteId) {
    try {
        // Find the note in the local array
        const note = userNotes.find(note => note.id === noteId);
        if (!note) {
            window.app.showErrorNotification('Note not found.');
            return;
        }
        
        // Format the note content
        const timestamp = new Date(note.timestamp).toLocaleString();
        const noteContent = `${note.title}\n\n${note.description}\n\n${timestamp}`;
        
        // Create a blob with the note content
        const blob = new Blob([noteContent], { type: 'text/plain' });
        
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${noteId}.txt`;
        
        // Append to body, click, and remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        window.app.showSuccessNotification('Note downloaded successfully!');
    } catch (error) {
        console.error('Error downloading note:', error);
        window.app.showErrorNotification('Failed to download note. Please try again.');
    }
}

// Delete a note
async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
        // Delete from Firebase
        await firebase.database().ref(`notes/${currentUser.uid}/${noteId}`).remove();
        
        // Remove from local array
        userNotes = userNotes.filter(note => note.id !== noteId);
        
        // Remove from UI
        const noteElement = document.getElementById(`note-${noteId}`);
        if (noteElement) {
            noteElement.remove();
        }
        
        window.app.showSuccessNotification('Note deleted successfully!');
    } catch (error) {
        console.error('Error deleting note:', error);
        window.app.showErrorNotification('Failed to delete note. Please try again.');
    }
}

// Utility function to escape HTML special characters
function escapeHtml(unsafe) {
     return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
 
  // Initialize Timer & Stopwatch UI and event listeners
  function initTimerUI() {
    // Timer DOM Elements
    const timerBtn = document.getElementById('timer-btn');
    const stopwatchBtn = document.getElementById('stopwatch-btn');
    const timerSettings = document.getElementById('timer-settings');
    const stopwatchSettings = document.getElementById('stopwatch-settings');
    const timerDisplay = document.getElementById('timer-display').querySelector('div');
    const timerStatusLabel = document.getElementById('timer-status-label');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const resetBtn = document.getElementById('reset-btn');
    const timerHistory = document.getElementById('timer-history');
    
    // Time input fields
    const hoursInput = document.getElementById('hours-input');
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    
    // Toggle between Timer and Stopwatch
    timerBtn.addEventListener('click', () => {
        if (timerStatus !== 'stopped') {
            if (!confirm('Changing timer type will reset your current timer. Continue?')) {
                return;
            }
            resetTimer();
        }
        
        timerMode = 'timer';
        timerBtn.classList.add('bg-indigo-600', 'text-white');
        timerBtn.classList.remove('bg-gray-200', 'text-gray-700');
        stopwatchBtn.classList.add('bg-gray-200', 'text-gray-700');
        stopwatchBtn.classList.remove('bg-indigo-600', 'text-white');
        timerSettings.classList.remove('hidden');
        stopwatchSettings.classList.add('hidden');
        timerDisplay.textContent = '00:00:00';
        timerStatusLabel.textContent = 'Ready';
    });
    
    stopwatchBtn.addEventListener('click', () => {
        if (timerStatus !== 'stopped') {
            if (!confirm('Changing timer type will reset your current timer. Continue?')) {
                return;
            }
            resetTimer();
        }
        
        timerMode = 'stopwatch';
        stopwatchBtn.classList.add('bg-indigo-600', 'text-white');
        stopwatchBtn.classList.remove('bg-gray-200', 'text-gray-700');
        timerBtn.classList.add('bg-gray-200', 'text-gray-700');
        timerBtn.classList.remove('bg-indigo-600', 'text-white');
        stopwatchSettings.classList.remove('hidden');
        timerSettings.classList.add('hidden');
        timerDisplay.textContent = '00:00:00';
        timerStatusLabel.textContent = 'Ready';
    });
    
    // Start button
    startBtn.addEventListener('click', () => {
        if (timerMode === 'timer') {
            // Get time inputs
            const hours = parseInt(hoursInput.value) || 0;
            const minutes = parseInt(minutesInput.value) || 0;
            const seconds = parseInt(secondsInput.value) || 0;
            
            // Calculate total duration in milliseconds
            timerDuration = (hours * 3600 + minutes * 60 + seconds) * 1000;
            
            if (timerDuration <= 0) {
                window.app.showErrorNotification('Please set a time greater than zero');
                return;
            }
            
            startTimer();
        } else {
            // Stopwatch mode
            startStopwatch();
        }
    });
    
    // Pause button
    pauseBtn.addEventListener('click', () => {
        pauseTimer();
    });
    
    // Resume button
    resumeBtn.addEventListener('click', () => {
        resumeTimer();
    });
    
    // Reset button
    resetBtn.addEventListener('click', () => {
        resetTimer();
    });
}

// Start the timer
function startTimer() {
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const timerDisplay = document.getElementById('timer-display').querySelector('div');
    const timerStatusLabel = document.getElementById('timer-status-label');
    const timerLabel = document.getElementById('timer-label').value.trim() || 'Timer';
    const stopwatchLabel = document.getElementById('stopwatch-label').value.trim() || 'Stopwatch';
    
    // Hide start, show pause
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    resumeBtn.classList.add('hidden');
    
    // Set timer status
    timerStatus = 'running';
    
    if (timerMode === 'timer') {
        // Timer mode
        timerStartTime = Date.now();
        timerStatusLabel.textContent = `${timerLabel} - Running`;
        
        timerInterval = setInterval(() => {
            const elapsed = Date.now() - timerStartTime;
            const remaining = timerDuration - elapsed;
            
            if (remaining <= 0) {
                // Timer complete
                clearInterval(timerInterval);
                timerDisplay.textContent = '00:00:00';
                timerStatus = 'stopped';
                
                // Reset UI
                startBtn.classList.remove('hidden');
                pauseBtn.classList.add('hidden');
                resumeBtn.classList.add('hidden');
                
                // Play alarm and visual effect
                playAlarmSound();
                flashTimerDisplay();
                
                // Update status
                timerStatusLabel.textContent = `${timerLabel} - Completed!`;
                
                // Show notification
                window.app.showSuccessNotification(`Timer completed: ${timerLabel}`);
                
                // Save to history
                const historyEntry = {
                    type: 'timer',
                    label: timerLabel,
                    duration: formatTime(timerDuration),
                    timestamp: Date.now()
                };
                
                saveTimerToHistory(historyEntry);
            } else {
                // Update display
                timerDisplay.textContent = formatTime(remaining);
            }
        }, 100); // Update every 100ms for smoother countdown
    } else {
        // Stopwatch mode
        timerStartTime = Date.now();
        timerStatusLabel.textContent = `${stopwatchLabel} - Running`;
        
        timerInterval = setInterval(() => {
            const elapsed = Date.now() - timerStartTime;
            timerDisplay.textContent = formatTime(elapsed);
        }, 100); // Update every 100ms for smoother display
    }
}

// Start the stopwatch
function startStopwatch() {
    startTimer(); // Reuse the same function since logic is handled inside
}

// Pause the timer/stopwatch
function pauseTimer() {
    if (timerStatus !== 'running') return;
    
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const timerStatusLabel = document.getElementById('timer-status-label');
    const timerLabel = document.getElementById('timer-label').value.trim() || 'Timer';
    const stopwatchLabel = document.getElementById('stopwatch-label').value.trim() || 'Stopwatch';
    
    // Clear the interval
    clearInterval(timerInterval);
    
    // Update status
    timerStatus = 'paused';
    timerPausedTime = Date.now();
    
    // Update UI
    pauseBtn.classList.add('hidden');
    resumeBtn.classList.remove('hidden');
    
    // Update label
    if (timerMode === 'timer') {
        timerStatusLabel.textContent = `${timerLabel} - Paused`;
    } else {
        timerStatusLabel.textContent = `${stopwatchLabel} - Paused`;
    }
}

// Resume the timer/stopwatch
function resumeTimer() {
    if (timerStatus !== 'paused') return;
    
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const timerStatusLabel = document.getElementById('timer-status-label');
    const timerDisplay = document.getElementById('timer-display').querySelector('div');
    const timerLabel = document.getElementById('timer-label').value.trim() || 'Timer';
    const stopwatchLabel = document.getElementById('stopwatch-label').value.trim() || 'Stopwatch';
    
    // Calculate time elapsed during pause
    const pauseDuration = Date.now() - timerPausedTime;
    
    // Adjust start time to account for pause duration
    timerStartTime += pauseDuration;
    
    // Update status
    timerStatus = 'running';
    
    // Update UI
    resumeBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    
    // Update label
    if (timerMode === 'timer') {
        timerStatusLabel.textContent = `${timerLabel} - Running`;
        
        // Resume timer interval
        timerInterval = setInterval(() => {
            const elapsed = Date.now() - timerStartTime;
            const remaining = timerDuration - elapsed;
            
            if (remaining <= 0) {
                // Timer complete
                clearInterval(timerInterval);
                timerDisplay.textContent = '00:00:00';
                timerStatus = 'stopped';
                
                // Reset UI
                document.getElementById('start-btn').classList.remove('hidden');
                pauseBtn.classList.add('hidden');
                resumeBtn.classList.add('hidden');
                
                // Play alarm and visual effect
                playAlarmSound();
                flashTimerDisplay();
                
                // Update status
                timerStatusLabel.textContent = `${timerLabel} - Completed!`;
                
                // Show notification
                window.app.showSuccessNotification(`Timer completed: ${timerLabel}`);
                
                // Save to history
                const historyEntry = {
                    type: 'timer',
                    label: timerLabel,
                    duration: formatTime(timerDuration),
                    timestamp: Date.now()
                };
                
                saveTimerToHistory(historyEntry);
            } else {
                // Update display
                timerDisplay.textContent = formatTime(remaining);
            }
        }, 100);
    } else {
        // Stopwatch mode
        timerStatusLabel.textContent = `${stopwatchLabel} - Running`;
        
        // Resume stopwatch interval
        timerInterval = setInterval(() => {
            const elapsed = Date.now() - timerStartTime;
            timerDisplay.textContent = formatTime(elapsed);
        }, 100);
    }
}

// Reset the timer/stopwatch
function resetTimer() {
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const timerDisplay = document.getElementById('timer-display').querySelector('div');
    const timerStatusLabel = document.getElementById('timer-status-label');
    
    // If stopwatch mode and was running or paused, save to history
    if (timerMode === 'stopwatch' && (timerStatus === 'running' || timerStatus === 'paused')) {
        const stopwatchLabel = document.getElementById('stopwatch-label').value.trim() || 'Stopwatch';
        let elapsed;
        
        if (timerStatus === 'running') {
            elapsed = Date.now() - timerStartTime;
        } else { // paused
            elapsed = timerPausedTime - timerStartTime;
        }
        
        if (elapsed > 1000) { // Only save if more than 1 second has elapsed
            const historyEntry = {
                type: 'stopwatch',
                label: stopwatchLabel,
                duration: formatTime(elapsed),
                timestamp: Date.now()
            };
            
            saveTimerToHistory(historyEntry);
        }
    }
    
    // Clear interval
    clearInterval(timerInterval);
    
    // Reset variables
    timerStartTime = 0;
    timerPausedTime = 0;
    timerStatus = 'stopped';
    
    // Reset UI
    timerDisplay.textContent = '00:00:00';
    timerStatusLabel.textContent = 'Ready';
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    resumeBtn.classList.add('hidden');
}

// Format time in milliseconds to HH:MM:SS
function formatTime(ms) {
    if (ms < 0) ms = 0;
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Save timer/stopwatch entry to history
function saveTimerToHistory(entry) {
    // Add to local array
    timerHistory.unshift(entry);
    
    // Keep only the last 20 entries
    if (timerHistory.length > 20) {
        timerHistory = timerHistory.slice(0, 20);
    }
    
    // Save to Firebase
    if (currentUser) {
        const timerHistoryRef = window.rtdb.ref(`timerHistory/${currentUser.uid}`);
        timerHistoryRef.set(timerHistory)
            .catch(error => {
                console.error('Error saving timer history:', error);
            });
    }
    
    // Update UI
    renderTimerHistory();
}

// Load timer history from Firebase
function loadTimerHistory() {
    if (!currentUser) return;
    
    const timerHistoryRef = window.rtdb.ref(`timerHistory/${currentUser.uid}`);
    
    timerHistoryRef.once('value')
        .then(snapshot => {
            const history = snapshot.val();
            if (history) {
                timerHistory = history;
                renderTimerHistory();
            }
        })
        .catch(error => {
            console.error('Error loading timer history:', error);
        });
}

// Render timer history in the UI
function renderTimerHistory() {
    const historyContainer = document.getElementById('timer-history');
    if (!historyContainer) return;
    
    // Clear existing content
    historyContainer.innerHTML = '';
    
    if (timerHistory.length === 0) {
        historyContainer.innerHTML = '<p class="text-gray-500">No timer history yet</p>';
        return;
    }
    
    // Add clear history button
    const clearButton = document.createElement('button');
    clearButton.className = 'bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-xs mb-3';
    clearButton.textContent = 'Clear All History';
    clearButton.addEventListener('click', clearTimerHistory);
    historyContainer.appendChild(clearButton);
    
    // Create history list
    const historyList = document.createElement('ul');
    historyList.className = 'space-y-2';
    
    timerHistory.forEach((entry, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'border-b border-gray-100 pb-2';
        
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        listItem.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <span class="font-medium">${entry.label}</span>
                    <span class="text-xs text-gray-500 ml-2">${entry.type === 'timer' ? 'Timer' : 'Stopwatch'}</span>
                </div>
                <div class="flex items-center">
                    <span class="text-indigo-600 font-mono mr-2">${entry.duration}</span>
                    <button class="delete-entry-btn text-red-500 hover:text-red-700" title="Delete this entry">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="text-xs text-gray-500">${dateStr} at ${timeStr}</div>
        `;
        
        // Add event listener for delete button
        const deleteBtn = listItem.querySelector('.delete-entry-btn');
        deleteBtn.addEventListener('click', () => {
            deleteTimerHistoryEntry(index);
        });
        
        historyList.appendChild(listItem);
    });
    
    historyContainer.appendChild(historyList);
}

// Delete a single timer history entry
function deleteTimerHistoryEntry(index) {
    // Remove the entry from the array
    timerHistory.splice(index, 1);
    
    // Update Firebase
    if (currentUser) {
        const timerHistoryRef = window.rtdb.ref(`timerHistory/${currentUser.uid}`);
        timerHistoryRef.set(timerHistory)
            .then(() => {
                window.app.showSuccessNotification('Entry deleted');
            })
            .catch(error => {
                console.error('Error updating timer history:', error);
                window.app.showErrorNotification('Failed to delete entry');
            });
    }
    
    // Update UI
    renderTimerHistory();
}

// Clear timer history
function clearTimerHistory() {
    if (!confirm('Are you sure you want to clear all timer history?')) {
        return;
    }
    
    // Clear local array
    timerHistory = [];
    
    // Clear from Firebase
    if (currentUser) {
        const timerHistoryRef = window.rtdb.ref(`timerHistory/${currentUser.uid}`);
        timerHistoryRef.remove()
            .then(() => {
                window.app.showSuccessNotification('Timer history cleared');
            })
            .catch(error => {
                console.error('Error clearing timer history:', error);
                window.app.showErrorNotification('Failed to clear timer history');
            });
    }
    
    // Update UI
    renderTimerHistory();
}

// Handle task form submission
function handleTaskSubmit(event) {
    event.preventDefault();
    
    // Get form values
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const hoursToComplete = parseInt(document.getElementById('task-hours').value);
    const category = document.getElementById('task-category').value;
    
    if (!title || isNaN(hoursToComplete)) {
        window.app.showErrorNotification('Please fill in all required fields');
        return;
    }
    
    // Calculate end time for the task (current time + hours to complete)
    const now = new Date();
    const endTime = new Date(now.getTime() + (hoursToComplete * 60 * 60 * 1000)); // Convert hours to milliseconds
    
    // Create task object
    const newTask = {
        id: generateUniqueId(),
        title,
        description,
        hoursToComplete,
        category,
        status: 'pending', // pending, completed, overdue
        createdAt: now.toISOString(),
        endTime: endTime.toISOString(),
        userId: currentUser.uid
    };
    
    // Save task to Firebase
    saveTask(newTask);
    
    // Set timer for this task
    setTaskTimer(newTask);
    
    // Reset form
    taskForm.reset();
    
    // Show success notification
    window.app.showSuccessNotification('Task added successfully');
}

// Generate a unique ID for tasks
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Save task to Firebase Realtime Database
function saveTask(task) {
    // Reference to the user's tasks in Realtime Database
    const taskRef = window.rtdb.ref(`tasks/${currentUser.uid}/${task.id}`);
    
    // Save task data
    taskRef.set(task)
        .then(() => {
            console.log('Task saved successfully:', task.id);
            // Update UI will happen automatically via the 'value' listener in loadTasks
        })
        .catch(error => {
            console.error('Error saving task:', error);
            window.app.showErrorNotification('Failed to save task. Please try again.');
        });
}

// Load tasks from Firebase Realtime Database
function loadTasks() {
    // Reference to the user's tasks in Realtime Database
    const tasksRef = window.rtdb.ref(`tasks/${currentUser.uid}`);
    
    // Clear existing tasks and timers
    userTasks = [];
    clearAllTimers();
    
    // Remove any existing listeners first
    tasksRef.off('value');
    
    // Listen for tasks
    tasksRef.on('value', (snapshot) => {
        // Clear existing tasks
        userTasks = [];
        
        // Get tasks from snapshot
        const tasksData = snapshot.val();
        
        if (tasksData) {
            // Convert object to array
            Object.keys(tasksData).forEach(taskId => {
                userTasks.push(tasksData[taskId]);
            });
            
            // Sort tasks by creation date (newest first)
            userTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Set timers for all pending tasks
            userTasks.forEach(task => {
                if (task.status === 'pending') {
                    setTaskTimer(task);
                }
            });
        }
        
        // Update UI
        renderTasks();
        updateRewardDisplay();
    }, (error) => {
        console.error('Error loading tasks:', error);
        
        // Check if it's a permission error, which is expected during logout
        if (error && error.toString().includes('permission_denied')) {
            // This is normal during logout, so we don't need to show an error notification
            console.log('Permission denied error during logout - this is expected');
        } else {
            // For other errors, show a notification
            window.app.showErrorNotification('Error loading tasks. Please refresh the page.');
        }
    });
}

// Set a timer for a task
function setTaskTimer(task) {
    // Clear any existing timer for this task
    if (taskTimers[task.id]) {
        clearTimeout(taskTimers[task.id]);
    }
    
    // Clear any existing countdown interval
    if (countdownIntervals[task.id]) {
        clearInterval(countdownIntervals[task.id]);
    }
    
    // Check if the task is already overdue
    const now = new Date();
    const endTime = new Date(task.endTime);
    
    if (endTime <= now) {
        // Task is already overdue
        if (task.status === 'pending') {
            updateTaskStatus(task.id, 'overdue');
        }
        return;
    }
    
    // Calculate time until the end time
    const timeUntilEnd = endTime.getTime() - now.getTime();
    
    // Set a timer to mark the task as overdue when the time is up
    taskTimers[task.id] = setTimeout(() => {
        // When timer expires, play alarm sound and show notification
        playAlarmSound();
        
        // Show notification
        window.app.showErrorNotification(`Time's up for task: ${task.title}`);
        
        // Update task status to overdue
        updateTaskStatus(task.id, 'overdue');
        
        // Remove the timer reference
        delete taskTimers[task.id];
        
        // Clear the countdown interval
        if (countdownIntervals[task.id]) {
            clearInterval(countdownIntervals[task.id]);
            delete countdownIntervals[task.id];
        }
    }, timeUntilEnd);
    
    console.log(`Timer set for task ${task.id} - will expire in ${Math.floor(timeUntilEnd / 60000)} minutes`);
}

// Clear all task timers and intervals
function clearAllTimers() {
    // Clear all timeout timers
    Object.keys(taskTimers).forEach(taskId => {
        clearTimeout(taskTimers[taskId]);
    });
    taskTimers = {};
    
    // Clear all countdown intervals
    Object.keys(countdownIntervals).forEach(taskId => {
        clearInterval(countdownIntervals[taskId]);
    });
    countdownIntervals = {};
}

// Play alarm sound
function playAlarmSound() {
    // Stop the sound if it's already playing
    alarmSound.pause();
    alarmSound.currentTime = 0;
    
    // Play the sound
    alarmSound.play().catch(error => {
        console.error('Error playing alarm sound:', error);
    });
}

// Update task status in Firebase
function updateTaskStatus(taskId, newStatus) {
    // Reference to the specific task
    const taskRef = window.rtdb.ref(`tasks/${currentUser.uid}/${taskId}`);
    
    // Update task status
    taskRef.update({ status: newStatus })
        .then(() => {
            console.log(`Task ${taskId} status updated to ${newStatus}`);
            
            // If this task has a timer and the status is not pending, clear the timer
            if (taskTimers[taskId] && newStatus !== 'pending') {
                clearTimeout(taskTimers[taskId]);
                delete taskTimers[taskId];
            }
            
            // Clear the countdown interval if it exists
            if (countdownIntervals[taskId]) {
                clearInterval(countdownIntervals[taskId]);
                delete countdownIntervals[taskId];
            }
            
            // Show notification based on the new status
            if (newStatus === 'completed') {
                window.app.showSuccessNotification('Task marked as completed!');
            } else if (newStatus === 'overdue') {
                window.app.showInfoNotification('A task has become overdue!');
            }
        })
        .catch(error => {
            console.error('Error updating task status:', error);
            window.app.showErrorNotification('Failed to update task status. Please try again.');
        });
}

// Delete task from Firebase
function deleteTask(taskId) {
    // Reference to the specific task
    const taskRef = window.rtdb.ref(`tasks/${currentUser.uid}/${taskId}`);
    
    // Delete task
    taskRef.remove()
        .then(() => {
            console.log(`Task ${taskId} deleted successfully`);
            
            // Clear any timer for this task
            if (taskTimers[taskId]) {
                clearTimeout(taskTimers[taskId]);
                delete taskTimers[taskId];
            }
            
            // Clear the countdown interval if it exists
            if (countdownIntervals[taskId]) {
                clearInterval(countdownIntervals[taskId]);
                delete countdownIntervals[taskId];
            }
            
            // Show notification
            window.app.showInfoNotification('Task deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting task:', error);
            window.app.showErrorNotification('Failed to delete task. Please try again.');
        });
}

// Render tasks in the UI
function renderTasks() {
    // Clear existing tasks
    taskList.innerHTML = '';
    
    // Toggle download button visibility based on task count
    const downloadAllTasksBtn = document.getElementById('download-all-tasks-btn');
    if (downloadAllTasksBtn) {
        if (userTasks.length === 0) {
            downloadAllTasksBtn.classList.add('hidden');
        } else {
            downloadAllTasksBtn.classList.remove('hidden');
        }
    }
    
    if (userTasks.length === 0) {
        taskList.innerHTML = '<p class="text-gray-500 text-center p-4">No tasks yet. Add a task to get started!</p>';
        return;
    }
    
    // Render each task
    userTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
        
        // Set up real-time countdown for pending tasks
        if (task.status === 'pending') {
            setupCountdown(task);
        }
    });
}

// Setup real-time countdown for a task
function setupCountdown(task) {
    // Clear any existing countdown interval
    if (countdownIntervals[task.id]) {
        clearInterval(countdownIntervals[task.id]);
    }
    
    // Get the countdown element
    const countdownElement = document.getElementById(`countdown-${task.id}`);
    if (!countdownElement) return;
    
    // Update the countdown immediately
    updateCountdown(task, countdownElement);
    
    // Set interval to update countdown every second
    countdownIntervals[task.id] = setInterval(() => {
        updateCountdown(task, countdownElement);
    }, 1000);
}

// Update countdown display
function updateCountdown(task, countdownElement) {
    const timeRemaining = formatTimeRemaining(task);
    
    // If task is now overdue, update its status
    if (timeRemaining === 'Overdue' && task.status === 'pending') {
        updateTaskStatus(task.id, 'overdue');
    }
    
    // Update the display
    countdownElement.textContent = timeRemaining;
    countdownElement.className = `text-xs ${timeRemaining === 'Overdue' ? 'text-red-500' : 'text-blue-500'} ml-2`;
}

// Format time remaining for display
function formatTimeRemaining(task) {
    if (task.status !== 'pending') {
        return '';
    }
    
    const now = new Date();
    const endTime = new Date(task.endTime);
    
    // If end time is in the past, task is overdue
    if (endTime <= now) {
        return 'Overdue';
    }
    
    // Calculate time difference in milliseconds
    const diffMs = endTime - now;
    
    // Format as hours, minutes and seconds
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

// Create a task element for the UI
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'bg-white p-4 rounded-lg shadow-sm border-l-4 mb-3';
    
    // Set border color based on task status
    if (task.status === 'completed') {
        taskElement.classList.add('border-green-500');
    } else if (task.status === 'overdue') {
        taskElement.classList.add('border-red-500');
    } else {
        taskElement.classList.add('border-indigo-500');
    }
    
    // Get time remaining display
    const timeRemaining = formatTimeRemaining(task);
    
    // Create task content
    taskElement.innerHTML = `
        <div class="flex justify-between">
            <h4 class="font-semibold text-gray-800 ${task.status === 'completed' ? 'line-through' : ''}">${task.title}</h4>
            <span class="text-xs px-2 py-1 rounded-full ${getStatusBadgeClasses(task.status)}">${task.status}</span>
        </div>
        <p class="text-gray-600 text-sm my-2">${task.description || 'No description'}</p>
        <div class="flex justify-between items-center mt-3">
            <div>
                <span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">${task.category}</span>
                <span class="text-xs text-gray-500 ml-2">${task.hoursToComplete} hour${task.hoursToComplete !== 1 ? 's' : ''}</span>
                <span id="countdown-${task.id}" class="text-xs ${task.status === 'overdue' ? 'text-red-500' : 'text-blue-500'} ml-2">${timeRemaining}</span>
            </div>
            <div class="space-x-2">
                ${task.status !== 'completed' ? `<button data-task-id="${task.id}" class="complete-task-btn bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded-md text-xs">Complete</button>` : ''}
                <button data-task-id="${task.id}" class="delete-task-btn bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded-md text-xs">Delete</button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const completeBtn = taskElement.querySelector('.complete-task-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', () => {
            updateTaskStatus(task.id, 'completed');
        });
    }
    
    const deleteBtn = taskElement.querySelector('.delete-task-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            deleteTask(task.id);
        });
    }
    
    return taskElement;
}

// Get CSS classes for status badge
function getStatusBadgeClasses(status) {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'overdue':
            return 'bg-red-100 text-red-800';
        case 'pending':
        default:
            return 'bg-indigo-100 text-indigo-800';
    }
}

// Update reward display
function updateRewardDisplay() {
    if (!rewardDisplay) return;
    
    // Count completed tasks
    const completedTasks = userTasks.filter(task => task.status === 'completed').length;
    
    // Create reward display content
    rewardDisplay.innerHTML = `
        <h3 class="text-lg font-semibold mb-3 text-gray-800">Your Achievements</h3>
        <div class="bg-indigo-50 p-3 rounded-lg text-center">
            <p class="text-2xl font-bold text-indigo-600">${completedTasks}</p>
            <p class="text-sm text-gray-600">Tasks Completed</p>
        </div>
        <div class="mt-4">
            <p class="text-sm text-gray-600 text-center">Complete more tasks to improve your productivity!</p>
        </div>
    `;
}

// Check for overdue tasks daily
function checkOverdueTasks() {
    const now = new Date();
    
    userTasks.forEach(task => {
        if (task.status === 'pending') {
            const endTime = new Date(task.endTime);
            if (endTime <= now) {
                updateTaskStatus(task.id, 'overdue');
            }
        }
    });
}

// Reset module state
function resetModule() {
    isInitialized = false;
    userTasks = [];
    
    // Clear all timers
    clearAllTimers();
    
    // Reset timer/stopwatch
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerStartTime = 0;
    timerPausedTime = 0;
    timerStatus = 'stopped';
    timerHistory = [];
    
    // Reset UI elements if they exist
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        const displayDiv = timerDisplay.querySelector('div');
        if (displayDiv) displayDiv.textContent = '00:00:00';
    }
    
    const timerStatusLabel = document.getElementById('timer-status-label');
    if (timerStatusLabel) timerStatusLabel.textContent = 'Ready';
    
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    
    if (startBtn) startBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
    if (resumeBtn) resumeBtn.classList.add('hidden');
    
    const historyContainer = document.getElementById('timer-history');
    if (historyContainer) historyContainer.innerHTML = '<p class="text-gray-500">No timer history yet</p>';
    
    if (taskList) taskList.innerHTML = '';
    if (rewardDisplay) updateRewardDisplay();
    
    // Reset Calendar Module if available
    if (typeof window.resetCalendarModule === 'function') {
        window.resetCalendarModule();
    }
}

// Attach module to window object to make it accessible from app.js
window.initTodoModule = initTodoModule;
window.deleteNote = deleteNote;
window.downloadNote = downloadNote;
window.downloadAllTasks = downloadAllTasks;

// Initialize To-Do List when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already authenticated (page refresh case)
    if (window.app && window.app.isUserAuthenticated()) {
        initTodoModule();
    }
    
    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            initTodoModule();
        } else {
            // User is signed out
            console.log('User signed out, resetting To-Do List Module');
            resetModule();
        }
    });
    
    // Setup regular check for overdue tasks
    setInterval(checkOverdueTasks, 60 * 1000); // Check every minute
});

// Make timer display flash when timer completes
function flashTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    if (!timerDisplay) return;
    
    // Flash effect - alternate background colors
    let flashCount = 0;
    const flashInterval = setInterval(() => {
        if (flashCount % 2 === 0) {
            // Flash on
            timerDisplay.classList.add('bg-red-100');
        } else {
            // Flash off
            timerDisplay.classList.remove('bg-red-100');
        }
        
        flashCount++;
        
        // Stop flashing after 10 iterations (5 flashes)
        if (flashCount >= 10) {
            clearInterval(flashInterval);
            timerDisplay.classList.remove('bg-red-100');
        }
    }, 300); // Flash every 300ms
}

// Download all tasks as a text file
function downloadAllTasks() {
    try {
        if (!userTasks || userTasks.length === 0) {
            window.app.showErrorNotification('No tasks to download.');
            return;
        }
        
        // Create content for the text file
        let content = "TASK LIST\n";
        content += "=========\n\n";
        content += `Generated on: ${new Date().toLocaleString()}\n\n`;
        
        // Group tasks by status
        const pendingTasks = userTasks.filter(task => task.status === 'pending');
        const completedTasks = userTasks.filter(task => task.status === 'completed');
        const overdueTasks = userTasks.filter(task => task.status === 'overdue');
        
        // Format pending tasks
        if (pendingTasks.length > 0) {
            content += "PENDING TASKS\n";
            content += "-------------\n";
            pendingTasks.forEach((task, index) => {
                content += formatTaskForExport(task, index + 1);
            });
            content += "\n";
        }
        
        // Format completed tasks
        if (completedTasks.length > 0) {
            content += "COMPLETED TASKS\n";
            content += "---------------\n";
            completedTasks.forEach((task, index) => {
                content += formatTaskForExport(task, index + 1);
            });
            content += "\n";
        }
        
        // Format overdue tasks
        if (overdueTasks.length > 0) {
            content += "OVERDUE TASKS\n";
            content += "-------------\n";
            overdueTasks.forEach((task, index) => {
                content += formatTaskForExport(task, index + 1);
            });
            content += "\n";
        }
        
        // Add summary statistics
        content += "SUMMARY\n";
        content += "-------\n";
        content += `Total Tasks: ${userTasks.length}\n`;
        content += `Pending Tasks: ${pendingTasks.length}\n`;
        content += `Completed Tasks: ${completedTasks.length}\n`;
        content += `Overdue Tasks: ${overdueTasks.length}\n`;
        
        // Create a blob with the content
        const blob = new Blob([content], { type: 'text/plain' });
        
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `tasks_${new Date().toISOString().slice(0, 10)}.txt`;
        
        // Append to body, click, and remove
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        window.app.showSuccessNotification('Tasks downloaded successfully!');
    } catch (error) {
        console.error('Error downloading tasks:', error);
        window.app.showErrorNotification('Failed to download tasks. Please try again.');
    }
}

// Format a single task for export to text file
function formatTaskForExport(task, index) {
    const createdDate = new Date(task.createdAt).toLocaleString();
    const endDate = new Date(task.endTime).toLocaleString();
    
    let taskText = `${index}. ${task.title}\n`;
    taskText += `   Category: ${task.category}\n`;
    taskText += `   Status: ${task.status}\n`;
    taskText += `   Time to Complete: ${task.hoursToComplete} hour(s)\n`;
    if (task.description) {
        taskText += `   Description: ${task.description}\n`;
    }
    taskText += `   Created: ${createdDate}\n`;
    taskText += `   Due: ${endDate}\n`;
    taskText += `\n`;
    
    return taskText;
}