// Main application functionality for Student Productivity App

// DOM Elements
const appContainer = document.getElementById('app');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Student Productivity App initialized');
    
    // Check if Firebase is properly initialized
    if (typeof firebase !== 'undefined' && firebase.app()) {
        console.log('Firebase connection verified');
    } else {
        console.error('Firebase not initialized properly');
        showErrorNotification('Could not connect to the database. Please try again later.');
    }
    
    // Initialize navigation functionality
    initNavigation();
});

// Initialize bottom navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('#bottom-nav .nav-link');
    const todoModule = document.getElementById('todo-module');
    const marksModule = document.getElementById('marks-module');
    const chatModule = document.getElementById('chat-module');
    
    // Function to activate a nav item
    function activateNavItem(navLink) {
        // Remove active class from all items
        navLinks.forEach(link => {
            link.classList.remove('bg-indigo-50', 'text-indigo-600');
            link.querySelector('svg').classList.remove('text-indigo-600');
            link.querySelector('svg').classList.add('text-gray-500');
            link.querySelector('.active-indicator').classList.remove('opacity-100', 'w-4', 'h-1');
            link.querySelector('.active-indicator').classList.add('opacity-0', 'w-1');
        });
        
        // Add active class to the selected item
        navLink.classList.add('bg-indigo-50', 'text-indigo-600');
        navLink.querySelector('svg').classList.remove('text-gray-500');
        navLink.querySelector('svg').classList.add('text-indigo-600');
        navLink.querySelector('.active-indicator').classList.remove('opacity-0', 'w-1');
        navLink.querySelector('.active-indicator').classList.add('opacity-100', 'w-4', 'h-1');
    }
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Activate clicked nav item
            activateNavItem(link);
            
            // Handle navigation based on data-section attribute
            const section = link.getAttribute('data-section');
            console.log(`Navigating to: ${section}`);
            
            // Hide all modules
    todoModule.classList.add('hidden');
    marksModule.classList.add('hidden');
    chatModule.classList.add('hidden');
    
    // Hide profile module if it exists
    const profileModule = document.getElementById('profile-module');
    if (profileModule) {
        profileModule.classList.add('hidden');
    }
            
            // Show selected module
            if (section === 'todo') {
                todoModule.classList.remove('hidden');
            } else if (section === 'marks') {
                marksModule.classList.remove('hidden');
            } else if (section === 'chat') {
                chatModule.classList.remove('hidden');
                // Initialize chat module if it's the first time
                if (typeof window.initChatModule === 'function') {
                    window.initChatModule();
                }
            } else if (section === 'profile') {
                // Show profile module
                const profileModule = document.getElementById('profile-module');
                profileModule.classList.remove('hidden');
                // Initialize profile module if it's the first time
                if (typeof window.initProfileModule === 'function') {
                    window.initProfileModule();
                }
            }
        });
    });
    
    // Set Todo as default active navigation item
    if (navLinks.length > 0) {
        const todoLink = document.querySelector('[data-section="todo"]');
        if (todoLink) {
            activateNavItem(todoLink);
        }
    }
}

// --- Unified Notification System ---
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'custom-notification fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg shadow-xl max-w-md w-full transition-all duration-300 ease-out opacity-0 scale-95';
    // Set styles based on notification type
    if (type === 'error') {
        notification.classList.add('bg-red-100', 'border-l-4', 'border-red-500', 'text-red-700');
    } else if (type === 'success') {
        notification.classList.add('bg-green-100', 'border-l-4', 'border-green-500', 'text-green-700');
    } else if (type === 'info') {
        notification.classList.add('bg-blue-100', 'border-l-4', 'border-blue-500', 'text-blue-700');
    } else if (type === 'warning') {
        notification.classList.add('bg-yellow-100', 'border-l-4', 'border-yellow-500', 'text-yellow-700');
    }
    // Create notification content
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <div class="py-1">
                    <svg class="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        ${type === 'error' ? 
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' : 
                            type === 'success' ? 
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' :
                            type === 'warning' ?
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>' :
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
                        }
                    </svg>
                </div>
                <div>
                    <p class="font-bold text-lg">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                    <p class="text-sm font-medium">${message}</p>
                </div>
            </div>
            <span class="cursor-pointer close-notification">
                <svg class="h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </span>
        </div>
    `;
    // Add to document
    document.body.appendChild(notification);
    // Add close button event listener
    const closeButton = notification.querySelector('.close-notification');
    closeButton.addEventListener('click', () => {
        notification.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    // Animate in
    setTimeout(() => {
        notification.classList.remove('opacity-0', 'scale-95');
        notification.classList.add('opacity-100', 'scale-100');
    }, 10);
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 7000);
}
function showErrorNotification(message) { showNotification(message, 'error'); }
function showInfoNotification(message) { showNotification(message, 'info'); }
function showSuccessNotification(message) { showNotification(message, 'success'); }
function showWarningNotification(message) { showNotification(message, 'warning'); }

// Function to check if user is authenticated
function isUserAuthenticated() {
    return auth.currentUser !== null;
}

// Function to get current user data
function getCurrentUser() {
    return auth.currentUser;
}

// Function to get user profile data from Firestore
async function getUserProfile(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

// Export utility functions for use in other modules
window.app = {
    isUserAuthenticated,
    getCurrentUser,
    getUserProfile,
    showErrorNotification,
    showInfoNotification,
    showSuccessNotification,
    showWarningNotification
};
window.showNotification = showNotification;