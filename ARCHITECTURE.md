# 🏗️ CarFlow Transit - Complete Architecture Guide

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │   WEB APPLICATION    │         │    MOBILE APPLICATIONS   │  │
│  │   (React + Vite)     │         │   (React Native + Expo)  │  │
│  │   localhost:5173     │         │   - Driver App           │  │
│  │                      │         │   - Patient App          │  │
│  └──────────┬───────────┘         └──────────┬───────────────┘  │
└─────────────┼──────────────────────────────────┼──────────────────┘
              │                                  │
              ↓                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER                           │
│  ┌──────────────────────────────────────────────────────────────┤
│  │         EXPRESS.JS SERVER (localhost:3000)                   │
│  │  ┌────────────────────────────────────────────────────────┐ │
│  │  │  Web Routes:                                            │ │
│  │  │  • POST /api/auth/login     - User authentication      │ │
│  │  │  • POST /api/auth/logout    - User logout              │ │
│  │  │  • GET  /api/auth/me        - Get current user         │ │
│  │  │                                                         │ │
│  │  │  Mobile Routes:                                         │ │
│  │  │  • POST /api/mobile/auth/login       - Mobile login    │ │
│  │  │  • GET  /api/mobile/driver/trips     - Driver trips    │ │
│  │  │  • POST /api/mobile/driver/location  - Update location │ │
│  │  │  • GET  /api/mobile/patient/trips    - Patient trips   │ │
│  │  │  • POST /api/mobile/patient/trips    - Request trip    │ │
│  │  │                                                         │ │
│  │  │  • GET  /health             - Health check             │ │
│  │  └────────────────────────────────────────────────────────┘ │
│  │                                                              │
│  │  Middleware:                                                 │
│  │  • JWT token verification                                    │
│  │  • CORS (web: 5173, mobile: 8081)                           │
│  │  • Request logging                                           │
│  └──────────────────────────────────────────────────────────────┘
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE LAYER (Cloud)                        │
│  ┌──────────────────────────────────────────────────────────────┤
│  │  PostgreSQL Database                                         │
│  │  ┌────────────────────────────────────────────────────────┐ │
│  │  │  Tables (defined by migrations):                       │ │
│  │  │  • auth.users          - Authentication (Supabase)     │ │
│  │  │  • public.users        - User profiles                 │ │
│  │  │  • public.drivers      - Driver information            │ │
│  │  │  • public.patients     - Patient information           │ │
│  │  │  • public.trips        - Trip records                  │ │
│  │  │  • public.clinics      - Clinic/facility data          │ │
│  │  │  • public.vehicles     - Vehicle fleet                 │ │
│  │  │  • public.activity_log - Audit trail                   │ │
│  │  │  • + 20 more tables                                    │ │
│  │  └────────────────────────────────────────────────────────┘ │
│  │                                                              │
│  │  Features:                                                   │
│  │  • Real-time subscriptions                                  │
│  │  • Row Level Security (RLS)                                 │
│  │  • File storage                                             │
│  └──────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌐 WEB APP FLOW (Detailed)

### **1. User Opens Web App**
```
Browser → http://localhost:5173
  ↓
Vite Dev Server serves React app
  ↓
App.tsx loads
  ↓
AuthContext checks localStorage for saved user
  ↓
If user found → Show Dashboard
If no user → Show Login page
```

### **2. User Logs In**
```
User enters email + password in Login.tsx
  ↓
Login.tsx calls AuthContext.login(email, password)
  ↓
AuthContext.tsx:
  1. Check brute force protection (localStorage)
  2. Call api.login(email, password)
  ↓
api.ts (web/src/services/api.ts):
  fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  ↓
Backend Server (server/routes/auth.js):
  1. Receive request
  2. Query public.users table for user
  3. Call verify_user_password() function in database
  4. Database checks password hash using bcrypt
  5. If valid:
     - Generate JWT token (using JWT_SECRET)
     - Return { success: true, token, user }
  6. If invalid:
     - Return { error: 'Invalid credentials' }
  ↓
api.ts receives response
  ↓
AuthContext.tsx:
  1. Store user in state
  2. Store user in localStorage
  3. Store JWT token in localStorage
  4. Log audit entry to activity_log table
  5. Return true
  ↓
Login.tsx redirects to Dashboard
  ↓
Dashboard.tsx loads and displays user info
```

