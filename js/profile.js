// Profile functionality for Student Productivity App

// Initialize profile module
window.initProfileModule = function() {
    console.log('Initializing profile module');
    // This function will be called when the profile tab is clicked
    updateProfileData();
    setupProfileEventListeners();
};

// DOM Elements
let profileEmailDisplay;
let logoutProfileBtn;
let downloadAllDataBtn;
let deleteAccountBtn;

// Function to initialize DOM elements
function initProfileElements() {
    profileEmailDisplay = document.getElementById('profile-email');
    logoutProfileBtn = document.getElementById('logout-profile-btn');
    downloadAllDataBtn = document.getElementById('download-all-data-btn');
    deleteAccountBtn = document.getElementById('delete-account-btn');
}

// Function to update profile data
function updateProfileData() {
    initProfileElements();
    
    const currentUser = auth.currentUser;
    if (currentUser) {
        // Display user email
        if (profileEmailDisplay) {
            profileEmailDisplay.textContent = currentUser.email;
        }
    } else {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
    }
}

// Setup event listeners for profile actions
function setupProfileEventListeners() {
    initProfileElements();
    
    // Logout button event listener
    if (logoutProfileBtn) {
        logoutProfileBtn.addEventListener('click', handleLogout);
    }
    
    // Download all data button event listener
    if (downloadAllDataBtn) {
        downloadAllDataBtn.addEventListener('click', downloadAllUserData);
    }
    
    // Delete account button event listener
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', confirmDeleteAccount);
    }
}

// Handle logout functionality
async function handleLogout() {
    try {
        // Detach any Firebase listeners to prevent memory leaks
        if (typeof detachFirebaseListeners === 'function') {
            detachFirebaseListeners();
        }
        
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error during logout:', error);
        window.app.showErrorNotification('Failed to log out. Please try again.');
    }
}

// Download all user data function
async function downloadAllUserData() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        // Show loading notification
        window.app.showInfoNotification('Gathering your data. Please wait...');
        
        // Set up the document content
        const docContent = await generateUserDocumentContent(currentUser.uid);
        
        // Create a Blob with the document content
        const blob = new Blob([docContent], { type: 'text/plain' });
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `student_productivity_data_${new Date().toISOString().split('T')[0]}.txt`;
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Success notification
        window.app.showSuccessNotification('Your data has been downloaded successfully!');
    } catch (error) {
        console.error('Error downloading user data:', error);
        window.app.showErrorNotification('Failed to download your data. Please try again.');
    }
}

