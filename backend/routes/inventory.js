import { Router } from 'express';
import { Medicine, Batch } from '../models/Medicine.js';

const router = Router();

// GET /api/inventory — live stock levels (FIFO sorted)
router.get('/', async (_req, res) => {
  try {
    const batches = await Batch.find({ quantity: { $gt: 0 } })
      .populate('medicine')
      .sort({ expiryDate: 1 }); // FIFO: nearest expiry first
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/deduct  (called ONLY at dispense step)
router.post('/deduct', async (req, res) => {
  try {
    const { medicineName, quantity } = req.body;
    const medicine = await Medicine.findOne({ medicineName: new RegExp(medicineName, 'i') });
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });

    let remaining = quantity;
    const batches = await Batch.find({
      medicine: medicine._id,
      quantity: { $gt: 0 },
    }).sort({ expiryDate: 1 }); // FIFO

    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct = Math.min(batch.quantity, remaining);
      batch.quantity -= deduct;
      remaining -= deduct;
      await batch.save();
    }

    if (remaining > 0) {
      return res.status(400).json({ error: 'Insufficient stock', shortfall: remaining });
    }

    res.json({ success: true, medicine: medicine.medicineName, quantityDeducted: quantity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/forecast — AI demand prediction (stub)
router.get('/forecast', async (_req, res) => {
  try {
    // In production: aggregate active patient EDDs and predict supplement demand
    const medicines = await Medicine.find();
    const forecast = medicines.map((m) => ({
      medicine: m.medicineName,
      predictedDemand: Math.floor(Math.random() * 200) + 30,
      reorderLevel: m.reorderLevel,
    }));
    res.json(forecast);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
