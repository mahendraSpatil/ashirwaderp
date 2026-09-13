import { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Weight,
  AlertTriangle,
  AlertCircle,
  UploadCloud,
  FileCheck,
  Lock,
  ShieldCheck,
  X,
  Loader2,
  ScanLine,
  HeartPulse,
  CheckCircle2,
  BadgeCheck,
  Users,
  Clock,
  Stethoscope,
  ChevronRight,
  Phone,
  UserPlus,
  Plus,
  Eye,
} from 'lucide-react';
import type { AuditCategory } from '@/types';
import { generateHash } from '@/services/utils';
import { api } from '@/services/api';
import DocumentViewerModal from '@/components/shared/DocumentViewerModal';

interface UploadedFile {
  name: string;
  size: number;
  hash: string;
  timestamp: string;
}

interface TriagePatient {
  id: string;
  name: string;
  upid: string;
  weeks: string;
  bp: string;
  fhr: string;
  complaint: string;
  waitMinutes: number;
  priority: 'Emergency' | 'High Priority' | 'Routine';
  escalationReason?: string;
  status: 'waiting' | 'in_consultation' | 'completed';
  documents?: any[];
}

interface NurseDashboardProps {
  onAuditLog: (action: string, actor: string, category: AuditCategory) => string;
}

function formatWait(mins: number) {
  if (mins === 0) return '0m';
  return `${mins}m`;
}

const priorityConfig = {
  Emergency: {
    badge: 'bg-red-100 text-red-600 border border-red-200',
    dot: 'bg-red-500',
    row: 'bg-red-50/40',
    rankBg: 'bg-red-100 text-red-600',
  },
  'High Priority': {
    badge: 'bg-amber-100 text-amber-600 border border-amber-200',
    dot: 'bg-amber-500',
    row: 'bg-amber-50/30',
    rankBg: 'bg-amber-100 text-amber-600',
  },
  Routine: {
    badge: 'bg-sage-50 text-sage-500 border border-sage-200',
    dot: 'bg-sage-400',
    row: '',
    rankBg: 'bg-beige-100 text-ink-600',
  },
};

