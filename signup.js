// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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
const googleProvider = new GoogleAuthProvider();

// API Base URL - adjust this to your backend URL
const API_BASE_URL = 'https://detector-t406.onrender.com/api/auth'; // Change this to your actual backend URL

// Show popup notification
function showPopup(message, isError = false) {
  const popup = document.createElement('div');
  popup.classList.add('popup');
  if (isError) {
    popup.style.backgroundColor = '#ff4444';
  }
  popup.innerText = message;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.classList.add('show');
  }, 10);

  setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(popup);
    }, 300);
  }, 3000);
}

// Regular Email/Password Signup
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get form elements with error checking
  const nameElement = document.getElementById('name');
  const emailElement = document.getElementById('email');
  const passwordElement = document.getElementById('password');
  const phoneElement = document.getElementById('phone') || document.getElementById('phoneNumber');
  
  // Check if all required elements exist
  if (!nameElement || !emailElement || !passwordElement) {
    showPopup('Form elements not found. Please check your HTML.', true);
    return;
  }
  
  const name = nameElement.value;
  const email = emailElement.value;
  const password = passwordElement.value;
  const phoneNumber = phoneElement ? phoneElement.value : '';

  try {
    const requestBody = {
      name: name,
      email: email,
      password: password
    };

    // Only add phoneNumber if it has a value
    if (phoneNumber && phoneNumber.trim() !== '') {
      requestBody.phoneNumber = phoneNumber.trim();
    }

    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (response.ok) {
      showPopup('Account created successfully!');
      // Optionally redirect or clear form
      const form = document.getElementById('signup-form');
      if (form) form.reset();
    } else {
      showPopup(data.message || 'Signup failed', true);
    }
  } catch (error) {
    console.error('Signup error:', error);
    showPopup('Network error. Please try again.', true);
  }
});

// Google Sign-In for Signup
window.googleSignIn = async function googleSignIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Get the ID token
    const idToken = await user.getIdToken();

    // Send token to your backend
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
      showPopup('Google signup successful!');
      // Handle successful signup (redirect, store user data, etc.)
      console.log('User data:', data.user);
    } else {
      showPopup(data.message || 'Google signup failed', true);
    }
  } catch (error) {
    console.error("Error with Google sign-in:", error);
    showPopup('Google sign-in failed: ' + error.message, true);
  }
};