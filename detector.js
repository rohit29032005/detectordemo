// Enhanced ShakeAlert - FIXED VERSION
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// YOUR ACTUAL Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwVMxhmCbm-jo6ExYj2m9hXLhexuDKk0U",
  authDomain: "shakealert-908d0.firebaseapp.com",
  databaseURL: "https://shakealert-908d0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shakealert-908d0",
  storageBucket: "shakealert-908d0.firebasestorage.app",
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

// Constants
const P_WAVE_SPEED = 6.0;
const S_WAVE_SPEED = 3.5;
const SHAKE_THRESHOLD = 15;
const UPDATE_INTERVAL = 5000;
const FALLBACK_COORDS = { lat: 12.9716, lng: 79.1588 };

// Status elements
const statusText = document.getElementById("status");

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    updateStatus("⚠️ Minor error occurred, system recovering...", "status-warning");
});

// Initialize Firebase
async function initializeFirebaseApp() {
    try {
        const app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        
        const testRef = ref(database, 'system/heartbeat');
        await set(testRef, { 
            timestamp: Date.now(),
            status: 'connected',
            version: '3.0'
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
        if (typeof L === 'undefined') {
            console.error("Leaflet library not loaded");
            showMapFallback();
            return;
        }
        
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error("Map container not found");
            showMapFallback();
            return;
        }
        
        // Initialize map
        map = L.map('map').setView([20, 77], 4);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
        
        // Add default markers
        L.marker([28.6139, 77.2090])
            .addTo(map)
            .bindPopup("📍 Delhi, India");
        
        L.marker([12.9716, 79.1588])
            .addTo(map)
            .bindPopup("🏫 VIT Vellore");
        
        systemStatus.mapLoaded = true;
        console.log("✅ Map initialized successfully");
        
    } catch (error) {
        console.error("Map initialization error:", error);
        showMapFallback();
    }
}

// Show map fallback
function showMapFallback() {
    const mapContainer = document.getElementById('map');
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

// Test Location Function
window.testLocation = async function() {
    try {
        updateStatus("📡 Testing location services...", "status-warning");
        
        if (!navigator.geolocation) {
            updateStatus("⚠️ Geolocation not supported, using VIT Vellore", "status-warning");
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(4);
                const lng = position.coords.longitude.toFixed(4);
                updateStatus(`✅ Location: ${lat}, ${lng}`, "status-success");
                
                if (map) {
                    map.setView([position.coords.latitude, position.coords.longitude], 10);
                    L.marker([position.coords.latitude, position.coords.longitude])
                        .addTo(map)
                        .bindPopup("📍 Your Current Location")
                        .openPopup();
                }
                systemStatus.locationEnabled = true;
            },
            (error) => {
                updateStatus("⚠️ Using fallback location: VIT Vellore", "status-warning");
                systemStatus.locationEnabled = false;
                if (map) {
                    map.setView([12.9716, 79.1588], 10);
                }
            }
        );
    } catch (error) {
        updateStatus(`❌ Location test failed: ${error.message}`, "status-error");
    }
};

// Simulate Shake Function
window.simulateShake = async function() {
    try {
        updateStatus("🚨 Simulating earthquake...", "status-warning");
        
        const testData = {
            timestamp: Date.now(),
            intensity: 18,
            x: 1.5, y: 2.0, z: 9.8,
            location: "VIT Vellore, Tamil Nadu",
            coordinates: { lat: 12.9716, lng: 79.1588 }
        };
        
        if (database) {
            const shakeRef = ref(database, 'shakes/');
            const newShakeRef = push(shakeRef);
            await set(newShakeRef, testData);
            updateStatus("✅ Earthquake simulation sent to Firebase!", "status-success");
        } else {
            // Local simulation
            startWaveSimulation(testData);
            updateStatus("✅ Earthquake simulation (offline mode)!", "status-success");
        }
        
    } catch (error) {
        updateStatus(`❌ Simulation failed: ${error.message}`, "status-error");
    }
};

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
        const color = intensity > 15 ? '#ff0000' : '#ff8800';
        
        const shakeMarker = L.circleMarker([lat, lng], {
            radius: markerSize,
            fillColor: color,
            color: '#000',
            weight: 2,
            fillOpacity: 0.7
        }).addTo(map);
        
        shakeMarker.bindPopup(`
            <div style="text-align: center; color: #333;">
                <h4>🚨 Earthquake Detected!</h4>
                <p><strong>Intensity:</strong> ${intensity.toFixed(1)}</p>
                <p><strong>Location:</strong> ${shake.location}</p>
                <p><strong>Time:</strong> ${new Date(shake.timestamp).toLocaleTimeString()}</p>
            </div>
        `).openPopup();
        
        map.setView([lat, lng], 8);
        
    } catch (error) {
        console.error("Error plotting shake:", error);
    }
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
                color: '#0066ff',
                weight: 2,
                fillOpacity: 0.1
            }).addTo(map);
        }
        
        if (sWaveRadius > 0) {
            sWaveCircle = L.circle(epicenter, {
                radius: sWaveRadius,
                color: '#ff0000',
                weight: 3,
                fillOpacity: 0.2
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
                `🌊 Wave Simulation: P-wave ${pWaveRadius.toFixed(0)}km, S-wave ${sWaveRadius.toFixed(0)}km from ${shake.location}`,
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
        let alertPanel = document.getElementById('alert-panel');
        if (!alertPanel) {
            alertPanel = document.createElement('div');
            alertPanel.id = 'alert-panel';
            alertPanel.className = 'alert-panel';
            document.body.appendChild(alertPanel);
        }
        
        alertPanel.innerHTML = `
            <h3>🚨 P-WAVE DETECTED!</h3>
            <p><strong>Magnitude:</strong> ${(shake.intensity / 3).toFixed(1)}</p>
            <p><strong>Location:</strong> ${shake.location}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <p style="color: #ffff00; font-weight: bold;">⚠️ S-wave incoming! Take cover!</p>
        `;
        alertPanel.style.display = 'block';
        
        setTimeout(() => {
            alertPanel.style.display = 'none';
        }, 8000);
        
        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification('🚨 P-Wave Detected!', {
                body: `Earthquake at ${shake.location}. S-wave incoming!`
            });
        }
        
    } catch (error) {
        console.error("P-wave alert error:", error);
    }
}

