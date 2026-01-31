# 🚀 CarFlow Transit - Backend API

> Express.js backend API serving both web dashboard and mobile applications.

## 📋 Overview

This is the unified backend API that handles:
- **Web Authentication** - Admin and dispatcher login
- **Mobile Authentication** - Driver and patient login
- **Driver APIs** - Trip management and location tracking
- **Patient APIs** - Trip requests and viewing

**Key Features:**
- JWT-based authentication
- Role-based access control
- Password verification with bcrypt
- CORS support for web and mobile
- Request logging
- Health monitoring

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment Variables

Create `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secure-random-secret-here
JWT_EXPIRES_IN=7d
```

**Get Supabase Keys:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy `URL`, `anon key`, and `service_role key`

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start Development Server
```bash
npm run dev
```

✅ **Server running on:** http://localhost:3000

---

## 📡 API Endpoints

### 🌐 Web Authentication

#### `POST /api/auth/login`
Authenticate admin or dispatcher user.

**Request:**
```json
{
  "email": "admin@fwmc.com",
  "password": "Admin123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "25801b3f-e092-4cdb-a1bc-90cb5598774f",
    "email": "admin@fwmc.com",
    "fullName": "John Administrator",
    "firstName": "John",
    "lastName": "Administrator",
    "role": "admin",
    "clinicId": null,
    "isActive": true,
    "createdAt": "2026-01-05T07:13:43.375193+00:00",
    "updatedAt": "2026-01-05T07:13:43.375193+00:00"
  }
}
```

**Response (Error):**
```json
{
  "error": "Invalid credentials"
}
```

---

#### `POST /api/auth/logout`
Logout current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `GET /api/auth/me`
Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@fwmc.com",
    "fullName": "John Administrator",
    "role": "admin",
    "isActive": true
  }
}
```

---

### 📱 Mobile Authentication

#### `POST /api/mobile/auth/login`
Authenticate driver or patient user.

**Request:**
```json
{
  "email": "driver@example.com",
  "password": "password123",
  "userType": "driver"  // or "patient"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "profile": {
    "id": "uuid",
    "email": "driver@example.com",
    "name": "John Driver",
    "phone": "555-0123",
    "status": "active",
    "vehicle_id": "uuid"
  }
}
```

**Response (Error):**
```json
{
  "error": "Invalid credentials"
}
```

---

### 🚗 Driver APIs

#### `GET /api/mobile/driver/trips`
Get trips assigned to driver.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `driverId` (optional) - Driver ID (defaults to authenticated user)

**Response:**
```json
{
  "success": true,
  "trips": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "driver_id": "uuid",
      "pickup_address": "123 Main St",
      "dropoff_address": "456 Hospital Rd",
      "pickup_time": "2026-01-05T10:00:00Z",
      "status": "assigned",
      "patients": {
        "name": "Jane Patient",
        "phone": "555-0124"
      },
      "clinics": {
        "name": "City Hospital"
      }
    }
  ]
}
```

---

#### `POST /api/mobile/driver/trips/:tripId/status`
Update trip status.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "status": "in_progress"  // or "completed", "cancelled"
}
```

**Response:**
```json
{
  "success": true,
  "trip": {
    "id": "uuid",
    "status": "in_progress",
    "updated_at": "2026-01-05T10:05:00Z"
  }
}
```

---

#### `POST /api/mobile/driver/location`
Update driver's current location.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "driverId": "uuid",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Response:**
```json
{
  "success": true,
  "driver": {
    "id": "uuid",
    "current_latitude": 40.7128,
    "current_longitude": -74.0060,
    "last_location_update": "2026-01-05T10:10:00Z"
  }
}
```

---

### 🏥 Patient APIs

#### `GET /api/mobile/patient/trips`
Get trips for patient.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `patientId` (optional) - Patient ID (defaults to authenticated user)

**Response:**
```json
{
  "success": true,
  "trips": [
    {
      "id": "uuid",
      "pickup_address": "123 Home St",
      "dropoff_address": "456 Clinic Rd",
      "pickup_time": "2026-01-05T14:00:00Z",
      "status": "assigned",
      "drivers": {
        "name": "John Driver",
        "phone": "555-0123",
        "vehicle_number": "ABC-123"
      },
      "clinics": {
        "name": "City Clinic"
      }
    }
  ]
}
```

---

#### `POST /api/mobile/patient/trips`
Request a new trip.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "patientId": "uuid",
  "pickupAddress": "123 Home St",
  "dropoffAddress": "456 Clinic Rd",
  "appointmentTime": "2026-01-05T14:00:00Z",
  "notes": "Wheelchair accessible vehicle needed"
}
```

**Response:**
```json
{
  "success": true,
  "trip": {
    "id": "uuid",
    "patient_id": "uuid",
    "pickup_address": "123 Home St",
    "dropoff_address": "456 Clinic Rd",
    "pickup_time": "2026-01-05T14:00:00Z",
    "status": "pending",
    "notes": "Wheelchair accessible vehicle needed",
    "created_at": "2026-01-05T10:15:00Z"
  }
}
```

---

### 🏥 Health Check

#### `GET /health`
Check server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-05T10:20:00.000Z",
  "uptime": 3600
}
```

