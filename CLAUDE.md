# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CarFlow Transit is a complete Non-Emergency Medical Transportation (NEMT) management system with three main components:
1. **Web Dashboard** (React + TypeScript + Vite) - Admin/dispatcher interface at localhost:5173
2. **Mobile Apps** (React Native + Expo) - Driver and patient applications
3. **Backend API** (Express.js) - REST API at localhost:3000
4. **Database** (Supabase PostgreSQL) - 79 migrations defining schema with real-time subscriptions and RLS

## Development Commands

### Backend Server
```bash
cd server
npm run dev        # Start development server with nodemon (port 3000)
npm start          # Start production server
```

### Web Dashboard
```bash
cd web
npm run dev        # Start Vite dev server (port 5173)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking
```

### Mobile Apps
```bash
cd mobile
npm start                    # Start Expo dev server
npx expo start               # Alternative start command
npx expo start --clear       # Start with cache cleared
npm run android              # Run on Android
npm run ios                  # Run on iOS
npm run web                  # Run in web browser
```

### Testing
```bash
# Backend health check
curl http://localhost:3000/health

# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fwmc.com","password":"Admin123!"}'
```

## Architecture Overview

### 3-Tier Architecture
```
Web/Mobile Apps → Express Backend → Supabase Database
                  (JWT Auth)        (PostgreSQL + RLS)
```

### Authentication Flow
- **Web**: Login → Express `/api/auth/login` → JWT token → Stored in localStorage
- **Mobile**: Login → Express `/api/mobile/auth/login` → JWT token → Stored in AsyncStorage
- **Token Format**: JWT containing `{ userId, email, role }` signed with `JWT_SECRET`, expires in 7 days
- **Password Verification**: Express calls Supabase function `verify_user_password()` which uses bcrypt
- **Authorization**: JWT middleware in `server/middleware/auth.js` verifies tokens on protected routes

### Database Architecture
- **79 SQL migration files** in `supabase/migrations/` define complete schema
- **Key tables**: `users`, `drivers`, `patients`, `trips`, `clinics`, `vehicles`, `activity_log`, `contractors`, `trip_sources`
- **Row Level Security (RLS)** enforces data access based on user roles and clinic assignment
- **Real-time subscriptions** broadcast changes instantly to all connected clients
- **Audit trail** via `activity_log` table for HIPAA compliance

### API Structure
- **Web endpoints**: `/api/auth/*`, `/api/trips/*`, `/api/drivers/*`, `/api/patients/*`, etc.
- **Mobile endpoints**: `/api/mobile/auth/*`, `/api/mobile/driver/*`, `/api/mobile/patient/*`
- **All API routes** mounted in `server/index.js` with JWT middleware protection
- **17 route modules** in `server/routes/`: auth, mobile, drivers, vehicles, patients, trips, clinics, contractors, tripSources, users, notifications, tracking, earnings, audit, settings, uploads, messages

### State Management (Web)
- **AuthContext** (`web/src/context/AuthContext.tsx`):
  - Manages user authentication state
  - Provides role-based permission helpers (isSuperAdmin, isAdmin, isDispatcher, etc.)
  - Handles session timeout and brute force protection
  - Stores user and token in localStorage
- **AppContext** (`web/src/context/AppContext.tsx`):
  - Manages application data (trips, drivers, patients, clinics, etc.)
  - Uses Supabase client directly for real-time subscriptions
  - Filters data based on user role and clinic assignment

### Mobile App Architecture
- **DriverApp.js**: Main driver application entry point
- **PatientApp.js**: Main patient application entry point
- **services/api.js**: API client that communicates with Express backend
- **AsyncStorage**: Persists auth tokens and user profile
- **React Navigation**: Bottom tabs and stack navigation
- **Real-time location tracking** via expo-location and expo-task-manager

## User Roles & Permissions

### Role Hierarchy
1. **Superadmin**: Platform owner, manages all clinics and companies
2. **Admin**: Company admin, manages their own company/clinic
3. **Dispatcher**: Company-level dispatcher (no contractorId)
4. **Contractor Dispatcher**: Contractor-level dispatcher (has contractorId set)
5. **Driver**: Mobile app user, executes trips
6. **Patient**: Mobile app user, requests rides

### Permission Model
- **Super Admin**: Full system access, can create/manage clinics and companies
- **Admin**: Full access within their clinic (clinicId), cannot see other clinics
- **Regular Dispatcher**: Manages trips/drivers within their clinic, limited admin functions
- **Contractor Dispatcher**: Limited to their contractor's data (contractorId filter)
- **Role checks** implemented in `AuthContext` as computed properties

## Key Files and Patterns

### Type Definitions
- **Single source of truth**: `web/src/types/index.ts` defines all TypeScript interfaces
- **Key types**: User, Driver, Patient, Trip, Clinic, Contractor, Vehicle, TripSource, Invoice
- **Naming convention**: PascalCase for types, camelCase for properties

### API Client Pattern
- **Web**: `web/src/services/api.ts` - exports async functions that call Express endpoints
- **Mobile**: `mobile/services/api.js` - similar pattern for mobile apps
- **Headers**: Always include `Authorization: Bearer ${token}` for protected routes
- **Error handling**: API functions return `{ success, data/error }` format

