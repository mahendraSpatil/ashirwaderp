import { Router } from 'express';
import { Patient } from '../models/Patient.js';

const router = Router();

// GET /api/patients
router.get('/', async (_req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:upid
router.get('/:upid', async (req, res) => {
  try {
    const patient = await Patient.findOne({ upid: req.params.upid })
      .populate('vitals.recordedBy', 'fullName')
      .populate('documents.uploadedBy', 'fullName');
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients/:upid/vitals  (Nurse triage)
router.post('/:upid/vitals', async (req, res) => {
  try {
    const patient = await Patient.findOne({ upid: req.params.upid });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    patient.vitals.push({
      bp: req.body.bp,
      weight: req.body.weight,
      fetalHeartRate: req.body.fetalHeartRate,
      riskFlag: req.body.riskFlag || 'Low',
      recordedBy: req.body.recordedBy,
    });

    // Auto-escalate risk level
    if (req.body.riskFlag === 'High') patient.riskLevel = 'High';

    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/patients/:upid/documents  (PCPNDT upload with hash)
router.post('/:upid/documents', async (req, res) => {
  try {
    const patient = await Patient.findOne({ upid: req.params.upid });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    patient.documents.push({
      name: req.body.name,
      type: req.body.type,
      hash: req.body.hash,
      verified: true,
      pcpndtCompliant: true,
      uploadedBy: req.body.uploadedBy,
    });

    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
