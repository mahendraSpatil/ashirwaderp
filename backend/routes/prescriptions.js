import { Router } from 'express';
import { Prescription } from '../models/Prescription.js';

const router = Router();

// GET /api/prescriptions?status=Pending
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const prescriptions = await Prescription.find(filter)
      .sort({ createdAt: -1 })
      .populate('prescribedBy', 'fullName role');
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
      status: 'Pending',
    });
    res.status(201).json(rx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/prescriptions/:id/advance  (3-step lock)
router.patch('/:id/advance', async (req, res) => {
  try {
    const rx = await Prescription.findById(req.params.id);
    if (!rx) return res.status(404).json({ error: 'Prescription not found' });

    if (rx.status === 'Pending') {
      rx.status = 'Approved_Pending_Payment';
    } else if (rx.status === 'Approved_Pending_Payment') {
      rx.status = 'Paid_And_Dispensed';
      rx.dispensedBy = req.body.dispensedBy;
      // Stock deduction happens in the inventory route via FIFO
    } else {
      return res.status(400).json({ error: 'Prescription already dispensed' });
    }

    await rx.save();
    res.json(rx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
