// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBa93VJg0nCsbl-jciLGgL8TrKyBdc3S5c",
    authDomain: "intern1-ebc8e.firebaseapp.com",
    projectId: "intern1-ebc8e",
    storageBucket: "intern1-ebc8e.firebasestorage.app",
    messagingSenderId: "1018536934697",
    appId: "1:1018536934697:web:147ebe1c7d8d7113238b38"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// API Base URL - Update this to match your backend server
const API_BASE_URL = 'http://localhost:5000/api/auth'; // Change this to your actual backend URL

// Show pop-up animation
function showPopup(message, type = "info") {
  const popup = document.createElement('div');
  popup.classList.add('popup', type);
  popup.innerHTML = `
    <span class="popup-icon">🔔</span>
    <span>${message}</span>
  `;
  document.body.appendChild(popup);
  
  setTimeout(() => popup.classList.add('show'), 10);
  setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => popup.remove(), 300);
  }, 3000);
}

// Email/Password Login using API
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    // Call your backend API instead of Firebase directly
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Login successful
      showPopup('Login successful!');
      
      // Store user data in localStorage or sessionStorage if needed
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } else {
      // Handle error response
      showPopup(data.message || 'Login failed', 'error');
      alert('Error: ' + (data.message || 'Login failed'));
    }
  } catch (error) {
    console.error("Error signing in:", error);
    showPopup('Network error. Please try again.', 'error');
    alert('Error: Network error. Please try again.');
  }
});

// Google Sign-In using API
window.googleSignIn = async function googleSignIn() {
  try {
    // First, authenticate with Firebase to get the ID token
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Get the ID token
    const idToken = await user.getIdToken();
    
    // Call your backend API with the token
    const response = await fetch(`${API_BASE_URL}/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: idToken
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Login successful
      showPopup('Signed in with Google successfully!');
      
      // Store user data in localStorage if needed
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } else if (response.status === 404) {
      // User not found, try to sign up
      showPopup('Account not found. Creating new account...', 'info');
      await googleSignUp(idToken);
    } else {
      // Handle other errors
      showPopup(data.message || 'Google sign-in failed', 'error');
      alert('Error: ' + (data.message || 'Google sign-in failed'));
      // Sign out from Firebase if backend login failed
      await auth.signOut();
    }
  } catch (error) {
    console.error("Error with Google sign-in:", error);
    showPopup('Google sign-in failed', 'error');
    alert('Error: ' + error.message);
  }
};

// Google Sign-Up function (called when user doesn't exist)
async function googleSignUp(idToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/google-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: idToken
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Signup successful
      showPopup('Google account created successfully!');
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } else {
      showPopup(data.message || 'Google sign-up failed', 'error');
      alert('Error: ' + (data.message || 'Google sign-up failed'));
      // Sign out from Firebase if backend signup failed
      await auth.signOut();
    }
  } catch (error) {
    console.error("Error with Google sign-up:", error);
    showPopup('Google sign-up failed', 'error');
    alert('Error: ' + error.message);
    await auth.signOut();
  }
}

// Optional: Function to check if user is logged in
function checkAuthStatus() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Optional: Function to logout
function logout() {
  localStorage.removeItem('user');
  auth.signOut();
  window.location.href = "login.html"; // or wherever your login page is
}