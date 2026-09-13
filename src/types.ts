export type Role = 'doctor' | 'nurse' | 'pharmacist' | 'admin';

export interface VitalReading {
  bp: string;
  weight: string;
  fetalHeartRate?: string;
  timestamp: string;
}

export interface PatientDocument {
  id: string;
  name: string;
  type: 'Anomaly Scan' | 'Blood Panel' | 'Ultrasound' | 'Growth Scan' | 'PCPNDT Record';
  hash: string;
  verified: boolean;
  uploadDate: string;
  uploadedBy: string;
}

export interface Patient {
  id: string;
  upid: string;
  name: string;
  age: number;
  gravida: number;
  para: number;
  lmp: string;
  edd: string;
  gestationalAgeWeeks: number;
  bloodGroup: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  riskFlags: string[];
  bp: string;
  weight: string;
  fetalHeartRate: string;
  notes: string;
  documents: PatientDocument[];
}

export type PrescriptionStatus = 'Pending' | 'Approved_Pending_Payment' | 'Paid_And_Dispensed';

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  upid: string;
  medicineName: string;
  dosage: string;
  instructions: string;
  status: PrescriptionStatus;
  prescribedBy: string;
  timestamp: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  rate: number;
  batchId: string;
  expiryDate: string;
  supplier?: string;
  reorderLevel: number;
}

export type AuditCategory = 'imaging' | 'prescription' | 'triage' | 'system' | 'payment';

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  hash: string;
  category: AuditCategory;
}

export interface ForecastData {
  supplement: string;
  predictedDemand: number;
  currentStock: number;
}

export type ClinicalRevenueCategory = 'Consultation' | 'IPD & Room Rent' | 'Procedure/Surgery' | 'Diagnostic Scan' | 'Lab Test';

export interface ClinicalRevenue {
  id: string;
  date: string;
  patientId?: string;
  patientName?: string;
  category: ClinicalRevenueCategory;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Insurance';
  project: string;
}

export type PharmacyRevenueCategory = 'Prescription Sales' | 'OTC Sales' | 'Consumables';

export interface PharmacyRevenue {
  id: string;
  date: string;
  billId: string;
  patientId?: string;
  items: string;
  quantity: number;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI';
  category: PharmacyRevenueCategory;
}

export interface RevenueData {
  day: string;
  consultationRevenue: number;
  procedureRevenue: number;
  scanRevenue: number;
}

export interface ForecastTrendData {
  week: string;
  currentStock: number;
  forecastedDemand: number;
}