### **3. User Interacts with App**
```
User clicks on "Trip Management"
  ↓
App.tsx changes view to TripManagement.tsx
  ↓
TripManagement.tsx uses AppContext
  ↓
AppContext.tsx:
  - Loads trips from Supabase
  - Uses supabase client directly (with anon key)
  - Supabase RLS checks user permissions
  ↓
Trips displayed in UI
  ↓
User creates/edits trip
  ↓
AppContext calls supabase.from('trips').insert(...)
  ↓
Supabase database updates
  ↓
Real-time subscription notifies other users
  ↓
UI updates automatically
```

### **4. User Logs Out**
```
User clicks Logout button
  ↓
AuthContext.logout() called
  ↓
AuthContext.tsx:
  1. Get token from localStorage
  2. Call api.logout(token)
  ↓
Backend Server:
  1. Decode token to get user ID
  2. Log audit entry
  3. Return success
  ↓
AuthContext.tsx:
  1. Clear user from state
  2. Remove user from localStorage
  3. Remove token from localStorage
  4. Remove login time from localStorage
  ↓
App redirects to Login page
```

---

## 📱 MOBILE APP FLOW (Detailed)

### **Driver App Flow**

#### **1. Driver Opens App**
```
Driver launches app on phone
  ↓
DriverApp.js loads
  ↓
Check AsyncStorage for saved session
  ↓
If session found → Show Driver Dashboard
If no session → Show Login screen
```

#### **2. Driver Logs In**
```
Driver enters email + password
  ↓
api.js (mobile/services/api.js):
  fetch('http://localhost:3000/api/mobile/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, userType: 'driver' })
  })
  ↓
Express Backend (server/routes/mobile.js):
  1. Receive request
  2. Verify password using verify_user_password() function
  3. Fetch driver profile from drivers table
  4. Generate JWT token
  5. Return { success: true, token, profile }
  ↓
api.js:
  1. Store token in AsyncStorage
  2. Store profile in AsyncStorage
  3. Return profile
  ↓
DriverApp.js:
  1. Update state with driver profile
  2. Navigate to Driver Dashboard
```

#### **3. Driver Views Assigned Trips**
```
Driver Dashboard loads
  ↓
api.js calls getDriverTrips(driverId, token)
  ↓
Fetch from Express Backend:
  GET /api/mobile/driver/trips?driverId=xxx
  Headers: { Authorization: Bearer <token> }
  ↓
Express Backend (server/routes/mobile.js):
  1. Verify JWT token
  2. Query trips table where driver_id = driverId
  3. Return trips array
  ↓
Driver Dashboard displays trips
```

#### **4. Driver Updates Trip Status**
```
Driver clicks "Start Trip" button
  ↓
api.js calls updateTripStatus(tripId, 'in_progress', token)
  ↓
POST /api/mobile/driver/trips/:tripId/status
Body: { status: 'in_progress' }
  ↓
Express Backend:
  1. Verify token
  2. Update trip in database
  3. Return updated trip
  ↓
Driver Dashboard updates UI
  ↓
Database triggers real-time event
  ↓
Web app sees status change instantly
```

#### **5. Driver Shares Location**
```
Driver app tracks GPS location
  ↓
Every 30 seconds:
  api.js calls updateDriverLocation(driverId, lat, lng, token)
  ↓
POST /api/mobile/driver/location
Body: { driverId, latitude, longitude }
  ↓
Express Backend:
  1. Update drivers table with new location
  2. Database broadcasts to real-time channel
  ↓
Web app (dispatcher) sees driver location update in real-time
```

### **Patient App Flow**

#### **1. Patient Opens App**
```
Patient launches app
  ↓
PatientApp.js loads
  ↓
Check AsyncStorage for session
  ↓
If session → Show Patient Dashboard
If no session → Show Login
```

#### **2. Patient Logs In**
```
Similar to driver login, but:
  userType: 'patient'
  ↓
Edge Function fetches from patients table instead of drivers
  ↓
Returns patient profile
```

