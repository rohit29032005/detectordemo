// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

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


// Save user data to Firestore
async function saveUserToFirestore(user, phone = "") {
  const userRef = doc(db, "VITstudents", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "Anonymous",
      email: user.email,
      phone: phone,
    });
  }
}

// Email/Password Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      showPopup('Please verify your email to access your account.');
      await sendEmailVerification(user);
      alert('Verification email sent! Please check your email.');
      auth.signOut();
    } else {
      showPopup('Login successful!');
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000); // Redirect to index.html after 1 second
    }
  } catch (error) {
    console.error("Error signing in:", error.message);
    alert('Error: ' + error.message);
  }
});

// Google Sign-In
window.googleSignIn = async function googleSignIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Save user data to Firestore if new
    await saveUserToFirestore(user);

    if (!user.emailVerified) {
      showPopup('Please verify your email to access your account.');
      await sendEmailVerification(user);
      alert('Verification email sent! Please check your email.');
      auth.signOut();
    } else {
      showPopup('Signed in with Google successfully!');
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000); // Redirect to index.html after 1 second
    }
  } catch (error) {
    console.error("Error with Google sign-in:", error.message);
    alert('Error: ' + error.message);
  }
};