### Component Organization (Web)
- `web/src/components/` contains 30+ components
- Main features: `TripManagement.tsx`, `DriverManagement.tsx`, `DriverProfilePage.tsx`, `Reports.tsx`, `UpcomingReminders.tsx`
- **Pattern**: Components use hooks (useAuth, useApp) to access context
- **Styling**: TailwindCSS utility classes, retro macOS aesthetic

### Real-time Updates
- Web app subscribes to Supabase channels for live updates
- Pattern: `supabase.channel('table_name').on('postgres_changes', ...).subscribe()`
- Database changes trigger events → Supabase broadcasts → All subscribers update UI
- Used for: Trip status changes, driver location updates, new trip requests

## Database Conventions

### Naming Standards
- **Tables**: Lowercase with underscores (e.g., `trip_sources`, `activity_log`)
- **Columns**: Snake_case (e.g., `created_at`, `clinic_id`, `driver_payout`)
- **Foreign keys**: Typically `{table}_id` (e.g., `driver_id`, `patient_id`, `clinic_id`)
- **Timestamps**: All tables have `created_at` and `updated_at` (timestamptz)

### Migration Workflow
- **Never modify existing migrations** - always create new ones
- **Naming**: `YYYYMMDDHHMMSS_description.sql` format
- **Location**: `supabase/migrations/`
- **Apply**: Run in Supabase Dashboard SQL Editor or use `supabase db push`

## Environment Variables

### Required for Backend (`server/.env`)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secure-random-secret-64-chars
JWT_EXPIRES_IN=7d
```

### Required for Web (`web/.env.local`)
```
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Required for Mobile (`mobile/.env`)
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Important Implementation Notes

### When Adding New Features
1. **Check existing components** in `web/src/components/` before creating new ones
2. **Reuse types** from `web/src/types/index.ts` - don't duplicate interfaces
3. **Follow authentication pattern**: Always verify user role/permissions before actions
4. **Add audit logging** for important actions (use `logAudit()` utility)
5. **Consider real-time** requirements - subscribe to Supabase channels if needed

### When Modifying Database
1. **Create new migration** in `supabase/migrations/` with timestamp prefix
2. **Update TypeScript types** in `web/src/types/index.ts` to match schema
3. **Add RLS policies** if creating new tables to enforce data access control
4. **Test with different roles** (superadmin, admin, dispatcher) to verify permissions

### When Adding API Endpoints
1. **Create/modify route file** in `server/routes/`
2. **Mount in** `server/index.js`
3. **Add JWT middleware** for protected routes (import from `server/middleware/auth.js`)
4. **Update API client** (`web/src/services/api.ts` or `mobile/services/api.js`)
5. **Handle errors** consistently - return `{ success: false, error: 'message' }`

### Security Considerations
- **Never expose Supabase service key** to frontend - only use anon key
- **Always validate JWT tokens** on backend before database operations
- **Use RLS policies** as second layer of defense at database level
- **Hash passwords** with bcrypt - never store plain text
- **Validate input** on both frontend and backend
- **Audit sensitive operations** to `activity_log` table

### Styling Standards (Web)
- **Use TailwindCSS** utility classes exclusively - avoid custom CSS
- **Retro macOS aesthetic** where applicable (from workspace_rules.md)
- **Responsive design** - test at mobile, tablet, desktop widths
- **Lucide React** for icons - consistent icon set

### Mobile Development Notes
- **Test on real device** via Expo Go for location and native features
- **Handle offline scenarios** - mobile apps should gracefully degrade without connection
- **AsyncStorage** for persistence - always try/catch storage operations
- **Location permissions** required for driver app - request on first use
- **Signature capture** uses react-native-signature-canvas component

## Common Workflows

### Creating a Trip (Web)
1. Dispatcher opens TripManagement.tsx
2. Fills form with pickup/dropoff, patient info, service level
3. AppContext.addTrip() calls Supabase insert
4. Database triggers real-time event
5. Driver app receives notification (if assigned)
6. Activity logged to audit trail

### Driver Completing Trip (Mobile)
1. Driver taps "Complete Trip" in DriverApp
2. api.updateTripStatus() calls `/api/mobile/driver/trips/:id/status`
3. Express backend updates database
4. Real-time event broadcasts to web dashboard
5. Billing calculation triggered automatically
6. Driver payout record created

### Auto-Assignment Algorithm
- Located in `web/src/utils/driverAutoAssignment.ts`
- Scores drivers based on: distance, service level match, availability, rating
- Superadmin and Admin can auto-assign trips
- Considers wheelchair/stretcher requirements

## Testing Credentials

### Web Dashboard
- Email: `admin@fwmc.com`
- Password: `Admin123!`

## Documentation References
- **ARCHITECTURE.md**: Detailed system architecture and data flow
- **ROLES_AND_PERMISSIONS.md**: Complete role-based access control documentation
- **DATABASE_SETUP_GUIDE.md**: Database setup instructions
- **DRIVER_APP_REQUIREMENTS.md**: Mobile driver app compliance requirements
- **workspace_rules.md**: Project goals and development workflows
