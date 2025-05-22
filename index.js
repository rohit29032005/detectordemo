// index.js (Firebase Realtime Database + Shake Detection)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwVMxhmCbm-jo6ExYj2m9hXLhexuDKk0U",
  authDomain: "shakealert-908d0.firebaseapp.com",
  databaseURL: "https://shakealert-908d0-default-rtdb.firebaseio.com/",
  projectId: "shakealert-908d0",
  storageBucket: "shakealert-908d0.appspot.com",
  messagingSenderId: "202678351500",
  appId: "1:202678351500:web:f442a6f1354dba4b746da9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const statusText = document.getElementById("status");

// Shake detection parameters
const SHAKE_THRESHOLD = 15; // Adjust sensitivity (higher = needs stronger shake)
let lastUpdate = 0;
const UPDATE_INTERVAL = 500; // Milliseconds between checks

// Firebase data sender
function sendMotionData(total, x, y, z) {
  const motionsRef = ref(database, 'motions/');
  const newMotionRef = push(motionsRef);
  set(newMotionRef, {
    timestamp: Date.now(),
    intensity: total.toFixed(2),
    x: x.toFixed(2),
    y: y.toFixed(2),
    z: z.toFixed(2)
  });
}

// Shake detection logic
window.addEventListener("devicemotion", (event) => {
  const now = Date.now();
  if (now - lastUpdate < UPDATE_INTERVAL) return;

  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) {
    statusText.textContent = "⚠️ Motion sensor not available";
    return;
  }

  const { x, y, z } = acc;
  const total = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
  
  statusText.textContent = `Shake Level: ${total.toFixed(2)}`;
  
  if (total > SHAKE_THRESHOLD) {
    statusText.innerHTML = "🚨 Earthquake Detected!<br><small>Alert sent to server</small>";
    sendMotionData(total, x, y, z);
    lastUpdate = now;
  }
});

// Initial state check
statusText.textContent = navigator.userAgent.includes("Mobile") 
  ? "Shake your device to test!" 
  : "Use a mobile device for full functionality";