// Generate document content with all user data
async function generateUserDocumentContent(userId) {
    let documentContent = '';
    
    // Add header
    documentContent += '==================================================\n';
    documentContent += '      STUDENT PRODUCTIVITY APP - USER DATA         \n';
    documentContent += '==================================================\n\n';
    
    documentContent += `Generated Date: ${new Date().toLocaleString()}\n\n`;
    
    try {
        // Get user details
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};
        
        documentContent += '==================================================\n';
        documentContent += 'USER INFORMATION\n';
        documentContent += '==================================================\n\n';
        documentContent += `Email: ${userData.email || auth.currentUser.email}\n`;
        documentContent += `Account Created: ${userData.createdAt ? userData.createdAt.toDate().toLocaleString() : 'N/A'}\n\n`;
        
        // Get tasks data
        documentContent += '==================================================\n';
        documentContent += 'TASK INFORMATION\n';
        documentContent += '==================================================\n\n';
        
        const tasksRef = window.rtdb.ref(`tasks/${userId}`);
        const tasksSnapshot = await tasksRef.once('value');
        const tasksData = tasksSnapshot.val() || {};
        
        documentContent += 'Tasks:\n\n';
        let tasksCount = 0;
        
        Object.keys(tasksData).forEach(taskId => {
            tasksCount++;
            const task = tasksData[taskId];
            documentContent += `Task #${tasksCount}: ${task.title}\n`;
            documentContent += `Description: ${task.description || 'N/A'}\n`;
            documentContent += `Category: ${task.category}\n`;
            documentContent += `Hours to Complete: ${task.hours}\n`;
            documentContent += `Status: ${task.completed ? 'Completed' : 'Pending'}\n\n`;
        });
        
        if (tasksCount === 0) {
            documentContent += 'No tasks found.\n\n';
        }
        
        // Get notes data
        documentContent += '==================================================\n';
        documentContent += 'NOTES INFORMATION\n';
        documentContent += '==================================================\n\n';
        
        const notesRef = window.rtdb.ref(`notes/${userId}`);
        const notesSnapshot = await notesRef.once('value');
        const notesData = notesSnapshot.val() || {};
        
        documentContent += 'Notes:\n\n';
        let notesCount = 0;
        
        Object.keys(notesData).forEach(noteId => {
            notesCount++;
            const note = notesData[noteId];
            documentContent += `Note #${notesCount}: ${note.title}\n`;
            documentContent += `Content: ${note.description}\n`;
            documentContent += `Created: ${new Date(note.timestamp).toLocaleString()}\n\n`;
        });
        
        if (notesCount === 0) {
            documentContent += 'No notes found.\n\n';
        }
        
        // Get marks data
        documentContent += '==================================================\n';
        documentContent += 'ACADEMIC PERFORMANCE INFORMATION\n';
        documentContent += '==================================================\n\n';
        
        // Subjects
        const subjectsRef = window.rtdb.ref(`subjects/${userId}`);
        const subjectsSnapshot = await subjectsRef.once('value');
        const subjectsData = subjectsSnapshot.val() || {};
        
        documentContent += 'Subjects:\n\n';
        
        Object.keys(subjectsData).forEach(subjectId => {
            const subject = subjectsData[subjectId];
            documentContent += `Subject: ${subject.name} (${subject.code})\n`;
            documentContent += `Maximum Marks: ${subject.maxMarks}\n\n`;
        });
        
        if (Object.keys(subjectsData).length === 0) {
            documentContent += 'No subjects found.\n\n';
        }
        
        // Marks
        const marksRef = window.rtdb.ref(`marks/${userId}`);
        const marksSnapshot = await marksRef.once('value');
        const marksData = marksSnapshot.val() || {};
        
        documentContent += 'Marks:\n\n';
        let marksCount = 0;
        
        Object.keys(marksData).forEach(markId => {
            marksCount++;
            const mark = marksData[markId];
            const subjectInfo = subjectsData[mark.subjectId] || { name: 'Unknown', maxMarks: 100 };
            
            documentContent += `Mark #${marksCount}:\n`;
            documentContent += `Subject: ${subjectInfo.name}\n`;
            documentContent += `Value: ${mark.value} / ${subjectInfo.maxMarks}\n`;
            documentContent += `Percentage: ${(mark.value / subjectInfo.maxMarks * 100).toFixed(2)}%\n`;
            documentContent += `Exam Type: ${mark.examType}`;
            if (mark.examNumber) {
                documentContent += ` #${mark.examNumber}`;
            }
            documentContent += `\n`;
            documentContent += `Exam Date: ${mark.examDate}\n\n`;
        });
        
        if (marksCount === 0) {
            documentContent += 'No marks found.\n\n';
        }
        
        // Get saved AI chat responses
        documentContent += '==================================================\n';
        documentContent += 'SAVED AI CHAT RESPONSES\n';
        documentContent += '==================================================\n\n';
        
        const chatResponsesRef = window.rtdb.ref(`users/${userId}/savedResponses`);
        const chatResponsesSnapshot = await chatResponsesRef.once('value');
        const chatResponsesData = chatResponsesSnapshot.val() || {};
        
        documentContent += 'Saved Responses:\n\n';
        let responseCount = 0;
        
        Object.keys(chatResponsesData).forEach(responseId => {
            responseCount++;
            const response = chatResponsesData[responseId];
            documentContent += `Response #${responseCount}:\n`;
            documentContent += `Response: ${response.content}\n`;
            documentContent += `Saved On: ${new Date(response.timestamp).toLocaleString()}\n\n`;
        });
        
        if (responseCount === 0) {
            documentContent += 'No saved AI responses found.\n\n';
        }
        
        documentContent += '==================================================\n';
        documentContent += 'END OF DOCUMENT\n';
        documentContent += '==================================================\n';
    } catch (error) {
        console.error('Error generating document content:', error);
        documentContent += `\nError generating complete data: ${error.message}\n`;
    }
    
    return documentContent;
}

