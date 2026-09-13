import { Router } from 'express';
import { Medicine, Batch } from '../models/Medicine.js';

const router = Router();

// In-memory fallback if MongoDB is not connected
const memoryBatches = [];

// GET /api/inventory — live stock levels (FIFO sorted)
router.get('/', async (_req, res) => {
  try {
    const batches = await Batch.find({ quantity: { $gt: 0 } })
      .populate('medicine')
      .sort({ expiryDate: 1 }); // FIFO: nearest expiry first
    res.json(batches);
  } catch (err) {
    if (memoryBatches.length > 0) {
      return res.json(memoryBatches.filter((b) => b.quantity > 0));
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/add — add new medicine and batch stock
router.post('/add', async (req, res) => {
  try {
    const {
      medicineName,
      category = 'Other',
      unit = 'Tablet',
      rate = 0,
      batchId,
      quantity = 0,
      expiryDate,
      reorderLevel = 50,
      supplier = '',
    } = req.body;

    if (!medicineName || !batchId || !expiryDate || quantity === undefined) {
      return res.status(400).json({
        error: 'Medicine name, batch number, expiry date, and stock quantity are required',
      });
    }

    const cleanMedName = String(medicineName).trim();
    const cleanBatchId = String(batchId).trim().toUpperCase();
    const numQty = Math.max(0, Number(quantity) || 0);
    const numRate = Math.max(0, Number(rate) || 0);
    const numReorder = Math.max(1, Number(reorderLevel) || 50);
    const expDate = new Date(expiryDate);

    if (isNaN(expDate.getTime())) {
      return res.status(400).json({ error: 'Invalid expiry date format' });
    }

    let medicine;
    try {
      medicine = await Medicine.findOne({
        medicineName: new RegExp(`^${cleanMedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      });

      if (!medicine) {
        medicine = await Medicine.create({
          medicineName: cleanMedName,
          category,
          unit,
          rate: numRate,
          reorderLevel: numReorder,
        });
      } else {
        // Update medicine metadata if provided
        let updated = false;
        if (category && category !== 'Other') { medicine.category = category; updated = true; }
        if (unit) { medicine.unit = unit; updated = true; }
        if (numRate > 0) { medicine.rate = numRate; updated = true; }
        if (numReorder) { medicine.reorderLevel = numReorder; updated = true; }
        if (updated) await medicine.save();
      }

      // Check if batch ID exists for this medicine
      let existingBatch = await Batch.findOne({
        medicine: medicine._id,
        batchId: cleanBatchId,
      });

      let savedBatch;
      if (existingBatch) {
        existingBatch.quantity += numQty;
        existingBatch.rate = numRate || existingBatch.rate || medicine.rate || 0;
        existingBatch.expiryDate = expDate;
        if (supplier) existingBatch.supplier = supplier;
        savedBatch = await existingBatch.save();
      } else {
        savedBatch = await Batch.create({
          medicine: medicine._id,
          batchId: cleanBatchId,
          quantity: numQty,
          rate: numRate || medicine.rate || 0,
          expiryDate: expDate,
          supplier,
        });
      }

      const populated = await Batch.findById(savedBatch._id).populate('medicine');
      return res.status(201).json({
        success: true,
        message: `Stock batch ${cleanBatchId} for ${cleanMedName} added successfully`,
        batch: populated,
      });
    } catch (dbErr) {
      // In-memory fallback
      const memMed = {
        _id: `med_${Date.now()}`,
        medicineName: cleanMedName,
        category,
        unit,
        rate: numRate,
        reorderLevel: numReorder,
      };
      const memBatch = {
        _id: `batch_${Date.now()}`,
        medicine: memMed,
        batchId: cleanBatchId,
        quantity: numQty,
        rate: numRate,
        expiryDate: expDate.toISOString(),
        supplier,
      };
      memoryBatches.push(memBatch);
      return res.status(201).json({
        success: true,
        message: `Stock batch ${cleanBatchId} for ${cleanMedName} added in memory`,
        batch: memBatch,
      });
    }
  } catch (err) {
    console.error('Error adding medicine batch:', err);
    res.status(500).json({ error: err.message || 'Failed to add medicine batch' });
  }
});

// PUT /api/inventory/batch/:id — update batch stock or rate
router.put('/batch/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, rate, expiryDate, supplier } = req.body;

    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    if (quantity !== undefined) batch.quantity = Math.max(0, Number(quantity));
    if (rate !== undefined) batch.rate = Math.max(0, Number(rate));
    if (expiryDate) batch.expiryDate = new Date(expiryDate);
    if (supplier !== undefined) batch.supplier = supplier;

    await batch.save();
    const populated = await Batch.findById(batch._id).populate('medicine');
    res.json({ success: true, batch: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/inventory/batch/:id — delete a batch
router.delete('/batch/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Batch.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Batch not found' });
    res.json({ success: true, message: 'Batch removed successfully' });
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
