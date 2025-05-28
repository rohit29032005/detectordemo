// Enhanced ShakeAlert - FIXED LOCATION VERSION
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// YOUR ACTUAL Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwVMxhmCbm-jo6ExYj2m9hXLhexuDKk0U",
  authDomain: "shakealert-908d0.firebaseapp.com",
  databaseURL:
    "https://shakealert-908d0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shakealert-908d0",
  storageBucket: "shakealert-908d0.firebasestorage.app",
  messagingSenderId: "202678351500",
  appId: "1:202678351500:web:f442a6f1354dba4b746da9",
  measurementId: "G-L3M6X4QG2E",
};

// Global Variables
let map = null;
let database = null;
let activeSimulations = [];
let systemStatus = {
  mapLoaded: false,
  firebaseConnected: false,
  locationEnabled: false,
  notificationsEnabled: false,
  deviceMotionEnabled: false,
};
let lastShake = 0;

// Constants
const P_WAVE_SPEED = 6.0;
const S_WAVE_SPEED = 3.5;
const SHAKE_THRESHOLD = 15;
const UPDATE_INTERVAL = 5000;
const FALLBACK_COORDS = { lat: 12.9716, lng: 79.1588 };

// Status elements
const statusText = document.getElementById("status");

// Global error handler
window.addEventListener("error", function (e) {
  console.error("Global error:", e.error);
  updateStatus(
    "⚠️ Minor error occurred, system recovering...",
    "status-warning"
  );
});

// Initialize Firebase
async function initializeFirebaseApp() {
  try {
    const app = initializeApp(firebaseConfig);
    database = getDatabase(app);

    const testRef = ref(database, "system/heartbeat");
    await set(testRef, {
      timestamp: Date.now(),
      status: "connected",
      version: "3.0",
    });

    systemStatus.firebaseConnected = true;
    console.log("✅ Firebase connected successfully");
    updateStatus("✅ Firebase connected!", "status-success");
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    systemStatus.firebaseConnected = false;
    updateStatus(
      "⚠️ Firebase connection failed, using offline mode",
      "status-warning"
    );
  }
}

// Initialize map
function initializeMap() {
  try {
    if (typeof L === "undefined") {
      console.error("Leaflet library not loaded");
      showMapFallback();
      return;
    }

    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.error("Map container not found");
      showMapFallback();
      return;
    }

    // Initialize map
    map = L.map("map").setView([20, 77], 4);

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    // Add default markers
    L.marker([28.6139, 77.209]).addTo(map).bindPopup("📍 Delhi, India");

    L.marker([12.9716, 79.1588]).addTo(map).bindPopup("🏫 VIT Vellore");

    systemStatus.mapLoaded = true;
    console.log("✅ Map initialized successfully");
  } catch (error) {
    console.error("Map initialization error:", error);
    showMapFallback();
  }
}

// Show map fallback
function showMapFallback() {
  const mapContainer = document.getElementById("map");
  if (mapContainer) {
    mapContainer.innerHTML = `
            <div style="
                height: 500px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
                flex-direction: column;
                text-align: center;
                padding: 50px;
                border: 2px dashed rgba(255, 255, 255, 0.3);
            ">
                <h3 style="color: #4ecdc4; margin-bottom: 15px;">🗺️ Map Temporarily Unavailable</h3>
                <p>Earthquake alerts and simulations are still fully functional!</p>
                <button onclick="retryMapLoad()" style="
                    background: #4ecdc4;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 15px;
                    font-weight: bold;
                ">🔄 Retry Map Loading</button>
            </div>
        `;
  }
}

// Update status function
function updateStatus(message, className = "") {
  if (statusText) {
    statusText.innerHTML = message;
    statusText.className = `status ${className}`;
  }
}

