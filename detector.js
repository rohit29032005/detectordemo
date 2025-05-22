// 🔥 Firebase Imports (via CDN if not using bundler like Vite/React)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

// 🔧 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBwVMxhmCbm-jo6ExYj2m9hXLhexuDKk0U",
  authDomain: "shakealert-908d0.firebaseapp.com",
  projectId: "shakealert-908d0",
  storageBucket: "shakealert-908d0.firebasestorage.app",
  messagingSenderId: "202678351500",
  appId: "1:202678351500:web:f442a6f1354dba4b746da9",
  measurementId: "G-L3M6X4QG2E"
};

// 🔥 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// 🌍 DOM Element
const statusText = document.getElementById("status");

// 🚨 Shake Detection
window.addEventListener("devicemotion", async function(event) {
  const acc = event.acceleration;
  if (!acc) return;

  const total = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

  statusText.textContent = `Shake Level: ${total.toFixed(2)}`;

  if (total > 15) {
    statusText.textContent = "🚨 Earthquake-like Shake Detected!";

    try {
      await addDoc(collection(db, "alerts"), {
        timestamp: new Date(),
        intensity: total.toFixed(2)
      });
      console.log("✅ Shake data sent to Firebase");
    } catch (err) {
      console.error("❌ Firebase Error:", err);
    }
  }
});
