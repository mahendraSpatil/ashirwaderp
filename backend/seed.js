import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Revenue, Forecast } from './models/Finance.js';
dotenv.config();

import { User } from './models/User.js';
import { hashPassword } from './utils/auth.js';
import { Medicine, Batch } from './models/Medicine.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medichain';

const demoUsers = [
  { fullName: 'Dr. Ananya Iyer', email: 'doctor@medichain.com', role: 'Doctor' },
  { fullName: 'Priya Menon', email: 'nurse@medichain.com', role: 'Nurse' },
  { fullName: 'Karthik Rao', email: 'pharmacist@medichain.com', role: 'Pharmacist' },
  { fullName: 'Meera Krishnan', email: 'admin@medichain.com', role: 'Admin' },
];

const demoMedicines = [
  { 
    medicineName: 'Labetalol 200mg', 
    category: 'Antihypertensive', 
    unit: 'Tablet' 
  },
  { 
    medicineName: 'Oxytocin', 
    category: 'Uterotonic', 
    unit: 'Ampoule' 
  },
  { 
    medicineName: 'Folic Acid 5mg', 
    category: 'Supplement', 
    unit: 'Tablet' 
  }
];

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

async function seed() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  // --- SEED USERS ---
  console.log('Seeding Users...');
  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  ✓  ${u.email} already exists — skipping`);
      continue;
    }

    await User.create({
      fullName: u.fullName,
      email: u.email,
      passwordHash: hashPassword('medichain123'),
      role: u.role,
      avatarInitials: getInitials(u.fullName),
    });
    console.log(`  +  Created ${u.email} (${u.role})`);
  }

  // --- SEED INVENTORY ---
  console.log('\nClearing old inventory and seeding new custom list...');
  
  await Medicine.deleteMany({});
  await Batch.deleteMany({});

  console.log('\nSeeding Inventory...');
  for (const med of demoMedicines) {
    let medicine = await Medicine.findOne({ medicineName: med.medicineName });
    
    if (!medicine) {
      medicine = await Medicine.create(med);
      console.log(`  +  Created Medicine Profile: ${med.medicineName}`);

      await Batch.create({
        medicine: medicine._id,
        batchId: `BATCH-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        quantity: 150,
        expiryDate: new Date('2027-12-31') 
      });
      console.log(`  +  Added Batch Stock for: ${med.medicineName} (Qty: 150)`);
    } else {
      console.log(`  ✓  ${med.medicineName} already exists — skipping`);
    }
  }

  // --- SEED FINANCE & FORECAST DATA ---
  console.log('\nSeeding Dashboard Chart Data...');
  await Revenue.deleteMany({});
  await Forecast.deleteMany({});

  const sampleRevenue = [
    { day: 'Mon', clinicRevenue: 12500, pharmacyRevenue: 8400 },
    { day: 'Tue', clinicRevenue: 15200, pharmacyRevenue: 9100 },
    { day: 'Wed', clinicRevenue: 14800, pharmacyRevenue: 11200 },
    { day: 'Thu', clinicRevenue: 18500, pharmacyRevenue: 10500 },
    { day: 'Fri', clinicRevenue: 16900, pharmacyRevenue: 13400 },
    { day: 'Sat', clinicRevenue: 22400, pharmacyRevenue: 16800 },
    { day: 'Sun', clinicRevenue: 19800, pharmacyRevenue: 14200 },
  ];

  const sampleForecast = [
    { week: 'W1', currentStock: 850, forecastedDemand: 820 },
    { week: 'W2', currentStock: 780, forecastedDemand: 850 },
    { week: 'W3', currentStock: 720, forecastedDemand: 890 },
    { week: 'W4', currentStock: 950, forecastedDemand: 910 },
    { week: 'W5', currentStock: 890, forecastedDemand: 940 },
    { week: 'W6', currentStock: 820, forecastedDemand: 980 },
  ];

  await Revenue.insertMany(sampleRevenue);
  await Forecast.insertMany(sampleForecast);
  console.log('  + Added Revenue and Forecast data for Admin charts');

  console.log('\nDone. All demo users, inventory, and charts ready!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});