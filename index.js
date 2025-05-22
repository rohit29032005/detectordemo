import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, set } from "firebase/database";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBwVMxhmCbm-jo6ExYj2m9hXLhexuDKk0U",
  authDomain: "shakealert-908d0.firebaseapp.com",
  projectId: "shakealert-908d0",
  storageBucket: "shakealert-908d0.appspot.com",
  messagingSenderId: "202678351500",
  appId: "1:202678351500:web:f442a6f1354dba4b746da9",
  measurementId: "G-L3M6X4QG2E",
  databaseURL: "https://shakealert-908d0-default-rtdb.firebaseio.com/"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Send to Firebase
function sendMotionData(x, y, z) {
  const motionRef = ref(database, 'motions/');
  const newMotionRef = push(motionRef);
  set(newMotionRef, {
    timestamp: Date.now(),
    x: x,
    y: y,
    z: z
  });
}

// Start after DOM fully loaded
window.addEventListener("load", () => {
  window.addEventListener("devicemotion", function(event) {
    const acc = event.accelerationIncludingGravity;

    if (acc) {
      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;

      console.log(`📲 Motion: X=${x}, Y=${y}, Z=${z}`);
      sendMotionData(x, y, z);
    } else {
      console.log("No motion data received.");
    }
  });
});
