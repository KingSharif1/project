# NEMT Driver App Requirements

## Overview
The driver app is a React Native mobile application for NEMT (Non-Emergency Medical Transportation) drivers. It provides trip management, real-time communication with dispatchers, and compliance tracking.

---

## Core Sections

### 1. **Trips Section** (Most Important)
The main screen showing assigned trips with the following views:
- **Today's Trips** - Active trips for the current day
- **Upcoming Trips** - Future scheduled trips
- **Trip History** - Completed/past trips

### 2. **Messages Section**
Real-time messaging with dispatchers/admins:
- Chat interface with dispatcher
- Push notifications for new messages
- Read receipts

### 3. **Vehicle Section**
- Assigned vehicle details (make, model, plate)
- Pre-trip and post-trip checklists
- Vehicle inspection reports
- Mileage tracking

### 4. **Profile Section**
- Driver information (name, photo, contact)
- License & certification status
- Document expiry alerts
- Availability settings (available, busy, offline)

### 5. **Settings Section**
- Notification preferences
- App settings
- Logout

---

## Trip Process Flow (Critical)

Based on industry standards (WellRyde, RouteGenie, NEMT Platform), here's the complete trip workflow:

### Status Flow:
```
ASSIGNED → EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → PASSENGER_PICKED_UP → EN_ROUTE_TO_DROPOFF → ARRIVED_AT_DROPOFF → COMPLETED
```

### Detailed Steps:

#### Step 1: **Trip Assigned**
- Driver receives push notification
- Trip appears in "Today's Trips" list
- Shows: Patient name, pickup address, dropoff address, scheduled time, mobility type
- Driver can view full trip details

#### Step 2: **Start Trip / En Route to Pickup**
- Driver taps "Start Trip" or "On My Way"
- Status changes to `en_route_to_pickup`
- Timestamp recorded
- GPS tracking begins
- Optional: Auto-call to patient "Driver is on the way"

#### Step 3: **Arrived at Pickup**
- Driver taps "Arrived"
- Status changes to `arrived_at_pickup`
- Timestamp recorded
- GPS location verified
- Timer starts (for wait time tracking)

#### Step 4: **Contact Patient** (Optional)
- Driver can tap "Call Patient" button
- Call logged in system
- If no-show after X minutes, driver can mark as "No Show"

#### Step 5: **Passenger Picked Up**
- Driver taps "Picked Up" or "Start Ride"
- Status changes to `in_progress` or `passenger_picked_up`
- Timestamp recorded
- Odometer reading (optional)
- **For wheelchair trips**: Safety checklist required
  - Wheelchair secured
  - Seatbelt fastened
  - Ramp lifted

#### Step 6: **En Route to Dropoff**
- GPS tracking continues
- ETA displayed
- Turn-by-turn navigation available

#### Step 7: **Arrived at Destination**
- Driver taps "Arrived at Destination"
- Status changes to `arrived_at_dropoff`
- Timestamp recorded
- GPS location verified

#### Step 8: **Trip Completed**
- Driver taps "Complete Trip" or "Drop Off Complete"
- Status changes to `completed`
- Timestamp recorded
- Odometer reading (optional)
- **Signature capture** (patient signs on screen)
- Trip summary displayed

### Special Statuses:
- **No Show** - Patient not present after waiting period
- **Cancelled** - Trip cancelled by dispatcher/patient
- **Will Call** - Waiting for patient to call for return trip

---

## Data Collected Per Trip

| Data Point | When Collected | Purpose |
|------------|----------------|---------|
| GPS Location | Continuous | Real-time tracking |
| Timestamps | Each status change | Compliance, billing |
| Odometer | Start/End of trip | Mileage billing |
| Patient Signature | Trip completion | Proof of service |
| Photos | As needed | Documentation |
| Safety Checklist | Before pickup (wheelchair) | Compliance |

---

## Push Notifications

