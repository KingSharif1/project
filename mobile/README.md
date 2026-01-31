# 📱 CarFlow Transit - Mobile Applications

> React Native mobile apps for drivers and patients built with Expo.

## 📋 Overview

This directory contains **two mobile applications**:

### 🚗 Driver App
For drivers to:
- View assigned trips
- Update trip status (start, complete, cancel)
- Share GPS location in real-time
- View trip history and earnings
- Manage availability

### 🏥 Patient App
For patients to:
- Request transportation
- View upcoming appointments
- Track driver location
- View trip history
- Manage profile

**Both apps connect to the same Express backend API.**

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Configure Environment
Create `.env` file:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start Expo
```bash
npx expo start
```

### 4. Run on Device

**Option 1: Physical Device (Recommended)**
1. Install **Expo Go** app from App Store/Play Store
2. Scan QR code from terminal
3. App will load on your phone

**Option 2: Emulator/Simulator**
- Press `a` for Android Emulator
- Press `i` for iOS Simulator

**Option 3: Web Browser**
- Press `w` to run in browser (limited features)

---

## 🎯 App Modes

The codebase contains two separate apps:

### Switch Between Apps
Edit `App.js` to choose which app to run:

```javascript
// For Driver App
import DriverApp from './DriverApp';
export default DriverApp;

// For Patient App
import PatientApp from './PatientApp';
export default PatientApp;
```

---

## 🚗 Driver App Features

### Authentication
- Login with driver credentials
- Secure JWT token storage
- Auto-login on app restart

### Trip Management
- View assigned trips
- See trip details (pickup, dropoff, patient info)
- Update trip status:
  - Start trip
  - Complete trip
  - Cancel trip
- View trip history

### Location Tracking
- GPS location sharing
- Real-time location updates to server
- Background location tracking

### Profile
- View driver information
- See vehicle details
- Track earnings
- Manage availability

---

## 🏥 Patient App Features

### Authentication
- Login with patient credentials
- Secure token storage
- Auto-login

### Trip Requests
- Request new transportation
- Specify pickup and dropoff locations
- Set appointment time
- Add special notes (wheelchair, etc.)

### Trip Tracking
- View upcoming trips
- Track driver location in real-time
- See estimated arrival time
- View trip history

### Profile
- Manage personal information
- View contact details
- Update preferences

---

## 📂 Project Structure

```
mobile/
├── DriverApp.js          # Driver application
├── PatientApp.js         # Patient application
├── App.js                # Main entry (switch between apps)
│
├── services/
│   └── api.js            # Backend API client
│
├── components/           # Shared components
│   ├── TripCard.js
│   ├── MapView.js
│   └── ...
│
├── assets/               # Images, fonts, icons
├── .env                  # Environment variables
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── README.md             # This file
```

---

## 🎨 Tech Stack

- **React Native** - Mobile framework
- **Expo SDK 54** - Development platform
- **AsyncStorage** - Local data storage
- **Expo Location** - GPS tracking
- **React Navigation** - Screen navigation
- **Axios** - HTTP client

---

## 🔧 Development

### Start Development Server
```bash
npx expo start
```

### Clear Cache
```bash
npx expo start -c
```

### Run on Specific Platform
```bash
# Android
npx expo start --android

# iOS
npx expo start --ios

# Web
npx expo start --web
```

### Debugging
```bash
# Open React DevTools
npx expo start --devtools

# View logs
npx expo start --clear
```

---

## 🔌 API Integration

Both apps communicate with the Express backend:

### Driver App API Calls
```javascript
// Login
const response = await api.driverLogin(email, password);

// Get trips
const trips = await api.getDriverTrips(driverId, token);

// Update trip status
await api.updateTripStatus(tripId, 'in_progress', token);

// Update location
await api.updateDriverLocation(driverId, lat, lng, token);
```

### Patient App API Calls
```javascript
// Login
const response = await api.patientLogin(email, password);

// Get trips
const trips = await api.getPatientTrips(patientId, token);

// Request trip
await api.createTripRequest(details, token);
```

---

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_API_URL` | Backend API URL | ✅ Yes |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ Yes |

**Note:** Use your computer's IP address for `EXPO_PUBLIC_API_URL` when testing on physical device:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

---

## 📱 Testing

### Driver App Testing
1. Start backend server (`npm run dev` in `server/`)
2. Start Expo (`npx expo start`)
3. Scan QR code with Expo Go
4. Login with driver credentials
5. Test features:
   - View trips
   - Update trip status
   - Share location

### Patient App Testing
1. Edit `App.js` to use `PatientApp`
2. Restart Expo
3. Login with patient credentials
4. Test features:
   - Request trip
   - View upcoming trips
   - Track driver

---

## 🚀 Deployment

### Build for Production

**Using EAS Build (Recommended):**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

### Submit to App Stores

**Google Play Store:**
```bash
eas submit --platform android
```

**Apple App Store:**
```bash
eas submit --platform ios
```

### Environment Variables (Production)
Set these in `eas.json` or Expo dashboard:
- `EXPO_PUBLIC_API_URL` - Production backend URL
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase key

---

## 🔐 Permissions

Both apps require the following permissions:

### Android (app.json)
```json
{
  "android": {
    "permissions": [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "FOREGROUND_SERVICE"
    ]
  }
}
```

### iOS (app.json)
```json
{
  "ios": {
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "We need your location to track trips",
      "NSLocationAlwaysUsageDescription": "We need your location for real-time tracking"
    }
  }
}
```

---

## 🧪 Testing Checklist

### Driver App
- [ ] Login with driver credentials
- [ ] View assigned trips
- [ ] Start trip
- [ ] Update trip status to in-progress
- [ ] Complete trip
- [ ] Location sharing works
- [ ] View trip history
- [ ] Logout

### Patient App
- [ ] Login with patient credentials
- [ ] Request new trip
- [ ] View upcoming trips
- [ ] See driver location on map
- [ ] View trip details
- [ ] View trip history
- [ ] Logout

---

## 🐛 Troubleshooting

### "Network request failed"
- Check backend server is running
- Verify `EXPO_PUBLIC_API_URL` is correct
- Use computer's IP address, not `localhost`
- Ensure phone and computer are on same network

### "Location permission denied"
- Grant location permission in phone settings
- Restart app after granting permission

### "Cannot connect to Metro bundler"
- Clear Expo cache: `npx expo start -c`
- Restart Expo server
- Check firewall settings

### "Module not found"
- Delete `node_modules` and reinstall:
  ```bash
  rm -rf node_modules
  npm install
  ```

---

## 📚 Related Documentation

- **[Root README](../README.md)** - Project overview
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - System architecture
- **[server/README.md](../server/README.md)** - Backend API docs
- **[Expo Documentation](https://docs.expo.dev/)** - Expo guides

---

## 🛣️ Roadmap

- [ ] Push notifications for trip updates
- [ ] Offline mode with data sync
- [ ] In-app messaging (driver ↔ patient)
- [ ] Route optimization
- [ ] Turn-by-turn navigation
- [ ] Rating system
- [ ] Multi-language support
- [ ] Dark mode

---

**Built with ❤️ for CarFlow Transit**
