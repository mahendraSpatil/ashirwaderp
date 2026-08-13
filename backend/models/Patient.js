import mongoose from 'mongoose';

const vitalSchema = new mongoose.Schema(
  {
    bp: { type: String, required: true },
    weight: { type: String, required: true },
    fetalHeartRate: { type: String, default: '' },
    riskFlag: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['Anomaly Scan', 'Blood Panel', 'Ultrasound', 'Growth Scan', 'PCPNDT Record'],
      required: true,
    },
    hash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pcpndtCompliant: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const patientSchema = new mongoose.Schema(
  {
    upid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gravida: { type: Number, required: true },
    para: { type: Number, required: true },
    lmp: { type: Date, required: true },
    edd: { type: Date, required: true },
    bloodGroup: { type: String, required: true },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    riskFlags: [{ type: String }],
    notes: { type: String, default: '' },
    vitals: [vitalSchema],
    documents: [documentSchema],
  },
  { timestamps: true }
);

patientSchema.virtual('gestationalAgeWeeks').get(function () {
  const now = new Date();
  const diffMs = now.getTime() - this.lmp.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
});

patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

export const Patient = mongoose.model('Patient', patientSchema);
