import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Supplement', 'Antihypertensive', 'Uterotonic', 'Anticonvulsant', 'Other'],
      default: 'Other',
    },
    unit: { type: String, required: true },
    reorderLevel: { type: Number, default: 50 },
  },
  { timestamps: true }
);

const batchSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    batchId: { type: String, required: true, unique: true, index: true },
    quantity: { type: Number, required: true, min: 0 },
    expiryDate: { type: Date, required: true },
    receivedDate: { type: Date, default: Date.now },
    supplier: { type: String, default: '' },
  },
  { timestamps: true }
);

// FIFO: sort by expiryDate ascending so nearest-expiry batches are dispensed first
batchSchema.index({ medicine: 1, expiryDate: 1 });

export const Medicine = mongoose.model('Medicine', medicineSchema);
export const Batch = mongoose.model('Batch', batchSchema);