// ENHANCED LOCATION DETECTION - REAL GPS
async function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.log("❌ Geolocation not supported, using fallback");
      updateStatus(
        "⚠️ GPS not supported, using VIT fallback",
        "status-warning"
      );
      resolve(FALLBACK_COORDS);
      return;
    }

    // High accuracy GPS options
    const options = {
      enableHighAccuracy: true, // Use GPS instead of network
      timeout: 15000, // Wait up to 15 seconds
      maximumAge: 0, // Don't use cached location
    };

    console.log("📡 Requesting high-accuracy GPS location...");
    updateStatus("📡 Getting your real GPS location...", "status-warning");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log("✅ Real GPS location obtained:");
        console.log(`📍 Lat: ${lat}, Lng: ${lng}`);
        console.log(`🎯 Accuracy: ${accuracy} meters`);

        systemStatus.locationEnabled = true;
        updateStatus(
          `✅ Real GPS location found! Accuracy: ${accuracy.toFixed(0)}m`,
          "status-success"
        );

        resolve({
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
        });
      },
      (error) => {
        let errorMsg = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = "Location unavailable";
            break;
          case error.TIMEOUT:
            errorMsg = "Location request timeout";
            break;
          default:
            errorMsg = "Unknown location error";
        }

        console.error("❌ GPS error:", errorMsg);
        updateStatus(
          `⚠️ GPS failed: ${errorMsg}. Using VIT fallback.`,
          "status-warning"
        );

        systemStatus.locationEnabled = false;
        resolve(FALLBACK_COORDS);
      },
      options
    );
  });
}

// Enhanced location name resolution
async function getReadableLocation(lat, lng) {
  try {
    // Check if it's near VIT (within 1km)
    const vitDistance = calculateDistance(lat, lng, 12.9716, 79.1588);
    if (vitDistance < 1) {
      return "VIT Vellore Campus, Tamil Nadu";
    }

    // Check for major Indian cities
    const cities = [
      { name: "Delhi", lat: 28.6139, lng: 77.209, radius: 50 },
      { name: "Mumbai", lat: 19.076, lng: 72.8777, radius: 50 },
      { name: "Bangalore", lat: 12.9716, lng: 77.5946, radius: 50 },
      { name: "Chennai", lat: 13.0827, lng: 80.2707, radius: 50 },
      { name: "Kolkata", lat: 22.5726, lng: 88.3639, radius: 50 },
      { name: "Hyderabad", lat: 17.385, lng: 78.4867, radius: 50 },
      { name: "Pune", lat: 18.5204, lng: 73.8567, radius: 50 },
      { name: "Jaipur", lat: 26.9124, lng: 75.7873, radius: 50 },
    ];

    for (const city of cities) {
      const distance = calculateDistance(lat, lng, city.lat, city.lng);
      if (distance < city.radius) {
        return `${city.name} Region, India (${lat.toFixed(4)}, ${lng.toFixed(
          4
        )})`;
      }
    }
 // Otherwise, use Geoapify for reverse geocoding
        const apiKey = "1281b2996fe241ac81cf13cd934f700a";
        const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Geoapify API error');
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            const props = data.features[0].properties;
            const place = props.city || props.town || props.village || props.suburb || props.formatted;
            const state = props.state || '';
            const country = props.country || '';
            return `${place ? place + ', ' : ''}${state ? state + ', ' : ''}${country}`;
        }
        // Fallback if Geoapify doesn't return a result
        return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
        console.error("Geoapify reverse geocoding error:", error);
        return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
}

// Calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Test Location Function - ENHANCED
window.testLocation = async function () {
  try {
    updateStatus("📡 Testing real GPS location detection...", "status-warning");

    const coords = await getCurrentPosition();
    const location = await getReadableLocation(
      coords.latitude,
      coords.longitude
    );

    updateStatus(
      `✅ Your Real Location:<br>📍 ${location}<br>🎯 Accuracy: ${
        coords.accuracy ? coords.accuracy.toFixed(0) + "m" : "Unknown"
      }`,
      "status-success"
    );

    if (map) {
      map.setView([coords.latitude, coords.longitude], 15);
      L.marker([coords.latitude, coords.longitude])
        .addTo(map)
        .bindPopup(`📍 Your Real Location<br>${location}`)
        .openPopup();
    }

    console.log("📍 Final location data:", {
      coordinates: coords,
      readableLocation: location,
    });
  } catch (error) {
    updateStatus(`❌ Location test failed: ${error.message}`, "status-error");
  }
};

