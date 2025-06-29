// Authentication functionality for Student Productivity App

// Check which page we're on
const isLoginPage = window.location.pathname.includes('login.html');
const isMainApp = !isLoginPage;

// Initialize DOM Elements based on current page
let userStatus, userName, userEmail, logoutBtn, logoutBtnSvg;
let loginTab, signupTab, loginForm, signupForm, authContainer;
let appDashboard, bottomNav, profileName, profileEmail;
let statusMessage, toSignupLink, toLoginLink;

// Initialize elements based on current page
if (isLoginPage) {
    // Login page elements
    loginTab = document.getElementById('login-tab');
    signupTab = document.getElementById('signup-tab');
    loginForm = document.getElementById('login-form');
    signupForm = document.getElementById('signup-form');
    authContainer = document.getElementById('auth-container');
    statusMessage = document.getElementById('status-message');
    toSignupLink = document.getElementById('to-signup');
    toLoginLink = document.getElementById('to-login');
} else {
    // Main app elements
    appDashboard = document.getElementById('app-dashboard');
    bottomNav = document.getElementById('bottom-nav');
    userStatus = document.getElementById('user-status');
    userName = document.getElementById('user-name');
    userEmail = document.getElementById('user-email');
    logoutBtn = document.getElementById('logout-btn');
    logoutBtnSvg = document.getElementById('logout-btn-svg');
    profileName = document.getElementById('profile-name');
    profileEmail = document.getElementById('profile-email');
}

// Function to show status messages
function showStatusMessage(message, type = 'error') {
    if (!statusMessage) return;
    
    // Clear any existing classes first
    statusMessage.className = 'mb-4 p-3 rounded text-center';
    
    // Add appropriate styling based on message type
    if (type === 'error') {
        statusMessage.classList.add('bg-red-100', 'text-red-700', 'border', 'border-red-200');
    } else if (type === 'success') {
        statusMessage.classList.add('bg-green-100', 'text-green-700', 'border', 'border-green-200');
    } else if (type === 'info') {
        statusMessage.classList.add('bg-blue-100', 'text-blue-700', 'border', 'border-blue-200');
    }
    
    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden');
    
    // Auto-hide message after 5 seconds
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 5000);
}

// Tab switching functionality for login page
if (isLoginPage && loginTab && signupTab) {
    // Toggle between login and signup via tab buttons
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('border-indigo-600', 'text-indigo-600');
        loginTab.classList.remove('border-gray-200', 'text-gray-500');
        signupTab.classList.add('border-gray-200', 'text-gray-500');
        signupTab.classList.remove('border-indigo-600', 'text-indigo-600');
        
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });

    signupTab.addEventListener('click', () => {
        signupTab.classList.add('border-indigo-600', 'text-indigo-600');
        signupTab.classList.remove('border-gray-200', 'text-gray-500');
        loginTab.classList.add('border-gray-200', 'text-gray-500');
        loginTab.classList.remove('border-indigo-600', 'text-indigo-600');
        
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // Toggle between login and signup via links
    if (toSignupLink) {
        toSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupTab.click();
        });
    }
    
    if (toLoginLink) {
        toLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginTab.click();
        });
    }

    // Form submission handlers
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form values
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Clear any existing error messages
        clearErrorMessages();
        
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="spinner mr-2"></span> Logging in...';
        submitBtn.disabled = true;
        
        try {
            // Sign in with Firebase Auth
            await auth.signInWithEmailAndPassword(email, password);
            // Login successful - will redirect via auth state listener
            showStatusMessage('Login successful! Redirecting...', 'success');
        } catch (error) {
            // Display error message in status area
            showStatusMessage(getAuthErrorMessage(error), 'error');
            
            // Reset button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            
            console.error('Login error:', error);
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form values
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        
        // Clear any existing error messages
        clearErrorMessages();
        
        // Validate passwords match
        if (password !== confirmPassword) {
            showStatusMessage('Passwords do not match', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="spinner mr-2"></span> Creating account...';
        submitBtn.disabled = true;
        
        try {
            // Create user with Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Add user profile to Firestore
            await db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Signup successful - will redirect via auth state listener
            showStatusMessage('Account created successfully! Redirecting...', 'success');
        } catch (error) {
            // Display error message in status area
            showStatusMessage(getAuthErrorMessage(error), 'error');
            
            // Reset button
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            
            console.error('Signup error:', error);
        }
    });
}

