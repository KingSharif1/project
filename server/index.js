import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import mobileRoutes from './routes/mobile.js';
import driversRoutes from './routes/drivers.js';
import vehiclesRoutes from './routes/vehicles.js';
import patientsRoutes from './routes/patients.js';
import tripsRoutes from './routes/trips.js';
import clinicsRoutes from './routes/clinics.js';
import contractorsRoutes from './routes/contractors.js';
import tripSourcesRoutes from './routes/tripSources.js';
import usersRoutes from './routes/users.js';
import notificationsRoutes from './routes/notifications.js';
import trackingRoutes from './routes/tracking.js';
import earningsRoutes from './routes/earnings.js';
import auditRoutes from './routes/audit.js';
import settingsRoutes from './routes/settings.js';
import uploadsRoutes from './routes/uploads.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8081', 'http://127.0.0.1:56055', 'exp://127.0.0.1:8081', 'http://192.168.1.132:8081', 'exp://192.168.1.132:8081'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'CarFlow Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      mobile: '/api/mobile/*',
      health: '/health'
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/clinics', clinicsRoutes);
app.use('/api/contractors', contractorsRoutes);
app.use('/api/trip-sources', tripSourcesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/uploads', uploadsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CarFlow Backend API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`📱 Mobile endpoints: http://localhost:${PORT}/api/mobile/*`);
});
