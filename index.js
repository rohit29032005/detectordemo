// index.js (Firebase + Shake Detection + OpenCage + Enhanced Debugging)
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
    // STEP 1: Check if geolocation is supported
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by this browser");
    }

    // STEP 2: Check current permission status
    let permissionStatus;
    try {
      permissionStatus = await navigator.permissions.query({name: 'geolocation'});
      console.log("Permission status:", permissionStatus.state);
    } catch (permErr) {
      console.log("Permission API not supported, continuing with geolocation attempt");
    }
    
    if (permissionStatus && permissionStatus.state === 'denied') {
      throw new Error("Geolocation permission is denied. Please enable it in browser settings.");
    }

    // STEP 3: Get location with proper options
    const coords = await new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,        // 10 seconds timeout
        maximumAge: 60000      // Accept cached position up to 1 minute old
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Geolocation success:", position);
          resolve(position.coords);
        },
        (error) => {
          console.error("Geolocation error details:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          
          // Provide specific error messages based on error code
          let errorMsg = "";
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = "User denied the request for Geolocation";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "Location information is unavailable";
              break;
            case error.TIMEOUT:
              errorMsg = "The request to get user location timed out";
              break;
            default:
              errorMsg = "An unknown error occurred";
              break;
          }
          reject(new Error(errorMsg));
        },
        options
      );
    });

    // STEP 4: If we reach here, location was successful
    console.log("Got coordinates:", coords);
    
    const location = await getReadableLocation(coords.latitude, coords.longitude);
    const timestamp = Date.now();

    const shakeRef = ref(database, 'shakes/');
    const newShakeRef = push(shakeRef);
    
    const dataToSet = {
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
    };

    console.log("Sending data to Firebase:", dataToSet);
    
    await set(newShakeRef, dataToSet);
    console.log("Successfully sent to Firebase!");

    statusText.innerHTML = `✅ Shake logged at<br><small>${location}</small>`;
    
  } catch (error) {
    console.error("Error in logShake:", error);
    statusText.textContent = `❌ Error: ${error.message}`;
  }
}

// Global function for test button
window.testLocation = async function() {
  try {
    console.log("Testing location...");
    statusText.textContent = "🧪 Testing location...";
    
    // Check permission first
    let permission;
    try {
      permission = await navigator.permissions.query({name: 'geolocation'});
      console.log("Permission state:", permission.state);
    } catch (e) {
      console.log("Permission API not available");
    }
    
    if (permission && permission.state === 'denied') {
      statusText.textContent = "❌ Permission denied. Enable location in browser settings.";
      return;
    }
    
    // Try to get location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("SUCCESS:", position);
        statusText.innerHTML = `✅ Success!<br><small>Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}</small>`;
      },
      (error) => {
        console.error("FAILED:", error);
        statusText.textContent = `❌ Failed: ${error.code} - ${error.message}`;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  } catch (err) {
    console.error("Test error:", err);
    statusText.textContent = "❌ Test failed: " + err.message;
  }
}

// Global function to simulate shake with mock data
window.simulateShake = function() {
  console.log("Simulating shake with mock data...");
  statusText.textContent = "🧪 Simulating shake...";
  
  // Use VIT Vellore coordinates
  const mockCoords = { latitude: 12.9716, longitude: 79.1588 };
  const mockIntensity = 18; // Above threshold
  
  // Temporarily override geolocation for this test
  const originalLogShake = logShake;
  
  // Create a modified version that uses mock coordinates
  const mockLogShake = async (intensity, x, y, z) => {
    try {
      const location = await getReadableLocation(mockCoords.latitude, mockCoords.longitude);
      const timestamp = Date.now();

      const shakeRef = ref(database, 'shakes/');
      const newShakeRef = push(shakeRef);
      
      const dataToSet = {
        timestamp: timestamp,
        intensity: intensity.toFixed(2),
        x: x.toFixed(2),
        y: y.toFixed(2),
        z: z.toFixed(2),
        location: location,
        coordinates: {
          lat: mockCoords.latitude,
          lng: mockCoords.longitude
        }
      };

      console.log("Sending MOCK data to Firebase:", dataToSet);
      
      await set(newShakeRef, dataToSet);
      console.log("Successfully sent MOCK data to Firebase!");

      statusText.innerHTML = `✅ Mock shake logged at<br><small>${location}</small>`;
      
    } catch (error) {
      console.error("Error in mock logShake:", error);
      statusText.textContent = `❌ Mock Error: ${error.message}`;
    }
  };
  
  // Call the mock version
  mockLogShake(mockIntensity, 1.5, 2.0, 9.8);
}

let lastShake = 0;
window.addEventListener("devicemotion", (event) => {
  const now = Date.now();
  if (now - lastShake < UPDATE_INTERVAL) return;

  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) {
    statusText.textContent = "❌ Sensor 'acc' not available.";
    return;
  }

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
  "❌ Geolocation not supported in this browser";