// Function to detach all Firebase listeners
function detachFirebaseListeners() {
    try {
        if (window.rtdb) {
            // Detach any task listeners
            const user = auth.currentUser;
            if (user) {
                // Detach tasks listeners
                window.rtdb.ref(`tasks/${user.uid}`).off();
                
                // Detach any other listeners that might be causing issues
                // Add more as needed for other modules
            }
        }
        console.log('Firebase listeners detached successfully');
    } catch (error) {
        console.error('Error detaching Firebase listeners:', error);
    }
}

// Logout functionality - only on main app
if (isMainApp && logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            // Detach Firebase listeners before logout
            detachFirebaseListeners();
            
            await auth.signOut();
            // Redirect to login page after successful logout
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    });

    // SVG Logout button functionality (for small screens)
    if (logoutBtnSvg) {
        logoutBtnSvg.addEventListener('click', async () => {
            try {
                // Detach Firebase listeners before logout
                detachFirebaseListeners();
                
                await auth.signOut();
                // Redirect to login page after successful logout
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}

// Auth state change listener
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        console.log('User signed in:', user.email);
        
        if (isLoginPage) {
            // Redirect to main app if on login page
            window.location.href = 'index.html';
            return;
        }
        
        // Update UI for authenticated user (main app)
        if (isMainApp) {
            if (appDashboard) appDashboard.classList.remove('hidden');
            if (bottomNav) bottomNav.classList.remove('hidden');
            
            // Display user information in header
            if (userName) userName.textContent = ''; // Remove username display
            if (userEmail) userEmail.textContent = user.email;
            
            // Show SVG logout button
            if (logoutBtnSvg) logoutBtnSvg.classList.remove('hidden');
            
            // Update profile information
            updateProfileInfo(user);
            
            // Show To-Do module by default
            const todoModule = document.getElementById('todo-module');
            if (todoModule) todoModule.classList.remove('hidden');
            
            // Make sure the To-Do nav item is active
            const todoNavItem = document.querySelector('[data-section="todo"]');
            if (todoNavItem) {
                // Activate the Todo nav item with the new styling
                todoNavItem.classList.add('bg-indigo-50', 'text-indigo-600');
                const todoIcon = todoNavItem.querySelector('svg');
                if (todoIcon) {
                    todoIcon.classList.remove('text-gray-500');
                    todoIcon.classList.add('text-indigo-600');
                }
                const indicator = todoNavItem.querySelector('.active-indicator');
                if (indicator) {
                    indicator.classList.remove('opacity-0', 'w-1');
                    indicator.classList.add('opacity-100', 'w-4', 'h-1');
                }
            }
        }
    } else {
        // User is signed out
        console.log('User signed out');
        
        // Make sure all Firebase listeners are detached
        try {
            if (window.rtdb) {
                console.log('Cleaning up any remaining Firebase listeners');
                // Detach any global listeners that don't require user context
            }
        } catch (error) {
            console.error('Error during Firebase cleanup on sign out:', error);
        }
        
        if (isMainApp) {
            // Redirect to login page if on main app
            window.location.href = 'login.html';
        }
    }
});

// Helper functions
function clearErrorMessages() {
    // Remove all error messages
    document.querySelectorAll('.error-message').forEach(el => el.remove());
}

function getAuthErrorMessage(error) {
    const errorCode = error.code;
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'This email is already in use.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use at least 6 characters.';
        default:
            return error.message || 'An error occurred. Please try again.';
    }
}

async function updateProfileInfo(user) {
    if (!isMainApp) return;
    
    try {
        // If we have profile elements, update them
        if (profileName && profileEmail) {
            // Try to get additional user data from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                profileEmail.textContent = user.email;
                // Remove name display from profile
                if (profileName) {
                    profileName.textContent = '';
                }
            } else {
                // Fallback to auth user data
                profileEmail.textContent = user.email;
                // Remove name display from profile
                if (profileName) {
                    profileName.textContent = '';
                }
            }
        }
    } catch (error) {
        console.error('Error updating profile info:', error);
    }
}