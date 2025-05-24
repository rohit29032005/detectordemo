import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwVMxhmCbm-jo6ExYj2m9hXLhexuDKk0U",
  authDomain: "shakealert-908d0.firebaseapp.com",
  databaseURL: "https://shakealert-908d0-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "shakealert-908d0",
  storageBucket: "shakealert-908d0.appspot.com",
  messagingSenderId: "202678351500",
  appId: "1:202678351500:web:f442a6f1354dba4b746da9"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const statusText = document.getElementById("status");

// Configuration
const SHAKE_THRESHOLD = 15;
const UPDATE_INTERVAL = 5000; // 5 seconds cooldown
const OPEN_CAGE_KEY = "98207650af9a4fd4b6a253348cd79998";

async function getReadableLocation(lat, lng) {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPEN_CAGE_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.results[0]?.formatted || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

async function logShake(intensity, x, y, z) {
  try {
    const coords = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        err => {
          alert("📍 Geolocation Error: " + err.message);  // ⚠️ User-visible alert
          reject(err);
        }
      );
    });

    const location = await getReadableLocation(coords.latitude, coords.longitude);
    const timestamp = Date.now();

    const shakeRef = ref(database, 'shakes/');
    const newShakeRef = push(shakeRef);
    
    await set(newShakeRef, {
      timestamp: timestamp,
      intensity: intensity.toFixed(2),
      x: x.toFixed(2),
      y: y.toFixed(2),
      z: z.toFixed(2),
      location: location,
      coordinates: {
        lat: coords.latitude,
        lng: coords.longitude
      }
    });

    statusText.innerHTML = `✅ Shake logged at<br><small>${location}</small>`;
  } catch (error) {
    console.error("Error:", error);
    statusText.textContent = "⚠️ Enable location permissions!";
  }
}

let lastShake = 0;
window.addEventListener("devicemotion", (event) => {
  const now = Date.now();
  if (now - lastShake < UPDATE_INTERVAL) return;

  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) return;

  const { x, y, z } = acc;
  const total = Math.sqrt(x**2 + y**2 + z**2);
  
  if (total > SHAKE_THRESHOLD) {
    lastShake = now;
    logShake(total, x, y, z);
  }
});

// Initial setup
statusText.textContent = navigator.geolocation ?
  "Shake your device to begin detection" :
  "Geolocation not supported in this browser";
