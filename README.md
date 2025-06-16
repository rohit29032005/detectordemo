
# Real-Time Earthquake Detector & Disaster Response Demo

This repository is a demo web application for real-time earthquake detection and disaster response, leveraging the power of crowdsourced sensor data, mapping, and robust communication features. The application is built primarily with JavaScript, HTML, and CSS, and uses Firebase for backend services.

## Key Features

- **Earthquake Detection via Phone Sensors:**  
  Utilizes the phone's accelerometer to detect significant shaking. When multiple nearby devices register similar patterns, an earthquake is confirmed and real-time alerts are sent out.

- **Crowd Confirmation:**  
  Earthquake events are validated using data from surrounding users’ devices, ensuring high accuracy and reducing false alarms.

- **Disaster Heatmap (Snapchat-style):**  
  Users can post photos and videos from affected areas. These are aggregated and displayed as a heatmap on Google Maps, visually representing disaster intensity and scope.

- **Interactive Map with Profile Markers:**  
  - When zoomed in, user locations are shown as their profile pictures on the map.
  - Hovering or clicking a marker opens a popup with user details (name, status, contact info, etc.).
  - Marker clustering for low zoom levels, expanding into individual profiles as you zoom closer.

- **Real-Time Location & Alerts:**  
  The app continuously shares and updates user locations for efficient disaster response and coordination.

- **Offline Chat & Satellite Connectivity:**  
  Supports offline messaging and satellite communication features (targeted for Android 15), ensuring connectivity even during network outages.

- **User Authentication:**  
  Secure login, signup, and session management for all users.

- **Firebase Integration:**  
  Handles authentication, real-time data updates, and backend logic.

## Project Structure

- `index.html` — Main landing page.
- `detector.html` & `detector.js` — Core earthquake detection logic.
- `gis.html` — GIS and mapping features.
- `login.html`, `signup.html` — User authentication interfaces.
- `login.js`, `signup.js` — Authentication logic.
- `login.css`, `signup.css` — Authentication styling.
- `precaution.html`, `services.html` — Disaster preparedness and service information.
- `firebase.json`, `.firebaserc` — Firebase configuration.
- `functions/`, `server/` — Backend/serverless functions and server scripts.
- `picture/` — User-uploaded images and media for disaster reporting.

## How It Works

1. **Detection:** The application runs in the background, monitoring the phone accelerometer for earthquake-like movement.
2. **Crowdsourcing:** When a shake is detected, the system checks for similar reports from nearby phones.
3. **Alerting:** Upon confirmation, an alert is sent to all users in the affected area.
4. **Mapping:** Users can upload media, which is visualized as a heatmap on Google Maps. Profile pictures and popups provide additional context.
5. **Resilience:** Offline chat and satellite messaging allow users to stay connected in emergencies.

## Getting Started

1. Clone the repository:
    ```bash
    git clone https://github.com/rohit29032005/detectordemo.git
    ```
2. Set up Firebase according to the provided configuration files.
3. Serve the app locally or deploy to Firebase Hosting.

## Future Enhancements

- Expand satellite communication features as Android 15 support matures.
- Add more robust clustering and filtering on the map for large-scale disasters.
- Integrate more social features (e.g., emergency contacts, SOS buttons).

## License

[MIT License](LICENSE)

---

**Empowering communities with real-time, crowd-verified disaster detection and resilient communication.**