Drivers should receive notifications for:
- New trip assigned
- Trip updated/changed
- Trip cancelled
- Message from dispatcher
- Upcoming trip reminder (15 min before)
- Document expiring soon

---

## Offline Capability

The app should:
- Cache trip data for offline access
- Queue status updates when offline
- Sync when connection restored
- Store GPS breadcrumbs locally

---

## UI/UX Guidelines

### Trip Card Display:
```
┌─────────────────────────────────────┐
│ Trip #TRP-2026-001        10:30 AM  │
│ ─────────────────────────────────── │
│ 📍 Pickup: 123 Main St, Dallas TX   │
│ 🏥 Dropoff: Medical Center, 456 Elm │
│ ─────────────────────────────────── │
│ 👤 Marcus Thompson                  │
│ ♿ Wheelchair | 🚗 Ford Transit      │
│ ─────────────────────────────────── │
│ [    START TRIP    ]                │
└─────────────────────────────────────┘
```

### Action Buttons (contextual based on status):
- **Assigned**: "Start Trip" (blue)
- **En Route**: "Arrived" (blue)
- **At Pickup**: "Picked Up" / "No Show" (green/red)
- **In Progress**: "Arrived at Destination" (blue)
- **At Dropoff**: "Complete Trip" (green)

---

## Database Schema Updates Needed

Add to `trips` table:
```sql
-- Trip status timestamps
pickup_started_at TIMESTAMPTZ,
arrived_at_pickup_at TIMESTAMPTZ,
passenger_picked_up_at TIMESTAMPTZ,
arrived_at_dropoff_at TIMESTAMPTZ,
completed_at TIMESTAMPTZ,

-- Odometer readings
odometer_start INTEGER,
odometer_end INTEGER,

-- Signature
signature_url TEXT,
signature_captured_at TIMESTAMPTZ,

-- GPS breadcrumbs stored separately in trip_locations table
```

New `trip_locations` table:
```sql
CREATE TABLE trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  accuracy DECIMAL(6, 2)
);
```

---

## API Endpoints Needed

```
POST /api/mobile/trips/:id/start          - Start trip (en route to pickup)
POST /api/mobile/trips/:id/arrived-pickup - Arrived at pickup
POST /api/mobile/trips/:id/pickup         - Passenger picked up
POST /api/mobile/trips/:id/arrived-dropoff - Arrived at dropoff
POST /api/mobile/trips/:id/complete       - Complete trip
POST /api/mobile/trips/:id/no-show        - Mark as no-show
POST /api/mobile/trips/:id/location       - Update GPS location
POST /api/mobile/trips/:id/signature      - Upload signature
GET  /api/mobile/trips/today              - Get today's trips
GET  /api/mobile/trips/upcoming           - Get upcoming trips
GET  /api/mobile/messages                 - Get messages
POST /api/mobile/messages                 - Send message
```

---

## Priority Implementation Order

1. **Phase 1**: Trip list & basic status updates
2. **Phase 2**: GPS tracking & location updates
3. **Phase 3**: Messaging with dispatcher
4. **Phase 4**: Signature capture
5. **Phase 5**: Safety checklists
6. **Phase 6**: Offline support

---

## Comparison with Industry Apps

| Feature | WellRyde | RouteGenie | Our App |
|---------|----------|------------|---------|
| Real-time manifest | ✅ | ✅ | ✅ |
| GPS tracking | ✅ | ✅ | ✅ |
| Signature capture | ✅ | ✅ | ✅ |
| Safety checklists | ✅ | ✅ | ✅ |
| Offline mode | ✅ | ✅ | ✅ |
| Auto-call patient | ✅ | ✅ | 🔜 |
| Payment collection | ✅ | ✅ | 🔜 |
| Turn-by-turn nav | ✅ | ✅ | 🔜 |

---

## Notes

- The app should be simple and driver-friendly
- Large buttons for easy tapping while on the go
- Minimal data entry required
- Focus on the trip execution flow
- Real-time sync with dispatcher portal
