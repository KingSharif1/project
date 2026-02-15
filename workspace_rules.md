# Workspace Rules: CarFlow Transit (NEMT Project)

## 🌟 PROJECT NORTH STAR
**Goal**: Build a **100% production-ready** Non-Emergency Medical Transportation (NEMT) ecosystem that rivals industry standards (WellRyde, RouteGenie).

**Core Components**:
1.  **Web Dispatch Portal**: Real-time trip management, driver tracking, and billing.
2.  **Mobile Driver App**: Robust React Native app for trip execution (GPS, Signatures, Offline support).
3.  **Backend**: Scalable 3-tier architecture (Express API + Supabase).

**The "End Game"**: A system where a dispatcher can assign a trip, a driver receives it instantly, executes the full pickup/dropoff flow with compliance data (location, timestamp, signature), and the system automatically handles billing/reporting without manual intervention.

---

## 🛠️ SKILLS & TECH STACK (Strict Adherence)

### Frontend (Web)
*   **Framework**: React + Vite
*   **Language**: TypeScript (`.tsx`, `.ts`)
*   **Styling**: TailwindCSS (Utility classes only)
*   **State**: Context API (`AuthContext`, `AppContext`)

### Mobile (Driver/Patient Apps)
*   **Framework**: React Native + Expo
*   **Language**: JavaScript/TypeScript
*   **Maps**: `react-native-maps`
*   **Storage**: `AsyncStorage`

### Backend & Database
*   **API**: Express.js (Node.js)
*   **Database**: Supabase (PostgreSQL)
*   **ORM/Querying**: Supabase JS Client (v2 syntax)
*   **Auth**: Supabase Auth (JWT) + Custom Express Middleware

---

## 📋 WORKFLOWS

### 1. Component Reusability (DRY)
*   **Check First**: Before creating a new UI component, search `web/src/components` or `mobile/components`.
*   **Reuse**: If a similar component exists, modify it to support the new use case via props rather than duplicating it.
*   **Standardize**: Use consistent Tailwind styling (Retro macOS aesthetic where applicable).

### 2. Database Changes
*   **Migration-First**: All DB changes must be done via SQL migrations in `supabase/migrations`.
*   **Validation**: Always verify schema changes against `DRIVER_APP_REQUIREMENTS.md` to ensure we capture necessary compliance data (timestamps, GPS).

### 3. API Development
*   **Pattern**: Mobile App -> Express API -> Supabase.
*   **Security**: Always verify JWT tokens in Express middleware before processing requests.
