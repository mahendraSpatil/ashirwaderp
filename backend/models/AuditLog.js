import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actor: { type: String, required: true },
    category: {
      type: String,
      enum: ['imaging', 'prescription', 'triage', 'system', 'payment'],
      required: true,
    },
    hash: { type: String, required: true, unique: true, index: true },
    previousHash: { type: String, default: '0x0000000000000000000000000000000000000000000000000000000000000000' },
    blockNumber: { type: Number, required: true },
  },
  { timestamps: true }
);

auditSchema.index({ blockNumber: 1 });

export const AuditLog = mongoose.model('AuditLog', auditSchema);
