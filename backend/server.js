import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import financeRoutes from './routes/finance.js';
import authRoutes from './routes/auth.js';
import prescriptionRoutes from './routes/prescriptions.js';
import inventoryRoutes from './routes/inventory.js';
import patientRoutes from './routes/patients.js';
import auditRoutes from './routes/audit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medichain';

// Enable CORS and JSON parsing
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/finance', financeRoutes);
// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Try to connect to MongoDB; if it fails, start the server in 'offline' mode
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.warn('MongoDB connection error:', err.message);
    console.warn('Starting server without database (demo/offline mode)');
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Ashirwad Nursing Home ERP server running on port ${PORT}`);
    });
  });