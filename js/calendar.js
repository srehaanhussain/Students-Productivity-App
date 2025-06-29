// Calendar Module Functionality
// This module implements the calendar and reminder features with Firebase Realtime Database integration

// Global variables
let calendarCurrentUser = null;
let userReminders = [];
let currentDate = new Date();
let selectedDate = null;
let reminderAlerts = {};

// Initialize the Calendar Module
function initCalendarModule() {
    console.log('Initializing Calendar Module');
    
    // Check if user is authenticated
    if (!window.app.isUserAuthenticated()) {
        console.log('User not authenticated, skipping Calendar initialization');
        return;
    }
    
    // Get current user
    calendarCurrentUser = window.app.getCurrentUser();
    
    // Initialize UI
    initCalendarUI();
    
    // Load user reminders from Firebase
    loadReminders();
    
    // Setup reminder alerts
    setupReminderAlerts();
}

// Initialize Calendar UI components and event listeners
function initCalendarUI() {
    console.log('Setting up Calendar UI and event listeners');
    
    // DOM Elements
    const listViewBtn = document.getElementById('list-view-btn');
    const calendarViewBtn = document.getElementById('calendar-view-btn');
    const listView = document.getElementById('list-view');
    const calendarView = document.getElementById('calendar-view');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    const calendarDays = document.getElementById('calendar-days');
    const dateReminders = document.getElementById('date-reminders');
    const selectedDateEl = document.getElementById('selected-date');
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const reminderForm = document.getElementById('reminder-form');
    const addReminderForm = document.getElementById('add-reminder-form');
    const cancelReminderBtn = document.getElementById('cancel-reminder-btn');
    
    // View toggle buttons
    listViewBtn.addEventListener('click', () => {
        listViewBtn.classList.add('bg-indigo-600', 'text-white');
        listViewBtn.classList.remove('bg-gray-100', 'text-gray-700');
        calendarViewBtn.classList.add('bg-gray-100', 'text-gray-700');
        calendarViewBtn.classList.remove('bg-indigo-600', 'text-white');
        
        listView.classList.remove('hidden');
        calendarView.classList.add('hidden');
    });
    
    calendarViewBtn.addEventListener('click', () => {
        calendarViewBtn.classList.add('bg-indigo-600', 'text-white');
        calendarViewBtn.classList.remove('bg-gray-100', 'text-gray-700');
        listViewBtn.classList.add('bg-gray-100', 'text-gray-700');
        listViewBtn.classList.remove('bg-indigo-600', 'text-white');
        
        calendarView.classList.remove('hidden');
        listView.classList.add('hidden');
        
        // Render calendar when switching to calendar view
        renderCalendar();
    });
    
    // Month navigation
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    // Add reminder button
    addReminderBtn.addEventListener('click', () => {
        dateReminders.classList.add('hidden');
        reminderForm.classList.remove('hidden');
    });
    
    // Cancel reminder button
    cancelReminderBtn.addEventListener('click', () => {
        reminderForm.classList.add('hidden');
        dateReminders.classList.remove('hidden');
        addReminderForm.reset();
    });
    
    // Add reminder form submission
    addReminderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('reminder-title').value.trim();
        const description = document.getElementById('reminder-description').value.trim();
        
        if (title && selectedDate) {
            const reminder = {
                id: generateUniqueId(),
                title: title,
                description: description,
                date: selectedDate.toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                userId: calendarCurrentUser.uid
            };
            
            // Save reminder to Firebase
            saveReminder(reminder);
            
            // Reset form and show reminders list
            addReminderForm.reset();
            reminderForm.classList.add('hidden');
            dateReminders.classList.remove('hidden');
            
            // Refresh reminders for selected date
            showRemindersForDate(selectedDate);
        }
    });
    
    // Initial calendar render
    renderCalendar();
}

