import { Router } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import crypto from 'crypto';

const router = Router();

// GET /api/audit — full blockchain audit log
router.get('/', async (_req, res) => {
  try {
    const entries = await AuditLog.find().sort({ blockNumber: -1 }).limit(100);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit — append a new block to the chain
router.post('/', async (req, res) => {
  try {
    const lastBlock = await AuditLog.findOne().sort({ blockNumber: -1 });
    const blockNumber = lastBlock ? lastBlock.blockNumber + 1 : 1;
    const previousHash = lastBlock ? lastBlock.hash : '0x0000000000000000000000000000000000000000000000000000000000000000';

    const payload = `${req.body.action}|${req.body.actor}|${blockNumber}|${previousHash}`;
    const hash = '0x' + crypto.createHash('sha256').update(payload).digest('hex');

    const entry = await AuditLog.create({
      action: req.body.action,
      actor: req.body.actor,
      category: req.body.category,
      hash,
      previousHash,
      blockNumber,
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/audit/verify — verify chain integrity
router.get('/verify', async (_req, res) => {
  try {
    const blocks = await AuditLog.find().sort({ blockNumber: 1 });
    let valid = true;
    for (let i = 1; i < blocks.length; i++) {
      if (blocks[i].previousHash !== blocks[i - 1].hash) {
        valid = false;
        break;
      }
    }
    res.json({ valid, totalBlocks: blocks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