// Detailed GPS Test Function
window.testLocationDetailed = async function () {
  updateStatus("🔍 Running detailed GPS test...", "status-warning");

  if (!navigator.geolocation) {
    updateStatus("❌ Geolocation not supported on this device", "status-error");
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 20000, // Extended timeout
    maximumAge: 0,
  };

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      const timestamp = new Date(position.timestamp);

      const location = await getReadableLocation(lat, lng);

      updateStatus(
        `✅ Detailed GPS Results:<br>
                📍 Location: ${location}<br>
                🎯 Accuracy: ${accuracy.toFixed(1)}m<br>
                📊 Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
                ⏰ Time: ${timestamp.toLocaleTimeString()}`,
        "status-success"
      );

      // Update map with high zoom
      if (map) {
        map.setView([lat, lng], 18);
        L.marker([lat, lng])
          .addTo(map)
          .bindPopup(
            `
                        📍 Your Precise Location<br>
                        ${location}<br>
                        Accuracy: ${accuracy.toFixed(1)}m
                    `
          )
          .openPopup();

        // Add accuracy circle
        L.circle([lat, lng], {
          radius: accuracy,
          color: "#0066ff",
          fillColor: "#0066ff",
          fillOpacity: 0.1,
        }).addTo(map);
      }

      console.log("🔍 Detailed GPS data:", {
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
        timestamp: timestamp,
        readableLocation: location,
      });
    },
    (error) => {
      let errorMsg = "";
      let solution = "";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = "Location permission denied";
          solution = "Click the 🔒 lock icon in address bar and allow location";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = "Location unavailable";
          solution = "Check GPS settings and try outdoors";
          break;
        case error.TIMEOUT:
          errorMsg = "Location request timeout";
          solution = "Try again or move to better GPS signal area";
          break;
        default:
          errorMsg = "Unknown location error";
          solution = "Check browser permissions and GPS settings";
      }

      updateStatus(
        `❌ GPS Error: ${errorMsg}<br>💡 Solution: ${solution}`,
        "status-error"
      );
    },
    options
  );
};

// Simulate Shake Function - USES REAL LOCATION
window.simulateShake = async function () {
  try {
    updateStatus(
      "🚨 Simulating earthquake with real location...",
      "status-warning"
    );

    // Get real GPS coordinates
    const coords = await getCurrentPosition();
    const location = await getReadableLocation(
      coords.latitude,
      coords.longitude
    );
    const testIntensity = 18;

    const testData = {
      timestamp: Date.now(),
      intensity: testIntensity,
      x: 1.5,
      y: 2.0,
      z: 9.8,
      location: location,
      coordinates: {
        lat: coords.latitude,
        lng: coords.longitude,
      },
      accuracy: coords.accuracy || 0,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
    };

    console.log("🚨 Earthquake simulation data:", testData);

    if (database) {
      const shakeRef = ref(database, "shakes/");
      const newShakeRef = push(shakeRef);
      await set(newShakeRef, testData);
      updateStatus(
        `✅ Earthquake logged at your real location: ${location}`,
        "status-success"
      );
    } else {
      // Local simulation
      startWaveSimulation(testData);
      updateStatus(
        `✅ Earthquake simulation (offline): ${location}`,
        "status-success"
      );
    }
  } catch (error) {
    updateStatus(`❌ Simulation failed: ${error.message}`, "status-error");
  }
};

// Device motion handling - USES REAL LOCATION
function initializeDeviceMotion() {
  try {
    if (!("DeviceOrientationEvent" in window)) {
      console.log("⚠️ Device motion not supported");
      return;
    }

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      DeviceOrientationEvent.requestPermission().then((permission) => {
        if (permission === "granted") {
          window.addEventListener("devicemotion", handleDeviceMotion);
          systemStatus.deviceMotionEnabled = true;
          console.log("✅ Device motion initialized with permission");
        }
      });
    } else {
      window.addEventListener("devicemotion", handleDeviceMotion);
      systemStatus.deviceMotionEnabled = true;
      console.log("✅ Device motion initialized");
    }
  } catch (error) {
    console.error("❌ Device motion initialization error:", error);
  }
}

// Handle device motion - REAL LOCATION LOGGING
async function handleDeviceMotion(event) {
  try {
    const now = Date.now();
    if (now - lastShake < UPDATE_INTERVAL) return;

    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const { x, y, z } = acc;
    const total = Math.sqrt(x * x + y * y + z * z);

    if (total > SHAKE_THRESHOLD) {
      lastShake = now;
      console.log(`🚨 Real shake detected! Intensity: ${total.toFixed(2)}`);

      // Log shake with REAL location
      await logShakeWithRealLocation(total, x, y, z);
    }
  } catch (error) {
    console.error("❌ Motion handling error:", error);
  }
}

