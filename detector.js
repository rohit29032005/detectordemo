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
    databaseURL: "https://shakealert-908d0-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "shakealert-908d0",
    storageBucket: "shakealert-908d0.appspot.com",
    messagingSenderId: "202678351500",
    appId: "1:202678351500:web:f442a6f1354dba4b746da9",
    measurementId: "G-L3M6X4QG2E"
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
    deviceMotionEnabled: false
};
let lastShake = 0;
let lastShakeEvent = null;

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
    updateStatus("⚠️ Minor error occurred, system recovering...", "status-warning");
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
            version: "3.0"
        });
        systemStatus.firebaseConnected = true;
        console.log("✅ Firebase connected successfully");
        updateStatus("✅ Firebase connected!", "status-success");
    } catch (error) {
        console.error("❌ Firebase initialization failed:", error);
        systemStatus.firebaseConnected = false;
        updateStatus("⚠️ Firebase connection failed, using offline mode", "status-warning");
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
        map = L.map("map").setView([20, 77], 4);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap"
        }).addTo(map);
        L.marker([28.6139, 77.2090]).addTo(map).bindPopup("📍 Delhi, India");
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
            <div style="height:500px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); border-radius: 15px; flex-direction: column; text-align: center; padding: 50px; border: 2px dashed rgba(255, 255, 255, 0.3);">
                <h3 style="color: #4ecdc4; margin-bottom: 15px;">🗺️ Map Temporarily Unavailable</h3>
                <p>Earthquake alerts and simulations are still fully functional!</p>
                <button onclick="retryMapLoad()" style="background: #4ecdc4; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-top: 15px; font-weight: bold;">🔄 Retry Map Loading</button>
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
            updateStatus("⚠️ GPS not supported, using VIT fallback", "status-warning");
            resolve(FALLBACK_COORDS);
            return;
        }
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
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
                updateStatus(`✅ Real GPS location found! Accuracy: ${accuracy.toFixed(0)}m`, "status-success");
                resolve({
                    latitude: lat,
                    longitude: lng,
                    accuracy: accuracy
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
                updateStatus(`⚠️ GPS failed: ${errorMsg}. Using VIT fallback.`, "status-warning");
                systemStatus.locationEnabled = false;
                resolve(FALLBACK_COORDS);
            },
            options
        );
    });
}

