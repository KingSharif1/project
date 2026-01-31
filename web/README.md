# 🌐 CarFlow Transit - Web Dashboard

> React + TypeScript web application for managing medical transportation operations.

## 📋 Overview

The web dashboard is the primary interface for administrators and dispatchers to manage:
- **Trip Management** - Schedule, assign, and track patient transportation
- **Driver Management** - Manage driver profiles, availability, and performance
- **Facility Management** - Multi-clinic support with role-based access
- **Billing & Reports** - Automated invoicing and custom analytics
- **Real-time Tracking** - Live driver locations and trip status updates
- **Activity Logging** - HIPAA-compliant audit trail

**User Roles:**
- **Admin** - Full system access across all facilities
- **Dispatcher** - Limited to their assigned facility

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd web
npm install
```

### 2. Configure Environment
Create `.env.local` file:

```env
# Backend API
VITE_API_URL=http://localhost:3000/api

# Supabase (for direct database access)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start Development Server
```bash
npm run dev
```

✅ **App running on:** http://localhost:5173

### 4. Login
- **Email:** `admin@fwmc.com`
- **Password:** `Admin123!`

---

## ✨ Features

### 🎯 Dashboard
- Real-time statistics (active trips, available drivers, revenue)
- Active trip monitoring
- Driver leaderboard
- Quick actions (create trip, add driver, assign trips)
- Document expiration alerts

### 🚗 Trip Management
- Create and schedule trips
- Assign drivers to trips
- Track trip status (pending, assigned, in progress, completed)
- Real-time location tracking
- Trip history and filtering
- Bulk import from Excel/CSV
- Export trip data

### 👨‍✈️ Driver Management
- Driver profiles with contact info
- Vehicle assignments
- Availability tracking
- Performance metrics
- Payout management
- Document tracking (license, insurance)

### 🏥 Facility Management
- Multi-clinic support
- Separate billing per facility
- Facility-specific dispatchers
- Custom configurations

### 💰 Billing & Reports
- Automated invoice generation
- Driver payout calculations
- Custom report builder
- Date range filtering
- Export to PDF/Excel

### 📊 Analytics
- Trip statistics
- Driver performance
- Revenue tracking
- Facility comparisons
- Custom date ranges

### 🔐 Security & Compliance
- Role-based access control
- HIPAA-compliant audit logging
- Session management
- Brute force protection
- Activity tracking

---

## 📂 Project Structure

```
web/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── TripManagement.tsx
│   │   ├── DriverManagement.tsx
│   │   ├── FacilityManagement.tsx
│   │   ├── Billing.tsx
│   │   ├── Reports.tsx
│   │   ├── ActivityTracker.tsx
│   │   ├── HIPAACompliance.tsx
│   │   └── ... (30+ components)
│   │
│   ├── context/             # React Context
│   │   ├── AuthContext.tsx  # Authentication state
│   │   └── AppContext.tsx   # Application state
│   │
│   ├── services/            # API clients
│   │   └── api.ts           # Backend API client
│   │
│   ├── lib/                 # Libraries
│   │   └── supabase.ts      # Supabase client
│   │
│   ├── utils/               # Utilities
│   │   ├── auditLog.ts      # Audit logging
│   │   ├── bruteForceProtection.ts
│   │   ├── sessionTimeout.ts
│   │   └── ...
│   │
│   ├── types/               # TypeScript types
│   │   └── index.ts         # Type definitions
│   │
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
│
├── public/                  # Static assets
├── .env.local              # Environment variables
├── index.html              # HTML template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite config
└── README.md               # This file
```

---

## 🎨 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS
- **Lucide React** - Icon library
- **React Context** - State management
- **Supabase** - Real-time database
- **SheetJS (xlsx)** - Excel import/export
- **Google Maps API** - Location services

---

## 🔧 Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Login with admin credentials
- [ ] Login with dispatcher credentials
- [ ] Logout functionality
- [ ] Session timeout
- [ ] Brute force protection

**Trip Management:**
- [ ] Create new trip
- [ ] Assign driver to trip
- [ ] Update trip status
- [ ] View trip details
- [ ] Filter trips by date/status
- [ ] Import trips from Excel
- [ ] Export trip data

**Driver Management:**
- [ ] Add new driver
- [ ] Edit driver profile
- [ ] Assign vehicle
- [ ] Track driver location
- [ ] View driver performance

**Real-time Features:**
- [ ] Live trip status updates
- [ ] Driver location tracking
- [ ] Automatic dashboard refresh

---

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | ✅ Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | ✅ Yes |

---

## 🚀 Deployment

### Vercel
```bash
npm install -g vercel
vercel login
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Build Settings
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** 18+

### Environment Variables (Production)
Set these in your hosting platform:
- `VITE_API_URL` - Your production backend URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key

---

## 👥 User Roles

### Admin
- Full access to all features
- Can manage all facilities
- Can create user accounts
- Access to HIPAA compliance reports
- System-wide analytics

### Dispatcher
- Limited to assigned facility
- Can manage trips for their facility
- Can assign drivers
- Cannot create users
- Cannot access HIPAA compliance

**For detailed permissions, see:** [`ROLES_AND_PERMISSIONS.md`](../ROLES_AND_PERMISSIONS.md)

---

## 📱 Pages & Components

### Dashboard
Main overview with statistics, active trips, and quick actions.

### Trip Management
Complete trip lifecycle management with filtering and real-time updates.

### Driver Management
Driver profiles, availability, performance tracking, and payouts.

### Facility Management
Multi-clinic configuration and management (Admin only).

### Billing
Automated invoicing, driver payouts, and financial reports.

### Reports
Custom report builder with date ranges and export options.

### Activity Log
HIPAA-compliant audit trail of all system activities.

### HIPAA Compliance
Security and compliance monitoring (Admin only).

---

## 🔌 API Integration

The web app communicates with the Express backend via REST API:

```typescript
// Login
const response = await api.login(email, password);

// Get current user
const user = await api.getCurrentUser(token);

// Logout
await api.logout(token);
```

Direct database access via Supabase client for:
- Real-time subscriptions
- Trip data queries
- Driver information
- Facility data

---

## 🎯 Key Features Explained

### Real-time Updates
Uses Supabase real-time subscriptions to automatically update:
- Trip status changes
- Driver location updates
- New trip assignments

### Role-Based Access
Components conditionally render based on user role:
```typescript
const { isAdmin } = useAuth();

{isAdmin && (
  <AdminOnlyFeature />
)}
```

### Session Management
- Auto-logout after 30 minutes of inactivity
- Session warning at 25 minutes
- Extend session option

### Brute Force Protection
- Max 5 login attempts
- 15-minute lockout after failed attempts
- Countdown timer display

---

## 📚 Related Documentation

- **[Root README](../README.md)** - Project overview
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - System architecture
- **[ROLES_AND_PERMISSIONS.md](../ROLES_AND_PERMISSIONS.md)** - Role permissions
- **[server/README.md](../server/README.md)** - Backend API docs

---

## 🛣️ Roadmap

- [ ] Dark mode support
- [ ] Mobile-responsive improvements
- [ ] Advanced filtering options
- [ ] Customizable dashboard widgets
- [ ] Email notifications
- [ ] SMS integration
- [ ] Multi-language support
- [ ] Offline mode with sync

---

**Built with ❤️ for CarFlow Transit**