// Log shake with real location
async function logShakeWithRealLocation(intensity, x, y, z) {
  try {
    updateStatus("📡 Logging real earthquake data...", "status-warning");

    // Get real GPS coordinates
    const coords = await getCurrentPosition();
    const location = await getReadableLocation(
      coords.latitude,
      coords.longitude
    );

    const shakeData = {
      timestamp: Date.now(),
      intensity: intensity,
      x: x,
      y: y,
      z: z,
      location: location,
      coordinates: {
        lat: coords.latitude,
        lng: coords.longitude,
      },
      accuracy: coords.accuracy || 0,
      deviceInfo: {
        userAgent: navigator.userAgent.substring(0, 100), // Limit length
        platform: navigator.platform,
      },
    };

    console.log("📊 Real shake data:", shakeData);

    if (database) {
      const shakeRef = ref(database, "shakes/");
      const newShakeRef = push(shakeRef);
      await set(newShakeRef, shakeData);
      updateStatus(`✅ Real earthquake logged: ${location}`, "status-success");
    } else {
      // Store locally if Firebase unavailable
      localStorage.setItem(`shake_${Date.now()}`, JSON.stringify(shakeData));
      updateStatus(
        `✅ Earthquake logged locally: ${location}`,
        "status-warning"
      );
    }

    // Start wave simulation
    startWaveSimulation(shakeData);
  } catch (error) {
    console.error("❌ Shake logging error:", error);
    updateStatus(
      `❌ Failed to log earthquake: ${error.message}`,
      "status-error"
    );
  }
}

// Start wave simulation
function startWaveSimulation(shake) {
  try {
    // Generate alerts
    generatePWaveAlert(shake);

    // Visual simulation if map available
    if (map && shake.coordinates) {
      plotShakeOnMap(shake);
      animateWaves(shake);
    } else {
      // Text-based simulation
      simulateWavesTextMode(shake);
    }

    console.log("🌊 Wave simulation started for:", shake.location);
  } catch (error) {
    console.error("❌ Wave simulation error:", error);
  }
}

// Plot shake on map
function plotShakeOnMap(shake) {
  if (!map || !shake.coordinates) return;

  try {
    const { lat, lng } = shake.coordinates;
    const intensity = shake.intensity || 10;

    const markerSize = Math.max(10, intensity * 2);
    const color = intensity > 15 ? "#ff0000" : "#ff8800";

    const shakeMarker = L.circleMarker([lat, lng], {
      radius: markerSize,
      fillColor: color,
      color: "#000",
      weight: 2,
      fillOpacity: 0.7,
    }).addTo(map);

    shakeMarker
      .bindPopup(
        `
            <div style="text-align: center; color: #333;">
                <h4>🚨 Earthquake Detected!</h4>
                <p><strong>Intensity:</strong> ${intensity.toFixed(1)}</p>
                <p><strong>Location:</strong> ${shake.location}</p>
                <p><strong>Time:</strong> ${new Date(
                  shake.timestamp
                ).toLocaleTimeString()}</p>
                ${
                  shake.accuracy
                    ? `<p><strong>GPS Accuracy:</strong> ${shake.accuracy.toFixed(
                        0
                      )}m</p>`
                    : ""
                }
            </div>
        `
      )
      .openPopup();

    map.setView([lat, lng], 12);
  } catch (error) {
    console.error("Error plotting shake:", error);
  }
}

function listenForNearbyAlerts(userLat, userLng) {
  const alertsRef = ref(database, "alerts/");
  onValue(alertsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    Object.values(data).forEach((alert) => {
      if (alert.coordinates) {
        const dist = calculateDistance(
          userLat,
          userLng,
          alert.coordinates.lat,
          alert.coordinates.lng
        );
        if (dist <= 5) {
          showAlertMessage(alert); // Show alert message to user
        }
      }
    });
  });
}


