// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC0UAvyj2f6oX0Bi6t52pi-5EBERI7oFDU",
  authDomain: "earthlanding-21773.firebaseapp.com",
  projectId: "earthlanding-21773",
  storageBucket: "earthlanding-21773.firebasestorage.app",
  messagingSenderId: "591653055766",
  appId: "1:591653055766:web:b9e55cdaf6c2a9ae407437"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Show pop-up animation
function showPopup(message) {
  const popup = document.createElement('div');
  popup.classList.add('popup');
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

// Signup Form Submission
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const phone = document.getElementById('phone').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send verification email
    await sendEmailVerification(user);

    // Save user data to Firestore with uid as document ID
    await setDoc(doc(db, "VITstudents", user.uid), {
      name: name,
      email: email,
      phone: phone,
      password: password // Storing password in plain text is not secure
    });

    showPopup('Account created successfully! Verification email sent.');
  } catch (error) {
    console.error("Error signing up:", error.message);
    alert('Error: ' + error.message);
  }
});

// Google Sign-In
window.googleSignIn = async function googleSignIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Save user data to Firestore with uid as document ID if new
    await setDoc(doc(db, "VITstudents", user.uid), {
      name: user.displayName,
      email: user.email,
      phone: user.phoneNumber || '',
      password: 'Google Sign-In' // Placeholder text as password is handled by Google
    });

    showPopup('Signed in with Google successfully!');
  } catch (error) {
    console.error("Error with Google sign-in:", error.message);
    alert('Error: ' + error.message);
  }
};