// Enhanced location name resolution using Geoapify
async function getReadableLocation(lat, lng) {
    try {
        const vitDistance = calculateDistance(lat, lng, 12.9716, 79.1588);
        if (vitDistance < 1) {
            return "VIT Vellore Campus, Tamil Nadu";
        }
        const cities = [
            { name: "Delhi", lat: 28.6139, lng: 77.2090, radius: 50 },
            { name: "Mumbai", lat: 19.0760, lng: 72.8777, radius: 50 },
            { name: "Bangalore", lat: 12.9716, lng: 77.5946, radius: 50 },
            { name: "Chennai", lat: 13.0827, lng: 80.2707, radius: 50 },
            { name: "Kolkata", lat: 22.5726, lng: 88.3639, radius: 50 },
            { name: "Hyderabad", lat: 17.3850, lng: 78.4867, radius: 50 },
            { name: "Pune", lat: 18.5204, lng: 73.8567, radius: 50 },
            { name: "Jaipur", lat: 26.9124, lng: 75.7873, radius: 50 }
        ];
        for (const city of cities) {
            const distance = calculateDistance(lat, lng, city.lat, city.lng);
            if (distance < city.radius) {
                return `${city.name} Region, India (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            }
        }
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
        return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
        console.error("Geoapify reverse geocoding error:", error);
        return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
}

// Calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Test Location Function - ENHANCED
window.testLocation = async function() {
    try {
        updateStatus("📡 Testing real GPS location detection...", "status-warning");
        const coords = await getCurrentPosition();
        const location = await getReadableLocation(coords.latitude, coords.longitude);
        updateStatus(
            `✅ Your Real Location:<br>📍 ${location}<br>🎯 Accuracy: ${coords.accuracy ? coords.accuracy.toFixed(0) + 'm' : 'Unknown'}`,
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
            readableLocation: location
        });
    } catch (error) {
        updateStatus(`❌ Location test failed: ${error.message}`, "status-error");
    }
};

// Simulate Shake Function - USES REAL LOCATION
window.simulateShake = async function () {
    try {
        updateStatus("Simulating earthquake with real location...", "status-warning");
        const coords = await getCurrentPosition();
        const location = await getReadableLocation(coords.latitude, coords.longitude);
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
                lng: coords.longitude
            },
            accuracy: coords.accuracy || 0,
            devicelnfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            }
        };
        lastShakeEvent = {
            timestamp: testData.timestamp,
            lat: coords.latitude,
            lng: coords.longitude
        };
        if (database) {
            const shakeRef = ref(database, "shakes/");
            const newShakeRef = push(shakeRef);
            await set(newShakeRef, testData);
            updateStatus(`Earthquake logged at your real location: ${location}`, "status-success");
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
            await logShakeWithRealLocation(total, x, y, z);
        }
    } catch (error) {
        console.error("❌ Motion handling error:", error);
    }
}

// Log shake with real location
async function logShakeWithRealLocation(intensity, x, y, z) {
    try {
        updateStatus("Logging real earthquake data...", "status-warning");
        const coords = await getCurrentPosition();
        const location = await getReadableLocation(coords.latitude, coords.longitude);
        const shakeData = {
            timestamp: Date.now(),
            intensity: intensity,
            x: x,
            y: y,
            z: z,
            location: location,
            coordinates: {
                lat: coords.latitude,
                lng: coords.longitude
            },
            accuracy: coords.accuracy || 0,
            devicelnfo: {
                userAgent: navigator.userAgent.substring(0, 100),
                platform: navigator.platform
            }
        };
        lastShakeEvent = {
            timestamp: shakeData.timestamp,
            lat: coords.latitude,
            lng: coords.longitude
        };
        if (database) {
            const shakeRef = ref(database, "shakes/");
            const newShakeRef = push(shakeRef);
            await set(newShakeRef, shakeData);
            updateStatus(`Real earthquake logged: ${location}`, "status-success");
        }
    } catch (error) {
        console.error("❌ Shake logging error:", error);
        updateStatus(`❌ Failed to log earthquake: ${error.message}`, "status-error");
    }
}

// Listen for nearby alerts and show message
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
                    showAlertMessage(alert);
                }
            }
        });
    });
}

// Show alert message (different for own shake)
function showAlertMessage(alert) {
    let isOwnShake = false;
    if (lastShakeEvent) {
        const timeDiff = Math.abs(alert.timestamp - lastShakeEvent.timestamp);
        const dist = calculateDistance(
            alert.coordinates.lat,
            alert.coordinates.lng,
            lastShakeEvent.lat,
            lastShakeEvent.lng
        );
        if (timeDiff < 15000 && dist < 0.2) {
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

// Main initialization
async function initializeSystem() {
    try {
        updateStatus("⏳ Initializing ShakeAlert with Real GPS...", "status-warning");
        await initializeFirebaseApp();
        initializeMap();
        initializeDeviceMotion();
        requestNotificationPermission();
        // Get user location and start listening for alerts
        const coords = await getCurrentPosition();
        listenForNearbyAlerts(coords.latitude, coords.longitude);
        updateStatus("✅ ShakeAlert System Ready with Real Location Detection!", "status-success");
    } catch (error) {
        console.error("System initialization error:", error);
        updateStatus("⚠️ System partially loaded", "status-warning");
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
            systemStatus.notificationsEnabled = permission === "granted";
            console.log(`Notification permission: ${permission}`);
        });
    }
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSystem);
} else {
    initializeSystem();
}