function showAlertMessage(alert) {
    let isOwnShake = false;
    // Check if lastShakeEvent is close in time and space to this alert
    if (lastShakeEvent) {
        const timeDiff = Math.abs(alert.timestamp - lastShakeEvent.timestamp);
        const dist = calculateDistance(
            alert.coordinates.lat,
            alert.coordinates.lng,
            lastShakeEvent.lat,
            lastShakeEvent.lng
        );
        if (timeDiff < 15000 && dist < 0.2) { // 15 seconds, 200 meters
            isOwnShake = true;
        }
    }

    let alertPanel = document.getElementById("alert-panel");
    if (!alertPanel) {
        alertPanel = document.createElement("div");
        alertPanel.id = "alert-panel";
        alertPanel.className = "alert-panel";
        document.body.appendChild(alertPanel);
    }

    if (isOwnShake) {
        alertPanel.innerHTML = `
            <h3>🚨 Earthquake Alert! (Your Device Detected Shaking)</h3>
            <p><strong>Intensity:</strong> ${alert.intensity ? alert.intensity.toFixed(1) : 'N/A'}</p>
            <p><strong>Location:</strong> ${alert.location}</p>
            <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleTimeString()}</p>
            <p style="color: #ff4444; font-weight: bold;">⚠️ Take cover now! Your phone detected shaking.</p>
        `;
    } else {
        alertPanel.innerHTML = `
            <h3>🚨 Earthquake Alert Nearby</h3>
            <p><strong>Intensity:</strong> ${alert.intensity ? alert.intensity.toFixed(1) : 'N/A'}</p>
            <p><strong>Location:</strong> ${alert.location}</p>
            <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleTimeString()}</p>
            <p style="color: #ffff00; font-weight: bold;">⚠️ Take cover! Others nearby detected shaking.</p>
        `;
    }
    alertPanel.style.display = "block";
    setTimeout(() => {
        alertPanel.style.display = "none";
    }, 10000);
}

// Animate waves
function animateWaves(shake) {
  if (!map || !shake.coordinates) return;

  let elapsedTime = 0;
  const epicenter = [shake.coordinates.lat, shake.coordinates.lng];
  let pWaveCircle = null;
  let sWaveCircle = null;

  const animation = setInterval(() => {
    elapsedTime += 1;
    const pWaveRadius = elapsedTime * P_WAVE_SPEED * 1000; // Convert to meters
    const sWaveRadius = Math.max(0, (elapsedTime - 1) * S_WAVE_SPEED * 1000);

    // Remove old circles
    if (pWaveCircle) map.removeLayer(pWaveCircle);
    if (sWaveCircle) map.removeLayer(sWaveCircle);

    // Add new circles
    if (pWaveRadius > 0) {
      pWaveCircle = L.circle(epicenter, {
        radius: pWaveRadius,
        color: "#0066ff",
        weight: 2,
        fillOpacity: 0.1,
      }).addTo(map);
    }

    if (sWaveRadius > 0) {
      sWaveCircle = L.circle(epicenter, {
        radius: sWaveRadius,
        color: "#ff0000",
        weight: 3,
        fillOpacity: 0.2,
      }).addTo(map);
    }

    // Stop after 60 seconds
    if (elapsedTime > 60) {
      clearInterval(animation);
      if (pWaveCircle) map.removeLayer(pWaveCircle);
      if (sWaveCircle) map.removeLayer(sWaveCircle);
    }
  }, 1000);
}

// Text mode simulation
function simulateWavesTextMode(shake) {
  let elapsedTime = 0;

  const textSimulation = setInterval(() => {
    elapsedTime += 1;
    const pWaveRadius = elapsedTime * P_WAVE_SPEED;
    const sWaveRadius = Math.max(0, (elapsedTime - 1) * S_WAVE_SPEED);

    if (elapsedTime % 5 === 0) {
      updateStatus(
        `🌊 Wave Simulation: P-wave ${pWaveRadius.toFixed(
          0
        )}km, S-wave ${sWaveRadius.toFixed(0)}km from ${shake.location}`,
        "status-warning"
      );
    }

    if (elapsedTime > 30) {
      clearInterval(textSimulation);
      updateStatus("✅ Wave simulation completed", "status-success");
    }
  }, 1000);
}

// Generate P-wave alert
function generatePWaveAlert(shake) {
  try {
    // Create alert panel
    let alertPanel = document.getElementById("alert-panel");
    if (!alertPanel) {
      alertPanel = document.createElement("div");
      alertPanel.id = "alert-panel";
      alertPanel.className = "alert-panel";
      document.body.appendChild(alertPanel);
    }

    alertPanel.innerHTML = `
            <h3>🚨 P-WAVE DETECTED!</h3>
            <p><strong>Magnitude:</strong> ${(shake.intensity / 3).toFixed(
              1
            )}</p>
            <p><strong>Location:</strong> ${shake.location}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <p style="color: #ffff00; font-weight: bold;">⚠️ S-wave incoming! Take cover!</p>
        `;
    alertPanel.style.display = "block";

    setTimeout(() => {
      alertPanel.style.display = "none";
    }, 8000);

    // Browser notification
    if (Notification.permission === "granted") {
      new Notification("🚨 P-Wave Detected!", {
        body: `Earthquake at ${shake.location}. S-wave incoming!`,
      });
    }
  } catch (error) {
    console.error("P-wave alert error:", error);
  }
}

