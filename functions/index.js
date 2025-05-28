import { onValueCreated } from "firebase-functions/v2/database";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import * as logger from "firebase-functions/logger";
import * as geofire from "geofire-common";

// Initialize admin app
initializeApp();
const adminDb = getDatabase();

export const detectCollectiveShake = onValueCreated(
  {
    ref: "/shakes/{shakeId}",
    region: "asia-southeast1",
    instance: "shakealert-908d0-default-rtdb",
  },
  async (event) => {
    logger.info("detectCollectiveShake triggered for shakeId:", event.params.shakeId);

    const snapshot = event.data;
    const newShake = snapshot.val();

    // Validate newShake data
    if (
      !newShake ||
      !newShake.coordinates ||
      typeof newShake.coordinates.lat !== "number" ||
      typeof newShake.coordinates.lng !== "number" ||
      typeof newShake.timestamp !== "number"
    ) {
      logger.error("Invalid or missing critical data in new shake. Exiting.", { data: newShake });
      return null;
    }

    const currentTime = Date.now();
    const RADIUS_KM = 5;
    const MIN_UNIQUE_DEVICES = 2; // Changed from MIN_REPORTS to MIN_UNIQUE_DEVICES
    const TIME_WINDOW_MS = 30000; // 30 seconds

    // Calculate geohash for the new shake
    const hash = geofire.geohashForLocation([
      newShake.coordinates.lat,
      newShake.coordinates.lng,
    ]);

    try {
      await snapshot.ref.update({ geohash: hash });
      logger.info("Geohash updated for new shake:", event.params.shakeId);
    } catch (error) {
      logger.error("Failed to update geohash for new shake:", event.params.shakeId, error);
      return null;
    }

    // Query for nearby shakes using geohash and time window
    const shakesRef = adminDb.ref("shakes");
    let uniqueDevices = new Set(); // Track unique devices
    let totalNearbyShakes = 0;

    try {
      const query = shakesRef
        .orderByChild("geohash")
        .startAt(hash.substring(0, 5))
        .endAt(hash.substring(0, 5) + "\uf8ff");

      const querySnapshot = await query.once("value");

      if (!querySnapshot.exists()) {
        logger.info("No shakes found with matching geohash prefix for shakeId:", event.params.shakeId);
      } else {
        querySnapshot.forEach((childSnapshot) => {
          const shake = childSnapshot.val();
          
          // Validate shake data from query
          if (
            !shake || !shake.coordinates || 
            typeof shake.coordinates.lat !== "number" ||
            typeof shake.coordinates.lng !== "number" || 
            typeof shake.timestamp !== "number"
          ) {
            logger.warn("Skipping invalid shake data from query:", { key: childSnapshot.key, data: shake });
            return;
          }

          // Filter by time window
          if (currentTime - shake.timestamp > TIME_WINDOW_MS) {
            return;
          }

          // Calculate distance
          const distance = geofire.distanceBetween(
            [shake.coordinates.lat, shake.coordinates.lng],
            [newShake.coordinates.lat, newShake.coordinates.lng]
          );

          if (distance <= RADIUS_KM) {
            totalNearbyShakes++;
            
            // --- KEY CHANGE: TRACK UNIQUE DEVICES ---
            // Create a unique device identifier based on coordinates + user agent + IP approximation
            // Since we don't have device IDs, we'll use a combination of:
            // 1. Rounded coordinates (to group very close locations as same device)
            // 2. User agent hash (if available)
            // 3. Time clustering (shakes within 5 seconds from same location = same device)
            
            const deviceFingerprint = createDeviceFingerprint(shake);
            uniqueDevices.add(deviceFingerprint);
          }
        });
      }
    } catch (error) {
      logger.error("Error querying shakes for shakeId:", event.params.shakeId, error);
    }

    const uniqueDeviceCount = uniqueDevices.size;
    logger.info(`Found ${totalNearbyShakes} total nearby shakes from ${uniqueDeviceCount} unique devices for shakeId: ${event.params.shakeId}`);

    // --- CHANGED CONDITION: CHECK UNIQUE DEVICES, NOT TOTAL SHAKES ---
    if (uniqueDeviceCount >= MIN_UNIQUE_DEVICES) {
      const alertData = {
        timestamp: currentTime,
        detectedAtISO: new Date(currentTime).toISOString(),
        epicenter: newShake.coordinates,
        radiusKm: RADIUS_KM,
        uniqueDevices: uniqueDeviceCount, // Changed from 'reports'
        totalShakes: totalNearbyShakes,   // Added for reference
        originalLocationString: newShake.location || "Unknown",
        triggeringShakeId: event.params.shakeId,
      };
      
      try {
        const alertsRef = adminDb.ref("alerts").push();
        await alertsRef.set(alertData);
        logger.log("🚨 Earthquake alert CREATED!", { 
          alertId: alertsRef.key, 
          triggeredBy: event.params.shakeId, 
          uniqueDevices: uniqueDeviceCount,
          totalShakes: totalNearbyShakes,
          data: alertData 
        });
      } catch (error) {
        logger.error("Failed to create alert for shakeId:", event.params.shakeId, error, { alertData });
      }
    } else {
      logger.info(`ℹ️ No alert created. Only ${uniqueDeviceCount} unique devices (need ${MIN_UNIQUE_DEVICES}). Total shakes: ${totalNearbyShakes} for shakeId: ${event.params.shakeId}`);
    }
    
    return null;
  }
);

// --- NEW HELPER FUNCTION: CREATE DEVICE FINGERPRINT ---
function createDeviceFingerprint(shake) {
  // Round coordinates to ~100m precision to group nearby shakes as same device
  const roundedLat = Math.round(shake.coordinates.lat * 1000) / 1000; // ~111m precision
  const roundedLng = Math.round(shake.coordinates.lng * 1000) / 1000; // ~111m precision
  
  // Group shakes within 5-second windows as potentially same device
  const timeWindow = Math.floor(shake.timestamp / 5000) * 5000; // 5-second windows
  
  // Create a unique fingerprint
  const fingerprint = `${roundedLat}_${roundedLng}_${timeWindow}`;
  
  return fingerprint;
}
