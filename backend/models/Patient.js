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
    recordedBy: { type: mongoose.Schema.Types.Mixed, default: 'Nurse' },
  },
  { timestamps: true }
);

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      default: 'PCPNDT Record',
    },
    hash: { type: String, required: true },
    verified: { type: Boolean, default: true },
    uploadedBy: { type: mongoose.Schema.Types.Mixed, default: 'Nurse' },
    pcpndtCompliant: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const patientSchema = new mongoose.Schema(
  {
    upid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gravida: { type: Number, default: 1 },
    para: { type: Number, default: 0 },
    lmp: { type: Date },
    edd: { type: Date },
    gestationalAgeWeeks: { type: Number, default: 0 },
    bloodGroup: { type: String, default: 'O+' },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    riskFlags: [{ type: String }],
    bp: { type: String, default: '--/--' },
    weight: { type: String, default: '--' },
    fetalHeartRate: { type: String, default: '--' },
    status: {
      type: String,
      enum: ['waiting', 'in_consultation', 'completed'],
      default: 'waiting',
    },
    notes: { type: String, default: '' },
    vitals: [vitalSchema],
    documents: [documentSchema],
  },
  { timestamps: true }
);

patientSchema.virtual('waitMinutes').get(function() {
  // Safety check: If the date is missing, return 0 instead of crashing
  if (!this.createdAt) return 0; 

  return Math.round((new Date().getTime() - this.createdAt.getTime()) / 60000);
});

patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

export const Patient = mongoose.model('Patient', patientSchema);