---

#### `GET /`
API information.

**Response:**
```json
{
  "message": "CarFlow Backend API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth/*",
    "mobile": "/api/mobile/*",
    "health": "/health"
  }
}
```

---

## 🔒 Security

### Authentication
- **JWT Tokens** - 7-day expiration by default
- **bcrypt** - Password hashing with salt
- **Service Role Key** - Admin database access (bypasses RLS)
- **Anon Key** - User authentication (respects RLS)

### Authorization
- **Role-based** - Admin, Dispatcher, Driver, Patient
- **Token Verification** - Middleware on protected routes
- **User Type** - Separate authentication for web vs mobile

### CORS
- **Web:** `http://localhost:5173` (Vite dev server)
- **Mobile:** `http://localhost:8081` (Expo dev server)
- **Production:** Configure allowed origins in deployment

### Logging
- Request logging with timestamps
- Error logging for debugging
- Audit trail in database

## 📁 Project Structure

```
server/
├── index.js              # Main Express server
│   ├── CORS configuration
│   ├── Middleware setup
│   ├── Route mounting
│   └── Error handling
│
├── routes/
│   ├── auth.js          # Web authentication
│   │   ├── POST /api/auth/login
│   │   ├── POST /api/auth/logout
│   │   └── GET  /api/auth/me
│   │
│   └── mobile.js        # Mobile endpoints
│       ├── POST /api/mobile/auth/login
│       ├── GET  /api/mobile/driver/trips
│       ├── POST /api/mobile/driver/trips/:id/status
│       ├── POST /api/mobile/driver/location
│       ├── GET  /api/mobile/patient/trips
│       └── POST /api/mobile/patient/trips
│
├── middleware/
│   └── auth.js          # JWT verification
│       ├── authenticateToken()
│       └── requireRole()
│
├── lib/
│   └── supabase.js      # Supabase clients
│       ├── supabase (service role)
│       └── supabaseAnon (anon key)
│
├── .env                 # Environment variables
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies
└── README.md           # This file
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Web Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fwmc.com","password":"Admin123!"}'
```

### Mobile Login (Driver)
```bash
curl -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@example.com","password":"password123","userType":"driver"}'
```

### Get Driver Trips
```bash
curl http://localhost:3000/api/mobile/driver/trips?driverId=<uuid> \
  -H "Authorization: Bearer <token>"
```

### Update Trip Status
```bash
curl -X POST http://localhost:3000/api/mobile/driver/trips/<tripId>/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

### Update Driver Location
```bash
curl -X POST http://localhost:3000/api/mobile/driver/location \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"driverId":"<uuid>","latitude":40.7128,"longitude":-74.0060}'
```

## 🚀 Deployment

### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Render
1. Connect GitHub repo
2. Set environment variables
3. Deploy

### Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
fly launch
```

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|----------|
| `SUPABASE_URL` | Supabase project URL | ✅ Yes | - |
| `SUPABASE_ANON_KEY` | Supabase anon key (for auth) | ✅ Yes | - |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (admin) | ✅ Yes | - |
| `PORT` | Server port | ❌ No | `3000` |
| `NODE_ENV` | Environment | ❌ No | `development` |
| `JWT_SECRET` | Secret for JWT signing (64+ chars) | ✅ Yes | - |
| `JWT_EXPIRES_IN` | JWT token expiration | ❌ No | `7d` |

## 🔧 Development

### Watch Mode
```bash
npm run dev
```

### Production
```bash
npm start
```

## 🚀 Deployment

### Railway
```bash
npm install -g @railway/cli
railway login
railway up
```

### Render
1. Connect GitHub repository
2. Set environment variables
3. Deploy from dashboard

### Heroku
```bash
heroku create carflow-api
heroku config:set SUPABASE_URL=...
heroku config:set SUPABASE_SERVICE_KEY=...
heroku config:set JWT_SECRET=...
git push heroku main
```

### Environment Variables (Production)
Ensure all required variables are set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `NODE_ENV=production`

---

## 🔧 Development

### Watch Mode (Auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Debugging
```bash
DEBUG=* npm run dev
```

---

## 📚 Related Documentation

- **[Root README](../README.md)** - Project overview
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - System architecture
- **[ROLES_AND_PERMISSIONS.md](../ROLES_AND_PERMISSIONS.md)** - Role-based access

---

## 🛣️ Roadmap

- [ ] Rate limiting (express-rate-limit)
- [ ] Request validation (Joi/Zod)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (New Relic)
- [ ] Caching layer (Redis)
- [ ] WebSocket support for real-time
- [ ] GraphQL endpoint

---

**Built with ❤️ for CarFlow Transit**
