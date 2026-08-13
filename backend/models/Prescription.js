import mongoose from 'mongoose';

const PrescriptionStatusEnum = ['Pending', 'Approved_Pending_Payment', 'Paid_And_Dispensed'];

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    patientName: { type: String, required: true },
    upid: { type: String, required: true },
    medicineName: { type: String, required: true },
    dosage: { type: String, required: true },
    instructions: { type: String, default: '' },
    status: {
      type: String,
      enum: PrescriptionStatusEnum,
      default: 'Pending',
      required: true,
    },
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockHash: { type: String, default: '' },
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientId: 1, status: 1 });

export const Prescription = mongoose.model('Prescription', prescriptionSchema);
