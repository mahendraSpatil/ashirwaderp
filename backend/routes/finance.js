import express from 'express';
import { Revenue, Forecast } from '../models/Finance.js';

const router = express.Router();

// Get Revenue Data
router.get('/revenue', async (req, res) => {
  try {
    const revenueData = await Revenue.find({});
    res.json(revenueData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Forecast Data
router.get('/forecast', async (req, res) => {
  try {
    const forecastData = await Forecast.find({});
    res.json(forecastData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;