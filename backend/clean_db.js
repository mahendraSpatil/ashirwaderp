import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { Patient } from './models/Patient.js';
import { Prescription } from './models/Prescription.js';
import { AuditLog } from './models/AuditLog.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medichain';

async function cleanDatabase() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  console.log('Purging test patients...');
  const patientRes = await Patient.deleteMany({});
  console.log(`Deleted ${patientRes.deletedCount} patient records.`);

  console.log('Purging prescriptions...');
  const rxRes = await Prescription.deleteMany({});
  console.log(`Deleted ${rxRes.deletedCount} prescription records.`);

  console.log('Purging audit logs...');
  const auditRes = await AuditLog.deleteMany({});
  console.log(`Deleted ${auditRes.deletedCount} audit log records.`);

  console.log('Database cleaned successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

cleanDatabase().catch((err) => {
  console.error('Clean failed:', err);
  process.exit(1);
});
