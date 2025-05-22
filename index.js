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
  measurementId: "G-L3M6X4QG2E"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Push function
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

// Device motion listener
window.addEventListener("devicemotion", function(event) {
  const x = event.acceleration.x;
  const y = event.acceleration.y;
  const z = event.acceleration.z;

  sendMotionData(x, y, z); // yaha data firebase me jaayega
});