// Wave propagation function
window.simulateWavePropagation = function(lat, lng, intensity) {
    try {
        const simulatedShake = {
            coordinates: { lat, lng },
            intensity,
            location: `Simulated Event (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
            timestamp: Date.now()
        };
        
        startWaveSimulation(simulatedShake);
        updateStatus(`🌊 Wave simulation started at ${lat.toFixed(2)}, ${lng.toFixed(2)}`, "status-success");
        
    } catch (error) {
        console.error("Manual simulation error:", error);
    }
};

// Check system status
window.checkSystemStatus = function() {
    const statusGrid = document.getElementById('statusGrid');
    if (statusGrid) {
        statusGrid.innerHTML = `
            <div class="status-card ${systemStatus.mapLoaded ? 'online' : 'offline'}">
                <h4>🗺️ Interactive Map</h4>
                <p>${systemStatus.mapLoaded ? 'Online' : 'Offline'}</p>
            </div>
            <div class="status-card ${systemStatus.firebaseConnected ? 'online' : 'offline'}">
                <h4>🔥 Firebase Database</h4>
                <p>${systemStatus.firebaseConnected ? 'Connected' : 'Disconnected'}</p>
            </div>
            <div class="status-card ${systemStatus.locationEnabled ? 'online' : 'offline'}">
                <h4>📍 Location Services</h4>
                <p>${systemStatus.locationEnabled ? 'Enabled' : 'Fallback Mode'}</p>
            </div>
            <div class="status-card online">
                <h4>🌊 Wave Simulation</h4>
                <p>Active (${activeSimulations.length} running)</p>
            </div>
        `;
    }
    updateStatus("🔍 System status updated", "status-success");
};

// Emergency mode
window.emergencyMode = function() {
    updateStatus("🆘 Emergency mode activated", "status-warning");
    
    const emergencyDiv = document.createElement('div');
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
        <p>Core earthquake detection is working!</p>
        <div style="margin: 20px 0;">
            <button onclick="simulateShake(); this.parentElement.parentElement.remove();" style="
                background: #ff6b6b; color: white; border: none; padding: 12px 20px; 
                border-radius: 5px; cursor: pointer; margin: 5px; font-weight: bold;
            ">🚨 Test Earthquake</button>
            <button onclick="testLocation(); this.parentElement.parentElement.remove();" style="
                background: #4ecdc4; color: white; border: none; padding: 12px 20px; 
                border-radius: 5px; cursor: pointer; margin: 5px; font-weight: bold;
            ">📍 Test Location</button>
        </div>
        <button onclick="this.parentElement.remove()" style="
            background: white; color: #333; border: none; padding: 10px 20px; 
            border-radius: 5px; cursor: pointer; font-weight: bold;
        ">Close</button>
    `;
    
    document.body.appendChild(emergencyDiv);
};

// Retry map loading
window.retryMapLoad = function() {
    updateStatus("🔄 Retrying map initialization...", "status-warning");
    initializeMap();
};

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            systemStatus.notificationsEnabled = (permission === 'granted');
            console.log(`Notification permission: ${permission}`);
        });
    }
}

// Main initialization
async function initializeSystem() {
    try {
        updateStatus("🔄 Initializing ShakeAlert System...", "status-warning");
        
        // Initialize components
        await initializeFirebaseApp();
        initializeMap();
        requestNotificationPermission();
        
        updateStatus("✅ ShakeAlert System Ready!", "status-success");
        
    } catch (error) {
        console.error("System initialization error:", error);
        updateStatus("⚠️ System partially loaded", "status-warning");
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSystem);
} else {
    initializeSystem();
}

console.log("🚨 ShakeAlert system loaded");
