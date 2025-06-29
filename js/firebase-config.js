// Firebase configuration
// Replace with your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyA7zZF3AZQKyZAfNL9G8pPB9ELBJ2iQEmc",
    authDomain: "students-app-97a47.firebaseapp.com",
    projectId: "students-app-97a47",
    storageBucket: "students-app-97a47.firebasestorage.app",
    messagingSenderId: "1014053333478",
    appId: "1:1014053333478:web:a0329cc3d07f1c73ac0e27"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database(); // Initialize Realtime Database

// Enable Firestore offline persistence if needed
// db.enablePersistence()
//   .catch((err) => {
//     console.error('Firestore persistence error:', err.code);
//   });

// Export Firebase services for use in other scripts
window.auth = auth;
window.db = db;
window.rtdb = rtdb;

console.log('Firebase initialized successfully');