#### **3. Patient Views Upcoming Trips**
```
Patient Dashboard loads
  ↓
api.js calls getPatientTrips(patientId, token)
  ↓
GET /api/mobile/patient/trips?patientId=xxx
  ↓
Express Backend:
  1. Verify token
  2. Query trips where patient_id = patientId
  3. Return trips
  ↓
Patient sees upcoming appointments
```

#### **4. Patient Requests Trip**
```
Patient fills out trip request form
  ↓
api.js calls createTripRequest(details, token)
  ↓
POST /api/mobile/patient/trips
Body: { pickupAddress, dropoffAddress, appointmentTime, ... }
  ↓
Express Backend:
  1. Verify token
  2. Insert into trips table with status='pending'
  3. Return new trip
  ↓
Patient sees confirmation
  ↓
Database triggers real-time event
  ↓
Dispatcher sees new trip request in web app (real-time)
```

---

## 🔐 AUTHENTICATION FLOW

### **Web App Authentication**
```
1. User enters credentials
   ↓
2. Frontend → Backend API (Express)
   ↓
3. Backend queries database:
   - Check if user exists in public.users
   - Call verify_user_password(email, password)
   - Database uses bcrypt to verify password hash
   ↓
4. If valid:
   - Backend generates JWT token
   - JWT contains: { userId, email, role }
   - Signed with JWT_SECRET
   - Expires in 7 days
   ↓
5. Backend returns: { success: true, token, user }
   ↓
6. Frontend stores:
   - Token in localStorage
   - User profile in localStorage
   ↓
7. Future requests include token in Authorization header
```

### **Mobile App Authentication**
```
1. User enters credentials
   ↓
2. Mobile app → Express Backend (POST /api/mobile/auth/login)
   ↓
3. Backend:
   - Verifies password in database
   - Fetches driver or patient profile
   - Generates JWT token
   ↓
4. Returns: { success: true, token, profile }
   ↓
5. Mobile app stores in AsyncStorage
   ↓
6. Future requests include token in Authorization header
```

---

## 🗄️ DATABASE STRUCTURE

### **How Migrations Work**
```
supabase/migrations/ contains 79 SQL files
  ↓
Each file is numbered: YYYYMMDDHHMMSS_description.sql
  ↓
Files are executed in order to build database schema
  ↓
Example migration:
  20251008020835_create_core_transportation_schema.sql
  - Creates users, drivers, patients, trips tables
  - Sets up foreign keys
  - Adds indexes
  ↓
All migrations combined = Complete database structure
```

### **Key Tables and Relationships**
```
auth.users (Supabase managed)
  ↓ (id)
public.users (user profiles)
  ↓ (id)
  ├─→ drivers (if role = driver)
  └─→ dispatchers/admins (if role = admin/dispatcher)

patients
  ↓ (id)
trips
  ├─→ patient_id → patients
  ├─→ driver_id → drivers
  ├─→ clinic_id → clinics
  └─→ vehicle_id → vehicles

activity_log
  └─→ user_id → users (audit trail)
```

---

## 🔄 REAL-TIME FEATURES

### **How Real-Time Works**
```
Web App subscribes to Supabase real-time channel
  ↓
supabase
  .channel('trips')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
    // Update UI with new/updated trip
  })
  .subscribe()
  ↓
When trip is created/updated in database:
  1. Database triggers change event
  2. Supabase broadcasts to all subscribers
  3. Web app receives update
  4. UI updates automatically (no refresh needed)
```

### **Real-Time Use Cases**
- **Dispatcher creates trip** → Driver app shows new trip immediately
- **Driver updates status** → Web app shows status change in real-time
- **Driver shares location** → Web app shows moving marker on map
- **Patient requests trip** → Dispatcher sees request instantly

---

## 📂 PROJECT STRUCTURE (Clean)

