# 🚗 CarFlow Transit - Medical Transportation Management System

> Complete transportation management solution for medical facilities, drivers, and patients.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [User Roles](#user-roles)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

CarFlow Transit is a comprehensive medical transportation management system designed for:

- **Medical Facilities** - Schedule and manage patient transportation
- **Dispatchers** - Coordinate trips and assign drivers
- **Drivers** - View assignments and update trip status
- **Patients** - Request rides and track appointments

**Key Capabilities:**
- Real-time trip tracking and driver location
- Multi-facility support with role-based access
- HIPAA-compliant audit logging
- Automated billing and driver payouts
- Mobile apps for drivers and patients
- Web dashboard for administrators and dispatchers

---

## ✨ Features

### 🌐 Web Dashboard
- **Trip Management** - Create, assign, and track trips
- **Driver Management** - Manage driver profiles, availability, and performance
- **Facility Management** - Multi-clinic support with separate billing
- **Real-time Tracking** - Live driver locations and trip status
- **Billing & Reports** - Automated invoicing and custom reports
- **Activity Logging** - HIPAA-compliant audit trail
- **User Management** - Role-based access control (Admin/Dispatcher)

### 📱 Mobile Apps
- **Driver App**
  - View assigned trips
  - Update trip status (start, complete, cancel)
  - GPS location sharing
  - Trip history and earnings

- **Patient App**
  - Request transportation
  - View upcoming appointments
  - Track driver location
  - Trip history

### 🔐 Security & Compliance
- JWT-based authentication
- Role-based access control (RBAC)
- HIPAA-compliant audit logging
- Secure password hashing (bcrypt)
- Row-level security (RLS) in database

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  ┌──────────────────┐       ┌──────────────────────┐   │
│  │  Web Dashboard   │       │   Mobile Apps        │   │
│  │  (React + Vite)  │       │  (React Native)      │   │
│  │  localhost:5173  │       │  - Driver App        │   │
│  │                  │       │  - Patient App       │   │
│  └────────┬─────────┘       └──────────┬───────────┘   │
└───────────┼────────────────────────────┼───────────────┘
            │                            │
            ↓                            ↓
┌─────────────────────────────────────────────────────────┐
│              BACKEND API LAYER                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │     Express.js Server (localhost:3000)            │  │
│  │  • Web Auth: /api/auth/*                          │  │
│  │  • Mobile Auth: /api/mobile/auth/*                │  │
│  │  • Driver APIs: /api/mobile/driver/*              │  │
│  │  • Patient APIs: /api/mobile/patient/*            │  │
│  │  • JWT Authentication                             │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              DATABASE LAYER                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Supabase PostgreSQL (Cloud)                      │  │
│  │  • 28+ tables (users, trips, drivers, etc.)       │  │
│  │  • Real-time subscriptions                        │  │
│  │  • Row-level security (RLS)                       │  │
│  │  • 79 migration files                             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User interacts with Web/Mobile app
2. App sends request to Express backend
3. Backend authenticates with JWT
4. Backend queries Supabase database
5. Real-time updates broadcast to all connected clients

---

## 📂 Project Structure

```
project/
├── supabase/              # Database schema & migrations
│   └── migrations/        # 79 SQL files defining database structure
│
├── server/                # Express.js Backend API
│   ├── routes/
│   │   ├── auth.js        # Web authentication endpoints
│   │   └── mobile.js      # Mobile app endpoints
│   ├── middleware/
│   │   └── auth.js        # JWT verification middleware
│   ├── lib/
│   │   └── supabase.js    # Supabase client configuration
│   ├── index.js           # Main server file
│   ├── .env               # Environment variables
│   └── package.json       # Dependencies
│
├── web/                   # React Web Dashboard
│   ├── src/
│   │   ├── components/    # UI components (30+)
│   │   ├── context/       # React Context (Auth, App state)
│   │   ├── services/      # API client
│   │   ├── lib/           # Supabase client
│   │   ├── utils/         # Utilities
│   │   └── types/         # TypeScript types
│   ├── .env.local         # Environment variables
│   └── package.json       # Dependencies
│
├── mobile/                # React Native Mobile Apps
│   ├── DriverApp.js       # Driver application
│   ├── PatientApp.js      # Patient application
│   ├── services/
│   │   └── api.js         # API client
│   └── package.json       # Dependencies
│
├── ARCHITECTURE.md        # Complete architecture guide
├── ROLES_AND_PERMISSIONS.md  # Role-based access documentation
└── README.md              # This file
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Supabase Account** ([Sign up](https://supabase.com/))

### 1. Clone Repository
```bash
git clone <repository-url>
cd project
```

### 2. Start Backend Server
```bash
cd server
npm install
cp .env.example .env  # Create .env file
# Edit .env with your Supabase credentials
npm run dev
```
**Backend runs on:** http://localhost:3000

### 3. Start Web Dashboard
```bash
cd web
npm install
cp .env.example .env.local  # Create .env.local file
# Edit .env.local with your configuration
npm run dev
```
**Web app runs on:** http://localhost:5173

### 4. Start Mobile Apps (Optional)
```bash
cd mobile
npm install
npx expo start
```
**Scan QR code** with Expo Go app on your phone

---

## 🔧 Detailed Setup

### Backend Server Setup

1. **Navigate to server directory:**
   ```bash
   cd server
   npm install
   ```

2. **Create `.env` file:**
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

3. **Get Supabase Keys:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings → API
   - Copy `URL`, `anon key`, and `service_role key`

4. **Generate JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. **Start server:**
   ```bash
   npm run dev
   ```

### Web Dashboard Setup

1. **Navigate to web directory:**
   ```bash
   cd web
   npm install
   ```

2. **Create `.env.local` file:**
   ```env
   # Backend API
   VITE_API_URL=http://localhost:3000/api

   # Supabase (for direct database access)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Login credentials:**
   - Email: `admin@fwmc.com`
   - Password: `Admin123!`

### Mobile Apps Setup

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   npm install
   ```

2. **Create `.env` file:**
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Start Expo:**
   ```bash
   npx expo start
   ```

4. **Run on device:**
   - Install **Expo Go** app on your phone
   - Scan QR code from terminal
   - Or press `w` to run in web browser

### Database Setup

1. **Create Supabase Project:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Choose organization and region

2. **Run Migrations:**
   - Go to SQL Editor in Supabase Dashboard
   - Run each migration file from `supabase/migrations/` in order
   - Or use Supabase CLI:
     ```bash
     supabase db push
     ```

3. **Create Admin User:**
   - Run the password verification function migration
   - Create admin user in `auth.users` and `public.users` tables

---

## 👥 User Roles

### Admin
- **Access:** Full system access
- **Can See:** All facilities, trips, drivers, patients, billing
- **Can Do:**
  - Manage all facilities
  - Create/edit/delete trips for any clinic
  - Manage drivers and vehicles
  - Create user accounts
  - Access HIPAA compliance reports
  - Generate system-wide reports
  - Auto-assign drivers

### Dispatcher
- **Access:** Limited to assigned facility
- **Can See:** Only their facility's data
- **Can Do:**
  - Create/edit trips for their facility
  - Assign drivers (from their facility's pool)
  - View driver information
  - Generate reports for their facility
- **Cannot Do:**
  - Manage other facilities
  - Create user accounts
  - Access HIPAA compliance
  - See system-wide data

**For detailed role permissions, see:** [`ROLES_AND_PERMISSIONS.md`](ROLES_AND_PERMISSIONS.md)

---

## 📚 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture and data flow
- **[ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md)** - Detailed role-based access control
- **[server/README.md](server/README.md)** - Backend API documentation
- **[web/README.md](web/README.md)** - Web dashboard documentation
- **[mobile/README.md](mobile/README.md)** - Mobile apps documentation

---

## 🛠️ Tech Stack

### Frontend (Web)
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Lucide React** - Icons
- **React Context** - State management

### Frontend (Mobile)
- **React Native** - Mobile framework
- **Expo** - Development platform
- **AsyncStorage** - Local storage

### Backend
- **Node.js 18+** - Runtime
- **Express.js** - Web framework
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin requests

### Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Database
- **Real-time** - Live updates
- **Row Level Security** - Data access control

---

## 🔑 Environment Variables

### Backend (`server/.env`)
```env
SUPABASE_URL=              # Supabase project URL
SUPABASE_ANON_KEY=         # Supabase anon key
SUPABASE_SERVICE_KEY=      # Supabase service role key
PORT=3000                  # Server port
NODE_ENV=development       # Environment
JWT_SECRET=                # JWT signing secret (64+ chars)
JWT_EXPIRES_IN=7d          # Token expiration
```

### Web (`web/.env.local`)
```env
VITE_API_URL=              # Backend API URL
VITE_SUPABASE_URL=         # Supabase project URL
VITE_SUPABASE_ANON_KEY=    # Supabase anon key
```

### Mobile (`mobile/.env`)
```env
EXPO_PUBLIC_API_URL=       # Backend API URL
EXPO_PUBLIC_SUPABASE_URL=  # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
```

---

## 🧪 Testing

### Backend API
```bash
cd server

# Health check
curl http://localhost:3000/health

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fwmc.com","password":"Admin123!"}'
```

### Web Dashboard
1. Open http://localhost:5173
2. Login with `admin@fwmc.com` / `Admin123!`
3. Navigate through dashboard features

### Mobile Apps
1. Start Expo: `npx expo start`
2. Scan QR code with Expo Go
3. Test driver/patient login

---

## 🚀 Deployment

### Backend (Express)
- **Recommended:** Railway, Render, Heroku, AWS EC2
- Set environment variables in hosting platform
- Ensure `NODE_ENV=production`

### Web Dashboard
- **Recommended:** Vercel, Netlify, Cloudflare Pages
- Build command: `npm run build`
- Output directory: `dist`
- Set environment variables in hosting platform

### Mobile Apps
- **iOS:** Build with EAS Build, submit to App Store
- **Android:** Build APK/AAB, submit to Google Play
- See [Expo documentation](https://docs.expo.dev/)

### Database
- Already hosted on Supabase Cloud
- Ensure production environment variables are set
- Enable database backups

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation:** See `ARCHITECTURE.md` and `ROLES_AND_PERMISSIONS.md`
- **Email:** support@carflow.com

---

## 🎯 Roadmap

- [ ] SMS notifications for trip updates
- [ ] Email notifications for dispatchers
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Offline mode for mobile apps
- [ ] Integration with mapping services (Google Maps, Mapbox)
- [ ] Automated driver assignment algorithm
- [ ] Patient feedback system

---

**Built with ❤️ for medical transportation management**
