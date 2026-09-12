import { Router } from 'express';
import { Patient } from '../models/Patient.js';

const router = Router();

// Helper to find patient by _id or upid
function getPatientFilter(param) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);
  return isObjectId ? { $or: [{ _id: param }, { upid: param }] } : { upid: param };
}

// ==========================================
// 1. STANDARD ROUTES
// ==========================================
// GET /api/patients
router.get('/', async (_req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients (Create new patient)
router.post('/', async (req, res) => {
  try {
    const generatedUpid = req.body.upid || `MC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Calculate EDD if LMP is given or fallback
    let edd = req.body.edd;
    if (!edd && req.body.gestationalAgeWeeks) {
      const remainingWeeks = Math.max(0, 40 - Number(req.body.gestationalAgeWeeks));
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + remainingWeeks * 7);
      edd = targetDate;
    }

    const patient = new Patient({
      upid: generatedUpid,
      name: req.body.name,
      age: Number(req.body.age) || 25,
      gravida: Number(req.body.gravida) || 1,
      para: Number(req.body.para) || 0,
      gestationalAgeWeeks: Number(req.body.gestationalAgeWeeks) || 12,
      bloodGroup: req.body.bloodGroup || 'O+',
      riskLevel: req.body.riskLevel || 'Low',
      riskFlags: req.body.riskFlags || [],
      bp: req.body.bp || '--/--',
      weight: req.body.weight || '--',
      fetalHeartRate: req.body.fetalHeartRate || '--',
      notes: req.body.notes || req.body.complaint || '',
      status: req.body.status || 'waiting',
      edd: edd || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      vitals: req.body.bp && req.body.bp !== '--/--' ? [{
        bp: req.body.bp,
        weight: req.body.weight || '--',
        fetalHeartRate: req.body.fetalHeartRate || '',
        riskFlag: req.body.riskLevel || 'Low',
        recordedBy: 'Nurse'
      }] : [],
      documents: []
    });

    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne(getPatientFilter(req.params.id));
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients/:id/vitals  (Nurse triage)
router.post('/:id/vitals', async (req, res) => {
  try {
    const patient = await Patient.findOne(getPatientFilter(req.params.id));
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    if (req.body.bp) patient.bp = req.body.bp;
    if (req.body.weight) patient.weight = req.body.weight;
    if (req.body.fetalHeartRate) patient.fetalHeartRate = req.body.fetalHeartRate;
    if (req.body.riskFlag) patient.riskLevel = req.body.riskFlag;
    if (req.body.riskLevel) patient.riskLevel = req.body.riskLevel;

    patient.vitals.push({
      bp: req.body.bp || patient.bp,
      weight: req.body.weight || patient.weight,
      fetalHeartRate: req.body.fetalHeartRate || patient.fetalHeartRate || '',
      riskFlag: req.body.riskFlag || req.body.riskLevel || 'Low',
      recordedBy: req.body.recordedBy || 'Nurse',
    });

    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/patients/:id/documents  (PCPNDT upload with hash)
router.post('/:id/documents', async (req, res) => {
  try {
    const patient = await Patient.findOne(getPatientFilter(req.params.id));
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const newDoc = {
      name: req.body.name || 'Document.pdf',
      type: req.body.type || 'PCPNDT Record',
      hash: req.body.hash || `0x${Date.now().toString(16)}`,
      verified: req.body.verified !== false,
      pcpndtCompliant: req.body.pcpndtCompliant !== false,
      uploadedBy: req.body.uploadedBy || 'Nurse',
    };

    patient.documents.push(newDoc);
    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/patients/:id (Update patient details like notes, vitals, status)
router.put('/:id', async (req, res) => {
  try {
    const filter = getPatientFilter(req.params.id);

    // If vitals are updated via PUT, also add to vitals history
    const updateData = { ...req.body };
    const patient = await Patient.findOne(filter);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    if (updateData.bp || updateData.weight || updateData.fetalHeartRate) {
      patient.vitals.push({
        bp: updateData.bp || patient.bp,
        weight: updateData.weight || patient.weight,
        fetalHeartRate: updateData.fetalHeartRate || patient.fetalHeartRate || '',
        riskFlag: updateData.riskLevel || patient.riskLevel || 'Low',
        recordedBy: updateData.recordedBy || 'Nurse',
      });
    }

    if (updateData.documents && Array.isArray(updateData.documents)) {
      patient.documents = updateData.documents;
      delete updateData.documents;
    }

    Object.assign(patient, updateData);
    await patient.save();

    res.json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;