export default function NurseDashboard({ onAuditLog }: NurseDashboardProps) {
  // Database States
  const [queue, setQueue] = useState<TriagePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Add Patient Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingPatient, setSubmittingPatient] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newWeeks, setNewWeeks] = useState('');
  const [newGravida, setNewGravida] = useState('1');
  const [newPara, setNewPara] = useState('0');
  const [newBloodGroup, setNewBloodGroup] = useState('O+');
  const [newEdd, setNewEdd] = useState('');
  const [newComplaint, setNewComplaint] = useState('');
  const [newRiskLevel, setNewRiskLevel] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [newBpSys, setNewBpSys] = useState('');
  const [newBpDia, setNewBpDia] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newFhr, setNewFhr] = useState('');

  // Form States
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [weight, setWeight] = useState('');
  const [fhr, setFhr] = useState('');
  const [riskFlag, setRiskFlag] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [triageToast, setTriageToast] = useState(false);

  // File States
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [hashing, setHashing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewingDoc, setViewingDoc] = useState<any | null>(null);

  // 1. Fetch live patients on mount
  const fetchPatients = async (preserveSelection = true) => {
    try {
      const data = await api.getPatients();
      
      // Map MongoDB fields to the UI's TriagePatient format
      const formattedData: TriagePatient[] = data.map((p: any) => {
        const isHighRisk = p.riskLevel === 'High';
        const isMedRisk = p.riskLevel === 'Medium';
        
        return {
          id: p._id || p.id,
          name: p.name,
          upid: p.upid,
          weeks: `${p.gestationalAgeWeeks || 0}w`,
          bp: p.bp || '--/--',
          fhr: p.fetalHeartRate ? p.fetalHeartRate.toString() : '--',
          complaint: p.notes || 'Routine check-up',
          waitMinutes: p.waitMinutes || 5,
          priority: isHighRisk ? 'Emergency' : isMedRisk ? 'High Priority' : 'Routine',
          escalationReason: isHighRisk ? 'Clinically flagged as high risk' : undefined,
          status: p.status || 'waiting',
          documents: p.documents || [],
        };
      });

      setQueue(formattedData);
      if (formattedData.length > 0) {
        setSelectedPatientId((prev) => {
          if (preserveSelection && prev && formattedData.some((p) => p.id === prev)) {
            return prev;
          }
          return formattedData[0].id;
        });
      }
    } catch (error) {
      console.error("Error fetching patient queue:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleCallIn = async (id: string) => {
    try {
      setQueue((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'in_consultation' } : p))
      );
      
      await api.updatePatient(id, { status: 'in_consultation' });

      const patient = queue.find((p) => p.id === id);
      if (patient) {
        onAuditLog(
          `Patient called in — ${patient.name} (${patient.upid}), Priority: ${patient.priority}`,
          'Nurse Priya Menon',
          'triage'
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      fetchPatients();
    }
  };

  const handleTriageSubmit = async () => {
    const targetPatientId = selectedPatientId || (queue.length > 0 ? queue[0].id : '');
    if (!bpSys || !bpDia || !weight || !targetPatientId) return;
    
    const sys = parseInt(bpSys);
    const dia = parseInt(bpDia);
    const isHighBP = sys >= 140 || dia >= 90;
    const finalRisk = isHighBP ? 'High' : riskFlag;

    try {
      // Send vitals to MongoDB
      await api.updatePatient(targetPatientId, {
        bp: `${bpSys}/${bpDia}`,
        weight: weight,
        fetalHeartRate: fhr || '--',
        riskLevel: finalRisk
      });

      // Log it
      onAuditLog(
        `Patient triaged — BP ${bpSys}/${bpDia}, Weight ${weight}kg, FHR ${fhr || 'N/A'} bpm, Risk: ${finalRisk}`,
        'Nurse Priya Menon',
        'triage'
      );
      
      setTriageToast(true);
      setTimeout(() => setTriageToast(false), 3000);
      
      // Clear form and refresh list to show new vitals in queue
      setBpSys('');
      setBpDia('');
      setWeight('');
      setFhr('');
      setRiskFlag('Low');
      
      await fetchPatients(true);

    } catch (error) {
      console.error("Failed to submit triage:", error);
      alert("Failed to save triage data. Please try again.");
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const targetPatientId = selectedPatientId || (queue.length > 0 ? queue[0].id : '');
    setHashing(true);

    setTimeout(async () => {
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        name: file.name,
        size: file.size,
        hash: generateHash(),
        timestamp: new Date().toISOString(),
      }));

      setUploadedFiles((prev) => [...newFiles, ...prev]);

      const fileArray = Array.from(files);
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const f = newFiles[i];
        
        let dataUrl = '';
        try {
          dataUrl = await readFileAsDataURL(file);
        } catch (e) {
          console.error("Failed to read file", e);
        }

        onAuditLog(
          `PCPNDT document uploaded — ${f.name} (Merkle root: ${f.hash.slice(0, 18)}…)`,
          'Nurse Priya Menon',
          'imaging'
        );

        if (targetPatientId) {
          try {
            await api.uploadPatientDocument(targetPatientId, {
              name: f.name,
              type: 'PCPNDT Record',
              hash: f.hash,
              url: dataUrl,
              verified: true,
              pcpndtCompliant: true,
              uploadedBy: 'Nurse Priya Menon',
            });
          } catch (err) {
            console.error("Failed to persist document to patient in database:", err);
          }
        }
      }

      setHashing(false);
      if (targetPatientId) {
        fetchPatients(true);
      }
    }, 500); // Reduced delay slightly
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const riskOptions: { value: 'Low' | 'Medium' | 'High'; label: string }[] = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
  ];

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAge) return;
    setSubmittingPatient(true);

    try {
      const initialBp = newBpSys && newBpDia ? `${newBpSys}/${newBpDia}` : '--/--';
      const payload = {
        name: newName.trim(),
        age: parseInt(newAge) || 25,
        gestationalAgeWeeks: parseInt(newWeeks) || 12,
        gravida: parseInt(newGravida) || 1,
        para: parseInt(newPara) || 0,
        bloodGroup: newBloodGroup,
        edd: newEdd ? new Date(newEdd) : undefined,
        notes: newComplaint.trim(),
        riskLevel: newRiskLevel,
        bp: initialBp,
        weight: newWeight || '--',
        fetalHeartRate: newFhr || '--',
        status: 'waiting',
      };

      const created = await api.createPatient(payload);
      onAuditLog(
        `New patient registered — ${created.name} (${created.upid})`,
        'Nurse Priya Menon',
        'triage'
      );

      setShowAddModal(false);
      // Reset form
      setNewName('');
      setNewAge('');
      setNewWeeks('');
      setNewGravida('1');
      setNewPara('0');
      setNewBloodGroup('O+');
      setNewEdd('');
      setNewComplaint('');
      setNewRiskLevel('Low');
      setNewBpSys('');
      setNewBpDia('');
      setNewWeight('');
      setNewFhr('');

      await fetchPatients(false);
      if (created._id || created.id) {
        setSelectedPatientId(created._id || created.id);
      }
    } catch (err) {
      console.error("Failed to create patient:", err);
      alert("Failed to register patient. Please check your connection.");
    } finally {
      setSubmittingPatient(false);
    }
  };

  const waiting = queue.filter((p) => p.status === 'waiting').length;
  const inConsultation = queue.filter((p) => p.status === 'in_consultation').length;
  const completed = queue.filter((p) => p.status === 'completed').length;

  // Sort: Emergency first, then High Priority, then Routine
  const priorityOrder = { Emergency: 0, 'High Priority': 1, Routine: 2 };
  const sortedQueue = [...queue].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  if (loading) {
    return <div className="p-8 text-center text-ink-500 font-medium">Loading triage queue from database...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Smart Triage Queue */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terracotta-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-ink-900">Smart Triage Queue</h2>
              <p className="text-sm text-ink-500">
                Auto-sorted by clinical priority · High BP auto-escalated
              </p>
            </div>
          </div>

          {/* Stats & Add Patient Action */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-terracotta px-4 py-2 text-sm flex items-center gap-2 shadow-soft hover:shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add New Patient
            </button>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-beige-50 border border-beige-200">
              <Clock className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
              <span className="text-sm font-medium text-ink-700">{waiting} waiting</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sage-50 border border-sage-200">
              <Stethoscope className="w-4 h-4 text-sage-500" strokeWidth={1.5} />
              <span className="text-sm font-medium text-sage-600">{inConsultation} in consultation</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-beige-50 border border-beige-200">
              <CheckCircle2 className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
              <span className="text-sm font-medium text-ink-700">{completed} completed</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {queue.length === 0 ? (
            <div className="p-8 text-center text-ink-500">No patients currently in queue.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-beige-200 bg-beige-50/60">
                  <th className="text-left py-3 px-4 label-text w-12">#</th>
                  <th className="text-left py-3 px-4 label-text">Patient</th>
                  <th className="text-left py-3 px-4 label-text">UPID</th>
                  <th className="text-left py-3 px-4 label-text">Weeks</th>
                  <th className="text-left py-3 px-4 label-text">BP / FHR</th>
                  <th className="text-left py-3 px-4 label-text">Complaint</th>
                  <th className="text-left py-3 px-4 label-text">Wait</th>
                  <th className="text-left py-3 px-4 label-text">Priority</th>
                  <th className="text-left py-3 px-4 label-text">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedQueue.map((patient, idx) => {
                  const cfg = priorityConfig[patient.priority];
                  const isHighBP = patient.bp !== '--/--' && (
                    parseInt(patient.bp.split('/')[0]) >= 140 ||
                    parseInt(patient.bp.split('/')[1]) >= 90
                  );
                  const isConsulting = patient.status === 'in_consultation';

                  return (
                    <tr
                      key={patient.id}
                      className={`border-b border-beige-200 last:border-0 transition-colors ${cfg.row} ${
                        isConsulting ? 'opacity-60' : 'hover:bg-beige-50/70'
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${cfg.rankBg}`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2">
                          {patient.priority === 'Emergency' && (
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                          )}
                          <div>
                            <p className="font-medium text-ink-900 leading-tight">{patient.name}</p>
                            {patient.escalationReason && (
                              <p className="text-xs text-red-500 mt-0.5 font-medium">{patient.escalationReason}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs text-ink-500">{patient.upid}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-ink-700 font-medium">{patient.weeks}</span>
                      </td>
                      <td className="py-4 px-4">
                        <p className={`font-semibold leading-tight ${isHighBP ? 'text-red-600' : 'text-ink-900'}`}>
                          {patient.bp}
                        </p>
                        <p className="text-xs text-ink-400">{patient.fhr} bpm</p>
                      </td>
                      <td className="py-4 px-4 max-w-[200px]">
                        <p className="text-ink-600 truncate" title={patient.complaint}>
                          {patient.complaint.length > 36 ? patient.complaint.slice(0, 36) + '…' : patient.complaint}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-ink-500">
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span className="text-sm">{formatWait(patient.waitMinutes)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {patient.priority}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {isConsulting ? (
                          <span className="text-xs text-sage-500 font-medium flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5" strokeWidth={1.5} />
                            In session
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCallIn(patient.id)}
                            className="flex items-center gap-1.5 text-terracotta-500 hover:text-terracotta-600 text-sm font-medium transition-colors group"
                          >
                            <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
                            Call In
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer note */}
        <div className="px-6 py-3 border-t border-beige-200 bg-beige-50/60">
          <p className="text-xs text-terracotta-500 text-center font-medium">
            Patients with BP ≥ 140/90 or reduced fetal movement are automatically escalated to the top of the queue
          </p>
        </div>
      </div>

      {/* Intake form + PCPNDT vault */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Intake */}
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-terracotta-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-ink-900">Patient Intake</h2>
              <p className="text-sm text-ink-500">Log arriving vitals and risk flags</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Added Patient Selector for the Form */}
            <div>
              <label className="label-text block mb-1.5">Select Patient</label>
              <select 
                value={selectedPatientId} 
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="input-field w-full bg-white"
              >
                <option value="" disabled>Select a patient to triage...</option>
                {queue.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.upid})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text block mb-1.5">Blood Pressure (mmHg)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={bpSys}
                  onChange={(e) => setBpSys(e.target.value)}
                  className="input-field"
                  placeholder="Systolic"
                />
                <span className="text-ink-400 font-medium">/</span>
                <input
                  type="number"
                  value={bpDia}
                  onChange={(e) => setBpDia(e.target.value)}
                  className="input-field"
                  placeholder="Diastolic"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text block mb-1.5">Weight (kg)</label>
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.5} />
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="input-field pl-10"
                    placeholder="68.5"
                  />
                </div>
              </div>
              <div>
                <label className="label-text block mb-1.5">Fetal Heart Rate</label>
                <div className="relative">
                  <HeartPulse className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.5} />
                  <input
                    type="number"
                    value={fhr}
                    onChange={(e) => setFhr(e.target.value)}
                    className="input-field pl-10"
                    placeholder="bpm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label-text block mb-2">Risk Flag</label>
              <div className="flex gap-2">
                {riskOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRiskFlag(opt.value)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
                      riskFlag === opt.value
                        ? opt.value === 'High'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : opt.value === 'Medium'
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-sage-50 text-sage-500 border-sage-200'
                        : 'bg-white text-ink-500 border-beige-200 hover:border-beige-100'
                    }`}
                  >
                    {opt.value === 'High' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleTriageSubmit}
              disabled={!bpSys || !bpDia || !weight || !selectedPatientId}
              className="btn-terracotta px-5 py-2.5 w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Triage Data
            </button>

            {triageToast && (
              <div className="bg-sage-50 border border-sage-200 text-sage-500 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 animate-fade-in">
                <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                Triage recorded and logged to database
              </div>
            )}
          </div>
        </div>

        {/* PCPNDT Document Vault */}
        <div className="card p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-sage-500" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-ink-900">PCPNDT Document Vault</h2>
              <p className="text-sm text-ink-500">Blockchain-locked compliance records</p>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-terracotta-300 bg-terracotta-50/50'
                : 'border-beige-200 hover:border-terracotta-200 hover:bg-beige-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            {hashing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 text-terracotta-500 animate-spin" strokeWidth={1.5} />
                <p className="font-serif text-lg text-ink-800">Generating SHA-256 Hash…</p>
                <div className="font-mono text-xs text-terracotta-500 animate-hash-pulse tracking-wider">
                  0x████████████████████████████████████████
                </div>
                <p className="text-xs text-ink-400">Locking record to blockchain ledger</p>
              </div>
            ) : (
              <>
                <UploadCloud className="w-10 h-10 text-terracotta-400 mx-auto mb-3" strokeWidth={1.5} />
                <p className="font-serif text-lg text-ink-800 mb-1">Drop ultrasound scans here</p>
                <p className="text-sm text-ink-400">or click to browse — DICOM, JPG, PDF</p>
              </>
            )}
          </div>
          
          {/* Patient Documents */}
          <div className="mt-6 flex-1">
            <h3 className="label-text mb-3 flex items-center justify-between">
              Patient Documents
              <span className="text-xs bg-beige-100 px-2 py-0.5 rounded-full text-ink-500">
                {(queue.find(p => p.id === selectedPatientId)?.documents || []).length} Total
              </span>
            </h3>
            
            <div className="space-y-3">
              {(queue.find(p => p.id === selectedPatientId)?.documents || []).length === 0 ? (
                <p className="text-sm text-ink-400">No documents found for this patient.</p>
              ) : (
                (queue.find(p => p.id === selectedPatientId)?.documents || []).map((doc: any) => (
                  <div key={doc.id || doc.hash} className="bg-beige-50 rounded-xl p-4 border border-beige-200 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        <ScanLine className="w-4 h-4 text-sage-500 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-900 leading-tight">{doc.name}</p>
                          <p className="text-xs text-ink-400">{doc.type}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-beige-200 transition-colors"
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <BadgeCheck className="w-3.5 h-3.5 text-sage-500" strokeWidth={1.5} />
                      <span className="text-xs text-sage-500 font-medium">PCPNDT Compliant</span>
                      <FileCheck className="w-3.5 h-3.5 text-sage-500 ml-1" strokeWidth={1.5} />
                      <span className="text-xs text-sage-500 font-medium">Verified</span>
                    </div>
                    {doc.uploadedBy && (
                      <p className="text-[10px] text-ink-400 mb-1 font-medium">Uploaded by: {doc.uploadedBy}</p>
                    )}
                    <p className="font-mono text-[10px] text-ink-400 break-all leading-relaxed">{doc.hash}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Session Uploads (Pending) */}
          {uploadedFiles.length > 0 && (
            <div className="mt-5 space-y-3 pt-5 border-t border-beige-200">
              <p className="label-text text-terracotta-500">Session Uploads</p>
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="bg-beige-50 rounded-xl p-4 border border-beige-200 animate-fade-in">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-4 h-4 text-sage-500" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-ink-900">{file.name}</span>
                    </div>
                    <button onClick={() => removeFile(idx)} className="text-ink-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <BadgeCheck className="w-3.5 h-3.5 text-sage-500" strokeWidth={1.5} />
                    <span className="text-xs text-sage-500 font-medium">PCPNDT Compliant</span>
                    <FileCheck className="w-3.5 h-3.5 text-sage-500 ml-1" strokeWidth={1.5} />
                    <span className="text-xs text-sage-500 font-medium">Merkle Root Verified</span>
                  </div>
                  <p className="font-mono text-xs text-ink-400 break-all leading-relaxed">{file.hash}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Register New Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-beige-200 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-beige-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-terracotta-50 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-terracotta-500" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-ink-900">Register New Patient</h3>
                  <p className="text-xs text-ink-500">Add maternal record to database and smart triage queue</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-beige-100 hover:bg-beige-200 text-ink-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="label-text block mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Sunita Rao"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text block mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    min={15}
                    max={60}
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="26"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="label-text block mb-1">Weeks</label>
                  <input
                    type="number"
                    min={1}
                    max={42}
                    value={newWeeks}
                    onChange={(e) => setNewWeeks(e.target.value)}
                    placeholder="16"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text block mb-1">Gravida (G)</label>
                  <input
                    type="number"
                    min={1}
                    value={newGravida}
                    onChange={(e) => setNewGravida(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text block mb-1">Para (P)</label>
                  <input
                    type="number"
                    min={0}
                    value={newPara}
                    onChange={(e) => setNewPara(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text block mb-1">Blood Group</label>
                  <select
                    value={newBloodGroup}
                    onChange={(e) => setNewBloodGroup(e.target.value)}
                    className="input-field bg-white"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text block mb-1">Estimated Due Date (EDD)</label>
                  <input
                    type="date"
                    value={newEdd}
                    onChange={(e) => setNewEdd(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text block mb-1">Initial Risk Level</label>
                  <select
                    value={newRiskLevel}
                    onChange={(e) => setNewRiskLevel(e.target.value as any)}
                    className="input-field bg-white"
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk (Escalate)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-text block mb-1">Chief Complaint / Initial Notes</label>
                <input
                  type="text"
                  value={newComplaint}
                  onChange={(e) => setNewComplaint(e.target.value)}
                  placeholder="e.g. Routine 2nd trimester check-up, mild fatigue"
                  className="input-field"
                />
              </div>

              <div className="pt-2 border-t border-beige-200">
                <p className="label-text mb-3">Optional Initial Vitals (Can also be triaged later)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-ink-500 block mb-1">BP Sys</label>
                    <input
                      type="number"
                      value={newBpSys}
                      onChange={(e) => setNewBpSys(e.target.value)}
                      placeholder="120"
                      className="input-field text-sm py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 block mb-1">BP Dia</label>
                    <input
                      type="number"
                      value={newBpDia}
                      onChange={(e) => setNewBpDia(e.target.value)}
                      placeholder="80"
                      className="input-field text-sm py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 block mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="62.5"
                      className="input-field text-sm py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-ink-500 block mb-1">FHR (bpm)</label>
                    <input
                      type="number"
                      value={newFhr}
                      onChange={(e) => setNewFhr(e.target.value)}
                      placeholder="145"
                      className="input-field text-sm py-1.5"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-beige-200 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPatient || !newName.trim() || !newAge}
                  className="btn-terracotta px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingPatient ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering…
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Register Patient
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DocumentViewerModal 
        viewingDoc={viewingDoc} 
        activePatient={queue.find(p => p.id === selectedPatientId)} 
        onClose={() => setViewingDoc(null)} 
      />
    </div>
  );
}