// Render the calendar for the current month
function renderCalendar() {
    const calendarDays = document.getElementById('calendar-days');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    
    // Clear previous calendar
    calendarDays.innerHTML = '';
    
    // Set month and year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    calendarMonthYear.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    // Get first day of month and total days in month
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const totalDays = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Create empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'h-10 border border-gray-200 bg-gray-50';
        calendarDays.appendChild(emptyCell);
    }
    
    // Create cells for each day of the month
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateString = date.toISOString().split('T')[0];
        
        const dayCell = document.createElement('div');
        dayCell.className = 'h-10 border border-gray-200 relative';
        
        // Check if this day has reminders
        const hasReminders = userReminders.some(reminder => reminder.date === dateString);
        
        // Check if this is today
        const isToday = today.getFullYear() === date.getFullYear() && 
                        today.getMonth() === date.getMonth() && 
                        today.getDate() === date.getDate();
        
        // Apply styles based on conditions
        if (isToday) {
            dayCell.classList.add('bg-indigo-100');
        }
        
        // Create day number element
        const dayNumber = document.createElement('div');
        dayNumber.className = 'absolute top-1 left-1 text-xs font-medium';
        dayNumber.textContent = day;
        
        // Add indicator for days with reminders
        if (hasReminders) {
            const indicator = document.createElement('div');
            indicator.className = 'absolute bottom-1 right-1 w-2 h-2 bg-indigo-600 rounded-full';
            dayCell.appendChild(indicator);
        }
        
        dayCell.appendChild(dayNumber);
        
        // Add click event to show reminders for this date
        dayCell.addEventListener('click', () => {
            selectedDate = date;
            showRemindersForDate(date);
        });
        
        calendarDays.appendChild(dayCell);
    }
}

// Show reminders for a specific date
function showRemindersForDate(date) {
    const dateReminders = document.getElementById('date-reminders');
    const selectedDateEl = document.getElementById('selected-date');
    const remindersList = document.getElementById('reminders-list');
    const reminderForm = document.getElementById('reminder-form');
    
    // Format date display
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    selectedDateEl.textContent = date.toLocaleDateString(undefined, options);
    
    // Show reminders section and hide form
    dateReminders.classList.remove('hidden');
    reminderForm.classList.add('hidden');
    
    // Filter reminders for this date
    const dateString = date.toISOString().split('T')[0];
    const filteredReminders = userReminders.filter(reminder => reminder.date === dateString);
    
    // Clear previous reminders
    remindersList.innerHTML = '';
    
    // Display reminders or empty message
    if (filteredReminders.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'text-gray-500 text-center py-4';
        emptyMessage.textContent = 'No reminders for this date';
        remindersList.appendChild(emptyMessage);
    } else {
        filteredReminders.forEach(reminder => {
            const reminderEl = createReminderElement(reminder);
            remindersList.appendChild(reminderEl);
        });
    }
}

// Create a reminder element
function createReminderElement(reminder) {
    const reminderEl = document.createElement('div');
    reminderEl.className = 'bg-gray-50 p-3 rounded-md mb-2 border-l-4 border-indigo-500';
    reminderEl.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h4 class="font-medium text-gray-800">${reminder.title}</h4>
                ${reminder.description ? `<p class="text-gray-600 text-sm mt-1">${reminder.description}</p>` : ''}
            </div>
            <button class="delete-reminder-btn text-gray-400 hover:text-red-500" data-id="${reminder.id}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;
    
    // Add delete event listener
    reminderEl.querySelector('.delete-reminder-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this reminder?')) {
            deleteReminder(reminder.id);
        }
    });
    
    return reminderEl;
}

