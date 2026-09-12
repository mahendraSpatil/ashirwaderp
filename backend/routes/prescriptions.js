import { Router } from 'express';
import { Prescription } from '../models/Prescription.js';

const router = Router();

// GET /api/prescriptions?status=Pending
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const prescriptions = await Prescription.find(filter)
      .sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prescriptions  (Doctor sends e-Rx to pharmacy)
router.post('/', async (req, res) => {
  try {
    const rx = await Prescription.create({
      ...req.body,
      status: req.body.status || 'Pending',
    });
    res.status(201).json(rx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/prescriptions/:id/advance  (3-step lock)
router.patch('/:id/advance', async (req, res) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const filter = isObjectId ? { _id: req.params.id } : { $or: [{ _id: req.params.id }, { id: req.params.id }] };
    
    let rx = null;
    if (isObjectId) {
      rx = await Prescription.findById(req.params.id);
    }
    if (!rx) {
      rx = await Prescription.findOne({ $or: [{ id: req.params.id }, { upid: req.params.id }] });
    }
    
    if (!rx) return res.status(404).json({ error: 'Prescription not found' });

    if (rx.status === 'Pending') {
      rx.status = 'Approved_Pending_Payment';
    } else if (rx.status === 'Approved_Pending_Payment') {
      rx.status = 'Paid_And_Dispensed';
      if (req.body.dispensedBy) rx.dispensedBy = req.body.dispensedBy;
    } else {
      rx.status = 'Paid_And_Dispensed';
    }

    await rx.save();
    res.json(rx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