// Wave propagation function
window.simulateWavePropagation = function (lat, lng, intensity) {
  try {
    const simulatedShake = {
      coordinates: { lat, lng },
      intensity,
      location: `Simulated Event (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
      timestamp: Date.now(),
    };

    startWaveSimulation(simulatedShake);
    updateStatus(
      `🌊 Wave simulation started at ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      "status-success"
    );
  } catch (error) {
    console.error("Manual simulation error:", error);
  }
};

// Check system status
window.checkSystemStatus = function () {
  const statusGrid = document.getElementById("statusGrid");
  if (statusGrid) {
    statusGrid.innerHTML = `
            <div class="status-card ${
              systemStatus.mapLoaded ? "online" : "offline"
            }">
                <h4>🗺️ Interactive Map</h4>
                <p>${systemStatus.mapLoaded ? "Online" : "Offline"}</p>
            </div>
            <div class="status-card ${
              systemStatus.firebaseConnected ? "online" : "offline"
            }">
                <h4>🔥 Firebase Database</h4>
                <p>${
                  systemStatus.firebaseConnected ? "Connected" : "Disconnected"
                }</p>
            </div>
            <div class="status-card ${
              systemStatus.locationEnabled ? "online" : "offline"
            }">
                <h4>📍 Location Services</h4>
                <p>${
                  systemStatus.locationEnabled
                    ? "Real GPS Active"
                    : "Fallback Mode"
                }</p>
            </div>
            <div class="status-card ${
              systemStatus.deviceMotionEnabled ? "online" : "offline"
            }">
                <h4>📱 Motion Detection</h4>
                <p>${
                  systemStatus.deviceMotionEnabled ? "Active" : "Unavailable"
                }</p>
            </div>
        `;
  }
  updateStatus("🔍 System status updated", "status-success");
};

// Emergency mode
window.emergencyMode = function () {
  updateStatus("🆘 Emergency mode activated", "status-warning");

  const emergencyDiv = document.createElement("div");
  emergencyDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 152, 0, 0.95);
        color: white;
        padding: 30px;
        border-radius: 15px;
        z-index: 2000;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        max-width: 500px;
    `;

  emergencyDiv.innerHTML = `
        <h2>🆘 Emergency Mode Active</h2>
        <p>Core earthquake detection with real GPS is working!</p>
        <div style="margin: 20px 0;">
            <button onclick="simulateShake(); this.parentElement.parentElement.remove();" style="
                background: #ff6b6b; color: white; border: none; padding: 12px 20px; 
                border-radius: 5px; cursor: pointer; margin: 5px; font-weight: bold;
            ">🚨 Test Real Location Earthquake</button>
            <button onclick="testLocationDetailed(); this.parentElement.parentElement.remove();" style="
                background: #4ecdc4; color: white; border: none; padding: 12px 20px; 
                border-radius: 5px; cursor: pointer; margin: 5px; font-weight: bold;
            ">📍 Test Detailed GPS</button>
        </div>
        <button onclick="this.parentElement.remove()" style="
            background: white; color: #333; border: none; padding: 10px 20px; 
            border-radius: 5px; cursor: pointer; font-weight: bold;
        ">Close</button>
    `;

  document.body.appendChild(emergencyDiv);
};

// Retry map loading
window.retryMapLoad = function () {
  updateStatus("🔄 Retrying map initialization...", "status-warning");
  initializeMap();
};

// Request notification permission
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      systemStatus.notificationsEnabled = permission === "granted";
      console.log(`Notification permission: ${permission}`);
    });
  }
}

// Main initialization
async function initializeSystem() {
  try {
    updateStatus(
      "🔄 Initializing ShakeAlert with Real GPS...",
      "status-warning"
    );

    // Initialize components
    await initializeFirebaseApp();
    initializeMap();
    initializeDeviceMotion();
    requestNotificationPermission();

    updateStatus(
      "✅ ShakeAlert System Ready with Real Location Detection!",
      "status-success"
    );
  } catch (error) {
    console.error("System initialization error:", error);
    updateStatus("⚠️ System partially loaded", "status-warning");
  }
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSystem);
} else {
  initializeSystem();
}

console.log("🚨 ShakeAlert system loaded with real GPS detection");