// Generate a unique ID for reminders
function generateUniqueId() {
    return 'reminder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Save reminder to Firebase
function saveReminder(reminder) {
    const db = window.firebase.database();
    const reminderRef = db.ref(`reminders/${calendarCurrentUser.uid}/${reminder.id}`);
    
    reminderRef.set(reminder)
        .then(() => {
            console.log('Reminder saved successfully');
            
            // Add to local array
            userReminders.push(reminder);
            
            // Re-render calendar to show new indicators
            renderCalendar();
            
            // Setup alert for this reminder if it's for today or future
            setupReminderAlert(reminder);
        })
        .catch(error => {
            console.error('Error saving reminder:', error);
            alert('Failed to save reminder. Please try again.');
        });
}

// Load reminders from Firebase
function loadReminders() {
    if (!calendarCurrentUser) return;
    
    const db = window.firebase.database();
    const remindersRef = db.ref(`reminders/${calendarCurrentUser.uid}`);
    
    remindersRef.once('value')
        .then(snapshot => {
            userReminders = [];
            
            snapshot.forEach(childSnapshot => {
                const reminder = childSnapshot.val();
                userReminders.push(reminder);
            });
            
            console.log(`Loaded ${userReminders.length} reminders`);
            
            // Render calendar with loaded reminders
            renderCalendar();
            
            // Setup alerts for all reminders
            setupReminderAlerts();
        })
        .catch(error => {
            console.error('Error loading reminders:', error);
        });
}

// Delete reminder from Firebase
function deleteReminder(reminderId) {
    const db = window.firebase.database();
    const reminderRef = db.ref(`reminders/${calendarCurrentUser.uid}/${reminderId}`);
    
    reminderRef.remove()
        .then(() => {
            console.log('Reminder deleted successfully');
            
            // Remove from local array
            userReminders = userReminders.filter(reminder => reminder.id !== reminderId);
            
            // Re-render calendar
            renderCalendar();
            
            // Refresh reminders for selected date
            if (selectedDate) {
                showRemindersForDate(selectedDate);
            }
            
            // Clear any alerts for this reminder
            if (reminderAlerts[reminderId]) {
                clearTimeout(reminderAlerts[reminderId]);
                delete reminderAlerts[reminderId];
            }
        })
        .catch(error => {
            console.error('Error deleting reminder:', error);
            alert('Failed to delete reminder. Please try again.');
        });
}

// Setup alerts for all reminders
function setupReminderAlerts() {
    // Clear any existing alerts
    Object.values(reminderAlerts).forEach(timeout => clearTimeout(timeout));
    reminderAlerts = {};
    
    // Setup alerts for each reminder
    userReminders.forEach(reminder => {
        setupReminderAlert(reminder);
    });
}

// Setup alert for a specific reminder
function setupReminderAlert(reminder) {
    const reminderDate = new Date(reminder.date + 'T00:00:00');
    const now = new Date();
    
    // Only set alerts for today or future reminders
    if (reminderDate >= now) {
        // Calculate time until reminder date (at 9:00 AM)
        reminderDate.setHours(9, 0, 0, 0);
        const timeUntilReminder = reminderDate.getTime() - now.getTime();
        
        if (timeUntilReminder > 0) {
            // Set timeout for the reminder alert
            reminderAlerts[reminder.id] = setTimeout(() => {
                showReminderNotification(reminder);
            }, timeUntilReminder);
            
            console.log(`Alert set for reminder: ${reminder.title} on ${reminder.date} (in ${Math.round(timeUntilReminder / (1000 * 60 * 60))} hours)`);
        }
    }
}

// Show notification for a reminder
function showReminderNotification(reminder) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border-l-4 border-indigo-500 z-50 max-w-md fade-in';
    notification.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0 text-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div class="ml-3">
                <h3 class="text-gray-800 font-medium">Reminder: ${reminder.title}</h3>
                ${reminder.description ? `<p class="text-gray-600 text-sm mt-1">${reminder.description}</p>` : ''}
                <p class="text-gray-500 text-xs mt-2">Today</p>
            </div>
            <button class="ml-auto text-gray-400 hover:text-gray-500 close-notification">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Play notification sound
    const notificationSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-alert-notification-256.mp3');
    notificationSound.play();
    
    // Add close button event
    notification.querySelector('.close-notification').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }
    }, 10000);
}

// Reset module state on sign out
function resetCalendarModule() {
    calendarCurrentUser = null;
    userReminders = [];
    
    // Clear any existing alerts
    Object.values(reminderAlerts).forEach(timeout => clearTimeout(timeout));
    reminderAlerts = {};
}

// Initialize module on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize module when user authentication state changes
    window.firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            initCalendarModule();
        } else {
            resetCalendarModule();
        }
    });
});

// Export functions for global access
window.initCalendarModule = initCalendarModule;
window.resetCalendarModule = resetCalendarModule;