```
project/
├── supabase/                    # Database Schema ONLY
│   └── migrations/              # 79 SQL files (database schema)
│       ├── 20251008020835_create_core_transportation_schema.sql
│       ├── 20251009024323_add_patient_consent_tracking.sql
│       └── ... (77 more files)
│
├── server/                      # Express Backend API (Web + Mobile)
│   ├── index.js                 # Main server file
│   ├── routes/
│   │   ├── auth.js              # Web auth endpoints
│   │   └── mobile.js            # Mobile endpoints (driver/patient)
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   ├── .env                     # Environment variables
│   └── package.json             # Dependencies
│
├── web/                         # React Web Application
│   ├── src/
│   │   ├── components/          # UI components
│   │   │   ├── Login.tsx        # Login page
│   │   │   ├── Dashboard.tsx    # Main dashboard
│   │   │   ├── TripManagement.tsx
│   │   │   ├── DriverManagement.tsx
│   │   │   └── ... (30+ components)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx  # Authentication state
│   │   │   └── AppContext.tsx   # App state (trips, drivers, etc.)
│   │   ├── services/
│   │   │   └── api.ts           # Backend API client
│   │   ├── lib/
│   │   │   └── supabase.ts      # Supabase client
│   │   ├── utils/               # Utilities
│   │   └── types/               # TypeScript types
│   ├── .env                     # Environment variables
│   └── package.json             # Dependencies
│
└── mobile/                      # React Native Mobile Apps
    ├── DriverApp.js             # Driver application
    ├── PatientApp.js            # Patient application
    ├── services/
    │   └── api.js               # API client (calls Edge Functions)
    ├── components/              # Shared mobile components
    └── package.json             # Dependencies
```

---

## 🔑 ENVIRONMENT VARIABLES

### **Backend Server (.env)**
```env
# Supabase
SUPABASE_URL=https://ocjqsnocuqyumoltighi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=70e6a5a776b90d3af42a7caf47e1a825ed0c5aa2d66f5aa53f53a0b9f8820a6053361205ed728
JWT_EXPIRES_IN=7d
```

### **Web App (.env.local)**
```env
# Backend API
VITE_API_URL=http://localhost:3000/api

# Supabase (for direct database access)
VITE_SUPABASE_URL=https://ocjqsnocuqyumoltighi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Mobile Apps (.env)**
```env
EXPO_PUBLIC_SUPABASE_URL=https://ocjqsnocuqyumoltighi.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚀 HOW TO RUN EVERYTHING

### **1. Start Backend Server**
```bash
cd server
npm run dev
# Runs on http://localhost:3000
```

### **2. Start Web App**
```bash
cd web
npm run dev
# Runs on http://localhost:5173
```

### **3. Start Driver App**
```bash
cd mobile
npx expo start
# Scan QR code with Expo Go app
# Or press 'w' for web version
```

### **4. Start Patient App**
```bash
cd mobile
# Edit App.js to import PatientApp instead of DriverApp
npx expo start
```

---

## 📊 DATA FLOW EXAMPLES

### **Example 1: Dispatcher Creates Trip**
```
1. Dispatcher fills form in TripManagement.tsx
   ↓
2. Calls AppContext.addTrip(tripData)
   ↓
3. AppContext calls supabase.from('trips').insert(tripData)
   ↓
4. Supabase inserts into database
   ↓
5. Database triggers real-time event
   ↓
6. All subscribers receive update:
   - Web app updates trip list
   - Driver app shows new trip (if assigned)
   - Patient app shows trip (if their trip)
```

### **Example 2: Driver Completes Trip**
```
1. Driver clicks "Complete Trip" in mobile app
   ↓
2. api.js calls updateTripStatus(tripId, 'completed')
   ↓
3. Edge Function updates database
   ↓
4. Database calculates driver payout
   ↓
5. Real-time event broadcasts to web app
   ↓
6. Dispatcher sees trip marked complete
   ↓
7. Billing system generates invoice
```

---

## 🎯 SUMMARY

**3-Tier Architecture:**
1. **Frontend** (Web + Mobile) - User interface
2. **Backend** (Express + Edge Functions) - Business logic & auth
3. **Database** (Supabase PostgreSQL) - Data storage

**Key Connections:**
- Web App → Express Backend → Supabase Database
- Mobile Apps → Edge Functions → Supabase Database
- All apps use Supabase for real-time updates

**Why This Structure:**
- **Security**: Database credentials hidden in backend
- **Flexibility**: Easy to add business logic
- **Scalability**: Each layer can scale independently
- **Real-time**: Supabase provides instant updates
- **Mobile**: Edge Functions optimized for mobile

**Everything is connected and working together!**
