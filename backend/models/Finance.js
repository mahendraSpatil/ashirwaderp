import mongoose from 'mongoose';

// Schema for the Area Chart (Revenue)
const revenueSchema = new mongoose.Schema({
  day: { type: String, required: true },
  clinicRevenue: { type: Number, required: true },
  pharmacyRevenue: { type: Number, required: true }
});

// Schema for the Line Chart (Inventory Forecast)
const forecastSchema = new mongoose.Schema({
  week: { type: String, required: true },
  currentStock: { type: Number, required: true },
  forecastedDemand: { type: Number, required: true }
});

// We must export BOTH of these so the route file can import them!
export const Revenue = mongoose.model('Revenue', revenueSchema);
export const Forecast = mongoose.model('Forecast', forecastSchema);