// Account deletion confirmation
function confirmDeleteAccount() {
    // Create confirmation modal
    const modalBackground = document.createElement('div');
    modalBackground.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white p-6 rounded-lg shadow-md max-w-md w-full mx-4';
    
    modalContent.innerHTML = `
        <h3 class="text-xl font-bold text-red-600 mb-4">Delete Account</h3>
        <p class="mb-6 text-gray-700">This action will permanently delete your account and ALL your data. This cannot be undone.</p>
        <p class="mb-6 text-gray-700">To confirm, please enter your password:</p>
        <input type="password" id="confirm-password" class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mb-4" placeholder="Your password">
        <div class="flex justify-end space-x-3">
            <button id="cancel-delete-btn" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded">Cancel</button>
            <button id="confirm-delete-btn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed" disabled>Delete My Account</button>
        </div>
    `;
    
    modalBackground.appendChild(modalContent);
    document.body.appendChild(modalBackground);
    
    // Add event listeners
    const passwordInput = document.getElementById('confirm-password');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    
    // Enable delete button only when password is entered
    passwordInput.addEventListener('input', () => {
        confirmDeleteBtn.disabled = !passwordInput.value;
    });
    
    // Cancel button closes modal
    cancelDeleteBtn.addEventListener('click', () => {
        document.body.removeChild(modalBackground);
    });
    
    // Confirm button processes deletion
    confirmDeleteBtn.addEventListener('click', () => {
        const password = passwordInput.value;
        if (password) {
            deleteUserAccount(password);
            document.body.removeChild(modalBackground);
        }
    });
}

// Delete user account and all related data
async function deleteUserAccount(password) {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        // Show loading notification
        window.app.showInfoNotification('Processing account deletion...');
        
        // Get user email for reauthentication
        const email = currentUser.email;
        
        // Create credentials
        const credentials = firebase.auth.EmailAuthProvider.credential(email, password);
        
        // Reauthenticate user
        await currentUser.reauthenticateWithCredential(credentials);
        
        // Delete user data from Realtime Database
        await deleteUserData(currentUser.uid);
        
        // Delete user document from Firestore
        await db.collection('users').doc(currentUser.uid).delete();
        
        // Delete Auth user
        await currentUser.delete();
        
        // Show success and redirect
        window.app.showSuccessNotification('Account successfully deleted');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } catch (error) {
        console.error('Error deleting account:', error);
        let errorMessage = 'Failed to delete account. ';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage += 'Incorrect password.';
        } else {
            errorMessage += 'Please try again later.';
        }
        
        window.app.showErrorNotification(errorMessage);
    }
}

// Delete all user data from Realtime Database
async function deleteUserData(userId) {
    try {
        // Delete tasks
        await window.rtdb.ref(`tasks/${userId}`).remove();
        
        // Delete notes
        await window.rtdb.ref(`notes/${userId}`).remove();
        
        // Delete subjects
        await window.rtdb.ref(`subjects/${userId}`).remove();
        
        // Delete marks
        await window.rtdb.ref(`marks/${userId}`).remove();
        
        // Delete chat responses
        await window.rtdb.ref(`users/${userId}/savedResponses`).remove();
        
        // Delete any other data as needed
        
        console.log('All user data deleted successfully');
    } catch (error) {
        console.error('Error deleting user data:', error);
        throw error; // Re-throw to handle in the calling function
    }
}

// Initialize profile if on main app page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the main app page
    if (!window.location.pathname.includes('login.html')) {
        // Listen for auth state changes
        auth.onAuthStateChanged(user => {
            if (user) {
                // We'll initialize the module when the profile tab is clicked
                console.log('User authenticated, profile module ready to initialize');
            }
        });
    }
});
