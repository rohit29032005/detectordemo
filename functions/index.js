// functions/index.js
import { onValueCreated } from "firebase-functions/v2/database";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import * as logger from "firebase-functions/logger";
import * as geofire from "geofire-common";

// Initialize Firebase Admin SDK
initializeApp();
const adminDb = getDatabase(); // Use this for database operations within the function

export const detectCollectiveShake = onValueCreated(
  {
    ref: "/shakes/{shakeId}",
    // --- CRITICAL CHANGES HERE ---
    region: "asia-southeast1", // Specify the region of your function AND database trigger source
    instance: "shakealert-908d0-default-rtdb", // Your Realtime Database instance ID
    // --- END OF CRITICAL CHANGES ---
  },
  async (event) => {
    logger.info("detectCollectiveShake triggered for shakeId:", event.params.shakeId, "in region:", event.region, "on instance:", event.firebaseDatabaseHost);

    const snapshot = event.data;
    const newShake = snapshot.val();

    // --- Robustness: Validate newShake data ---
    if (
      !newShake ||
      !newShake.coordinates ||
      typeof newShake.coordinates.lat !== "number" ||
      typeof newShake.coordinates.lng !== "number" ||
      typeof newShake.timestamp !== "number"
    ) {
      logger.error("Invalid or missing critical data in new shake. Exiting.", { data: newShake, shakeId: event.params.shakeId });
      return null;
    }

    const currentTime = Date.now();
    const RADIUS_KM = 5;
    const MIN_REPORTS = 3;
    const TIME_WINDOW_MS = 30000; // 30 seconds

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

    const shakesRef = adminDb.ref("shakes"); // Use adminDb consistently
    let similarShakes = 0;

    try {
      const query = shakesRef
        .orderByChild("geohash")
        .startAt(hash.substring(0, 5))
        .endAt(hash.substring(0, 5) + "\uf8ff");

      const querySnapshot = await query.once("value");

      if (!querySnapshot.exists()) {
        logger.info("No shakes found with matching geohash prefix for shakeId:", event.params.shakeId);
      } else {
        const promises = [];
        querySnapshot.forEach((childSnapshot) => {
          const shake = childSnapshot.val();
          if (
            !shake || !shake.coordinates || typeof shake.coordinates.lat !== "number" ||
            typeof shake.coordinates.lng !== "number" || typeof shake.timestamp !== "number"
          ) {
            logger.warn("Skipping invalid shake data from query:", { key: childSnapshot.key, data: shake });
            return;
          }
          if (currentTime - shake.timestamp > TIME_WINDOW_MS) {
            return; 
          }
          promises.push(
            new Promise((resolve) => {
              const distance = geofire.distanceBetween(
                [shake.coordinates.lat, shake.coordinates.lng],
                [newShake.coordinates.lat, newShake.coordinates.lng]
              );
              if (distance <= RADIUS_KM) {
                similarShakes++;
              }
              resolve(null); // Resolve with null or any value
            })
          );
        });
        await Promise.all(promises);
      }
    } catch (error) {
      logger.error("Error querying shakes for shakeId:", event.params.shakeId, error);
    }

    logger.info(`Found ${similarShakes} similar shakes for shakeId: ${event.params.shakeId}`);

    if (similarShakes >= MIN_REPORTS) {
      const alertData = {
        timestamp: currentTime,
        detectedAtISO: new Date(currentTime).toISOString(),
        epicenter: newShake.coordinates,
        radiusKm: RADIUS_KM,
        reports: similarShakes,
        originalLocationString: newShake.location || "Unknown",
        triggeringShakeId: event.params.shakeId,
      };
      try {
        const alertRef = adminDb.ref("alerts").push(); // Use adminDb
        await alertRef.set(alertData);
        logger.log("🚨 Earthquake alert CREATED!", { alertId: alertRef.key, triggeredBy: event.params.shakeId, data: alertData });
      } catch (error) {
        logger.error("Failed to create alert for shakeId:", event.params.shakeId, error, { alertData });
      }
    } else {
      logger.info(`ℹ️ No alert created. Only ${similarShakes} nearby shakes for shakeId: ${event.params.shakeId}. Threshold is ${MIN_REPORTS}.`);
    }
    return null;
  }
);
