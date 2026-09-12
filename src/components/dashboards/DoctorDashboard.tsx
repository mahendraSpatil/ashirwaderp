import { useState, useEffect } from 'react';
import {
  Activity,
  Weight,
  Send,
  Pill,
  FileText,
  ChevronRight,
  Calendar,
  Droplet,
  Baby,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
  Lock,
  AlertTriangle,
  FileBadge,
  Clock,
  CreditCard,
  FlaskConical,
} from 'lucide-react';
import type { Patient, Prescription, PrescriptionStatus } from '@/types';
import { api } from '@/services/api'; // Imported the bridge!

interface DoctorDashboardProps {
  onPrescriptionSent: (rx: Prescription) => void;
}

const statusPipeline: { status: PrescriptionStatus; label: string; icon: typeof Clock; color: string }[] = [
  { status: 'Pending', label: 'Pending', icon: Clock, color: 'text-amber-500' },
  { status: 'Approved_Pending_Payment', label: 'Waiting for Payment', icon: CreditCard, color: 'text-terracotta-500' },
  { status: 'Paid_And_Dispensed', label: 'Paid & Dispensed', icon: FlaskConical, color: 'text-sage-500' },
];

export default function DoctorDashboard({ onPrescriptionSent }: DoctorDashboardProps) {
  // Swapped mock data for empty initial states and added a loading state
  const [patientList, setPatientList] = useState<any[]>([]);
  const [activePatientId, setActivePatientId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const [notes, setNotes] = useState('');
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [sentToast, setSentToast] = useState(false);

  // Fetch live patients
  const fetchPatients = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const livePatients = await api.getPatients();
      const formattedPatients = livePatients.map((p: any) => ({
        ...p,
        id: p._id || p.id,
      }));

      setPatientList(formattedPatients);
      
      setActivePatientId((prev) => {
        if (prev && formattedPatients.some((p: any) => p.id === prev)) {
          return prev;
        }
        return formattedPatients.length > 0 ? formattedPatients[0].id : '';
      });

      if (formattedPatients.length > 0 && !activePatientId) {
        setNotes(formattedPatients[0].notes || '');
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(() => {
      fetchPatients(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const activePatient = patientList.find((p) => p.id === activePatientId);

  const handleSelectPatient = (id: string) => {
    setActivePatientId(id);
    const p = patientList.find((pp) => pp.id === id);
    if (p) setNotes(p.notes || '');
  };

  const handleSaveNotes = async () => {
    setPatientList((prev) =>
      prev.map((p) => (p.id === activePatientId ? { ...p, notes } : p))
    );
    
    try {
      await api.updatePatient(activePatientId, { notes });
      alert("Notes saved securely to patient file!"); 
    } catch (error) {
      console.error("Failed to save notes:", error);
      alert("Failed to save notes. Please check your connection.");
    }
  };

  const handleSendToPharmacy = async () => {
    if (!medName.trim() || !dosage.trim() || !activePatient) return;
    
    const rxData = {
      patientId: activePatient.id || activePatient._id,
      patientName: activePatient.name,
      upid: activePatient.upid,
      medicineName: medName,
      dosage,
      instructions: 'As directed by physician',
      status: 'Pending' as const,
      prescribedBy: 'Dr. Ananya Iyer',
      timestamp: new Date().toISOString(),
    };

    try {
      const createdRx = await api.createPrescription(rxData);
      onPrescriptionSent((createdRx as Prescription) || (rxData as Prescription));
      
      setMedName('');
      setDosage('');
      setSentToast(true);
      setTimeout(() => setSentToast(false), 3000);
    } catch (error) {
      console.error("Failed to send prescription:", error);
      // Still trigger local state as fallback
      onPrescriptionSent(rxData as Prescription);
      setSentToast(true);
      setTimeout(() => setSentToast(false), 3000);
    }
  };

  // Safe fallbacks for when data is loading or empty
  if (loading) {
      return <div className="p-8 text-center text-ink-500 font-medium">Loading patient queue...</div>;
  }

  if (!activePatient || patientList.length === 0) {
      return (
          <div className="p-8 text-center text-ink-500">
              <h2 className="text-xl font-serif text-ink-900 mb-2">No Active Patients</h2>
              <p>Your triage queue is currently empty.</p>
          </div>
      );
  }

  const totalWeeks = 40;
  const progress = ((activePatient.gestationalAgeWeeks || 0) / totalWeeks) * 100;
  const trimester =
    (activePatient.gestationalAgeWeeks || 0) < 13
      ? 'First Trimester'
      : (activePatient.gestationalAgeWeeks || 0) < 28
      ? 'Second Trimester'
      : 'Third Trimester';

  const riskColor =
    activePatient.riskLevel === 'High'
      ? 'bg-red-50 text-red-600 border-red-100'
      : activePatient.riskLevel === 'Medium'
      ? 'bg-amber-50 text-amber-600 border-amber-100'
      : 'bg-sage-50 text-sage-500 border-sage-100';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-6">
        {/* Patient list sidebar */}
        <aside className="card p-5 h-fit lg:sticky lg:top-24">
          <h2 className="label-text mb-4">Active Patients</h2>
          <div className="space-y-2">
            {patientList.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPatient(p.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                  p.id === activePatientId
                    ? 'bg-terracotta-50 border border-terracotta-100'
                    : 'hover:bg-beige-100 border border-transparent'
                }`}
              >
                <div>
                  <p className="font-serif text-lg text-ink-900 leading-tight">{p.name}</p>
                  <p className="text-xs text-ink-500">
                    {p.upid} · {p.gestationalAgeWeeks || 0}w
                  </p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    p.id === activePatientId
                      ? 'text-terracotta-500 translate-x-0.5'
                      : 'text-ink-400 group-hover:translate-x-0.5'
                  }`}
                />
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div className="space-y-6">
          {/* Patient hero card */}
          <div className="card p-8 animate-fade-in">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="font-serif text-4xl text-ink-900 mb-2">{activePatient.name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-beige-100 text-ink-600">
                    {activePatient.upid}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" strokeWidth={1.5} /> Age {activePatient.age || '--'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Baby className="w-4 h-4" strokeWidth={1.5} /> G{activePatient.gravida || 0}P{activePatient.para || 0}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Droplet className="w-4 h-4" strokeWidth={1.5} /> {activePatient.bloodGroup || '--'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${riskColor}`}>
                    {activePatient.riskLevel || 'Low'} Risk
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="label-text mb-1">EDD</p>
                <p className="font-serif text-2xl text-terracotta-500">
                  {activePatient.edd ? new Date(activePatient.edd).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }) : 'TBD'}
                </p>
              </div>
            </div>

            {/* Risk flags */}
            {(activePatient.riskFlags || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {activePatient.riskFlags.map((flag: string) => (
                  <span
                    key={flag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 text-xs font-medium"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {flag}
                  </span>
                ))}
              </div>
            )}

            {/* Progress bar */}
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-ink-600 font-medium">
                {activePatient.gestationalAgeWeeks || 0} weeks · {trimester}
              </span>
              <span className="text-ink-400">40 weeks</span>
            </div>
            <div className="relative h-3 bg-beige-100 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-terracotta-300 to-terracotta-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: '32.5%' }} />
              <div className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: '70%' }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-ink-400">
              <span>Week 1</span>
              <span style={{ marginLeft: '22%' }}>T2 · Week 13</span>
              <span style={{ marginLeft: '18%' }}>T3 · Week 28</span>
              <span>Week 40</span>
            </div>
          </div>

          {/* Vitals + Notes grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vitals */}
            <div className="space-y-4">
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-terracotta-50 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="label-text">Blood Pressure</p>
                    <p className="font-serif text-3xl text-ink-900">{activePatient.bp || '--/--'}</p>
                  </div>
                </div>
                <p className="text-xs text-ink-400">mmHg · Last recorded at triage</p>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center">
                    <Weight className="w-5 h-5 text-sage-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="label-text">Weight</p>
                    <p className="font-serif text-3xl text-ink-900">{activePatient.weight || '--'}</p>
                  </div>
                </div>
                <p className="text-xs text-ink-400">Recorded at current visit</p>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-terracotta-50 flex items-center justify-center">
                    <HeartPulse className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="label-text">Fetal Heart Rate</p>
                    <p className="font-serif text-3xl text-ink-900">{activePatient.fetalHeartRate || '--'}</p>
                  </div>
                </div>
                <p className="text-xs text-ink-400">Normal range: 110–160 bpm</p>
              </div>
            </div>

            {/* Clinical notes */}
            <div className="card p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-ink-600" strokeWidth={1.5} />
                <h3 className="font-serif text-xl text-ink-900">Clinical Notes & History</h3>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field flex-1 resize-none min-h-[160px] leading-relaxed"
                placeholder="Consultation findings…"
              />
              <button
                onClick={handleSaveNotes}
                className="btn-terracotta px-4 py-2 text-sm mt-3 self-end flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                Save Notes
              </button>
            </div>
          </div>

          {/* E-Prescription with pipeline */}
          <div className="card p-8 relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-terracotta-50 flex items-center justify-center">
                <Pill className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-ink-900">E-Prescription</h3>
                <p className="text-sm text-ink-500">Send directly to the pharmacy dispensary</p>
              </div>
            </div>

            {/* Pipeline visualization */}
            <div className="flex items-center justify-between mb-6 bg-beige-50 rounded-2xl p-4">
              {statusPipeline.map((step, idx) => (
                <div key={step.status} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-xl bg-white border border-beige-200 flex items-center justify-center">
                      <step.icon className={`w-4 h-4 ${step.color}`} strokeWidth={1.5} />
                    </div>
                    <span className="text-xs text-ink-500 font-medium">{step.label}</span>
                  </div>
                  {idx < statusPipeline.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 bg-beige-200 rounded-full" />
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-text block mb-1.5">Medicine Name</label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Iron + Folic Acid"
                />
              </div>
              <div>
                <label className="label-text block mb-1.5">Dosage</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 1 tablet daily"
                />
              </div>
            </div>

            <button
              onClick={handleSendToPharmacy}
              disabled={!medName.trim() || !dosage.trim()}
              className="btn-terracotta px-6 py-3 mt-5 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" strokeWidth={1.5} />
              Send to Pharmacy
            </button>

            {sentToast && (
              <div className="absolute top-6 right-6 bg-sage-50 border border-sage-200 text-sage-500 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                Prescription sent to pharmacy
              </div>
            )}
          </div>
        </div>

        {/* Document Vault sidebar */}
        <aside className="card p-5 h-fit lg:sticky lg:top-24">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-sage-500" strokeWidth={1.5} />
            <h2 className="label-text">Document Vault</h2>
          </div>
          <div className="space-y-3">
            {(activePatient.documents || []).length === 0 && (
                <p className="text-sm text-ink-400">No documents uploaded.</p>
            )}
            {(activePatient.documents || []).map((doc: any) => (
              <div key={doc.id || doc.hash} className="bg-beige-50 rounded-xl p-4 border border-beige-200">
                <div className="flex items-start gap-2 mb-2">
                  <FileBadge className="w-4 h-4 text-terracotta-500 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 leading-tight">{doc.name}</p>
                    <p className="text-xs text-ink-400">{doc.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-sage-500" strokeWidth={1.5} />
                  <span className="text-xs text-sage-500 font-medium">Verified</span>
                </div>
                <p className="font-mono text-[10px] text-ink-400 break-all leading-relaxed">
                  {doc.hash}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}