// index.js (Firebase + Shake Detection + OpenCage Reverse Geocoding)
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const statusText = document.getElementById("status");

// Shake detection parameters
const SHAKE_THRESHOLD = 15;
let lastUpdate = 0;
const UPDATE_INTERVAL = 500;

// Convert timestamp to readable format
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString(); // e.g., "5/22/2025, 10:15:30 PM"
}

// Get readable location from lat/lng using OpenCage API
async function getReadableLocation(lat, lng) {
  const apiKey = "98207650af9a4fd4b6a253348cd79998";
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const locationName = data.results[0]?.formatted || `Lat: ${lat}, Lng: ${lng}`;
    return locationName;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return `Lat: ${lat}, Lng: ${lng}`;
  }
}

// Send data to Firebase
function sendMotionData(intensity, x, y, z, location, timestamp) {
  const motionsRef = ref(database, "motions/");
  const newMotionRef = push(motionsRef);

  set(newMotionRef, {
    timestamp: timestamp,
    datetime: formatTimestamp(timestamp),
    intensity: intensity.toFixed(2),
    x: x.toFixed(2),
    y: y.toFixed(2),
    z: z.toFixed(2),
    location: location
  });
}

// Device motion event
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

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const location = await getReadableLocation(latitude, longitude);
      sendMotionData(total, x, y, z, location, now);
    });

    lastUpdate = now;
  }
});

// Initial message
statusText.textContent = navigator.userAgent.includes("Mobile")
  ? "Shake your device to test!"
  : "Use a mobile device for full functionality";
