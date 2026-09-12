import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Pill,
  Package,
  Brain,
  CheckCircle2,
  Clock,
  FlaskConical,
  AlertCircle,
  CreditCard,
  Zap,
  ShoppingCart,
} from 'lucide-react';
import type { Prescription, PrescriptionStatus, AuditCategory } from '@/types';
import { api } from '@/services/api'; 

interface PharmacyDashboardProps {
  prescriptions: Prescription[];
  onAdvanceRx: (id: string) => void;
  onAuditLog: (action: string, actor: string, category: AuditCategory) => string;
}

const statusSteps: { status: PrescriptionStatus; label: string; icon: typeof Clock; color: string }[] = [
  { status: 'Pending', label: 'Pending', icon: Clock, color: 'text-amber-500' },
  { status: 'Approved_Pending_Payment', label: 'Waiting for Payment', icon: CreditCard, color: 'text-terracotta-500' },
  { status: 'Paid_And_Dispensed', label: 'Paid & Dispensed', icon: FlaskConical, color: 'text-sage-500' },
];

export default function PharmacyDashboard({
  prescriptions,
  onAdvanceRx,
  onAuditLog,
}: PharmacyDashboardProps) {
  const [activeStep, setActiveStep] = useState<PrescriptionStatus>('Pending');
  
  const [livePrescriptions, setLivePrescriptions] = useState<Prescription[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preorderToast, setPreorderToast] = useState<string | null>(null);

  // Merge prop prescriptions with live backend prescriptions
  const allPrescriptions = [
    ...prescriptions,
    ...livePrescriptions.filter((lr) => !prescriptions.some((p) => (p.id === lr.id || (p as any)._id === lr.id)))
  ];

  const filteredRx = allPrescriptions.filter((rx) => rx.status === activeStep);

  const fetchLiveData = async () => {
    try {
      const [inventoryData, rxData, forecastData] = await Promise.all([
        api.getInventory().catch(() => []),
        api.getPrescriptions().catch(() => []),
        api.getForecasts().catch(() => []),
      ]);
      
      const formattedData = (inventoryData || []).map((batch: any) => ({
        id: batch._id || batch.id,
        name: batch.medicine?.medicineName || batch.medicineName || 'Unknown Medicine',
        category: batch.medicine?.category || 'General',
        batchId: (batch._id || batch.id || 'BATCH').substring(0, 8).toUpperCase(),
        expiryDate: batch.expiryDate || new Date().toISOString(),
        stock: batch.quantity || 0,
        unit: 'Tabs',
        reorderLevel: 50
      }));
      
      setInventory(formattedData);

      const formattedRx: Prescription[] = (rxData || []).map((rx: any) => ({
        id: rx._id || rx.id,
        patientId: rx.patientId,
        patientName: rx.patientName,
        upid: rx.upid,
        medicineName: rx.medicineName,
        dosage: rx.dosage,
        instructions: rx.instructions || 'As directed by physician',
        status: rx.status || 'Pending',
        prescribedBy: typeof rx.prescribedBy === 'object' ? rx.prescribedBy?.fullName || 'Dr. Ananya Iyer' : rx.prescribedBy || 'Dr. Ananya Iyer',
        timestamp: rx.createdAt || rx.timestamp || new Date().toISOString(),
      }));
      setLivePrescriptions(formattedRx);

      // Setup forecast chart data
      if (forecastData && forecastData.length > 0 && forecastData[0].supplement) {
        setForecasts(forecastData);
      } else {
        // Fallback default demand forecasts for standard maternity supplements
        setForecasts([
          { supplement: 'Folic Acid', predictedDemand: 280, currentStock: 150 },
          { supplement: 'Iron Tabs', predictedDemand: 310, currentStock: 350 },
          { supplement: 'Calcium + D3', predictedDemand: 190, currentStock: 220 },
          { supplement: 'Labetalol', predictedDemand: 120, currentStock: 80 },
        ]);
      }
    } catch (error) {
      console.error("Error fetching live data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvance = async (rx: Prescription) => {
    const rxId = (rx as any)._id || rx.id;
    const isDispensing = rx.status === 'Approved_Pending_Payment';
    const nextStatus: PrescriptionStatus =
      rx.status === 'Pending'
        ? 'Approved_Pending_Payment'
        : 'Paid_And_Dispensed';

    // Optimistically update local and parent state
    onAdvanceRx(rx.id);
    setLivePrescriptions((prev) =>
      prev.map((r) => (r.id === rxId || (r as any)._id === rxId ? { ...r, status: nextStatus } : r))
    );

    try {
      await api.advancePrescription(rxId, 'Karthik Rao');
    } catch (err) {
      console.error("Failed to advance prescription in database:", err);
    }

    if (isDispensing) {
      try {
        await api.deductInventory(rx.medicineName, 30);
        await fetchLiveData();
      } catch (error) {
        console.error("Failed to deduct stock in database:", error);
      }
    }

    const auditStatusLabel =
      rx.status === 'Pending'
        ? 'Approved — Waiting for Payment'
        : rx.status === 'Approved_Pending_Payment'
        ? 'Paid & Dispensed'
        : 'Dispensed';

    onAuditLog(
      `E-Rx ${auditStatusLabel} — ${rx.medicineName} for ${rx.patientName}`,
      'Karthik Rao',
      isDispensing ? 'payment' : 'prescription'
    );
  };

  const handleAutoPreorder = (supplement: string) => {
    setPreorderToast(supplement);
    onAuditLog(
      `Auto-preorder triggered — ${supplement} (AI forecast below reorder threshold)`,
      'Karthik Rao',
      'system'
    );
    setTimeout(() => setPreorderToast(null), 2800);
  };

  const getStepIndex = (status: PrescriptionStatus) =>
    statusSteps.findIndex((s) => s.status === status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-terracotta-50 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-serif text-2xl text-ink-900">Dispensary Queue — 3-Step Lock</h2>
            <p className="text-sm text-ink-500">Stock is only deducted at final dispense</p>
          </div>
        </div>

        <div className="flex items-center justify-between max-w-2xl mx-auto mb-2">
          {statusSteps.map((step, idx) => {
            const isActive = step.status === activeStep;
            const stepIdx = getStepIndex(activeStep);
            const isCompleted = idx < stepIdx;
            return (
              <div key={step.status} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => setActiveStep(step.status)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? 'bg-terracotta-500 shadow-soft scale-110'
                        : isCompleted
                        ? 'bg-sage-100'
                        : 'bg-beige-100'
                    }`}
                  >
                    <step.icon
                      className={`w-6 h-6 transition-colors ${
                        isActive ? 'text-white' : isCompleted ? 'text-sage-500' : 'text-ink-400'
                      }`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors ${
                      isActive ? 'text-terracotta-500' : isCompleted ? 'text-sage-500' : 'text-ink-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {idx < statusSteps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 bg-beige-100 rounded-full relative">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-sage-300 w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Pill className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
            <h3 className="font-serif text-xl text-ink-900">E-Rx Queue</h3>
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-terracotta-50 text-terracotta-600 font-medium">
              {filteredRx.length} {activeStep === 'Pending' ? 'pending' : activeStep === 'Approved_Pending_Payment' ? 'awaiting payment' : 'dispensed'}
            </span>
          </div>

          {filteredRx.length === 0 ? (
            <div className="text-center py-12 text-ink-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-sage-300" strokeWidth={1.5} />
              <p className="text-sm">No prescriptions in this stage</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRx.map((rx) => (
                <div
                  key={rx.id}
                  className="bg-beige-50 rounded-xl p-4 border border-beige-200 animate-fade-in"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-serif text-lg text-ink-900 leading-tight">{rx.patientName}</p>
                      <p className="text-xs text-ink-400 font-mono">{rx.upid}</p>
                      <p className="text-sm text-ink-600 mt-1">
                        {rx.medicineName} · {rx.dosage}
                      </p>
                    </div>
                    <span className="text-xs text-ink-400 whitespace-nowrap">
                      {new Date(rx.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400 mb-3">{rx.instructions}</p>
                  {rx.status === 'Pending' && (
                    <button
                      onClick={() => handleAdvance(rx)}
                      className="btn-terracotta px-4 py-2 text-sm flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verify Stock & Approve
                    </button>
                  )}
                  {rx.status === 'Approved_Pending_Payment' && (
                    <button
                      onClick={() => handleAdvance(rx)}
                      className="btn-sage px-4 py-2 text-sm flex items-center gap-2"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Confirm Pay & Dispense
                    </button>
                  )}
                  {rx.status === 'Paid_And_Dispensed' && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-sage-500 font-medium">
                      <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                      Fully dispensed — stock deducted
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-terracotta-50 flex items-center justify-center">
              <Brain className="w-4 h-4 text-terracotta-500" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-ink-900">AI Demand Forecast</h3>
              <p className="text-xs text-ink-400">Predicted from upcoming EDDs</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={forecasts} margin={{ top: 10, right: 0, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" vertical={false} />
              <XAxis
                dataKey="supplement"
                tick={{ fill: '#7D7A75', fontSize: 11 }}
                axisLine={{ stroke: '#EAE6DF' }}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#7D7A75', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #EAE6DF',
                  borderRadius: '0.75rem',
                  boxShadow: '0 8px 30px -6px rgba(110,80,60,0.12)',
                  fontSize: '0.75rem',
                }}
                cursor={{ fill: 'rgba(158,91,67,0.05)' }}
              />
              <Bar dataKey="predictedDemand" radius={[6, 6, 0, 0]} name="Predicted Demand">
                {forecasts.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.predictedDemand > entry.currentStock ? '#C77A58' : '#9E5B43'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-ink-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-terracotta-500 inline-block" /> Adequate stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-terracotta-400 inline-block" /> Reorder needed
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-beige-200">
            <p className="label-text mb-3">Critical Items — Auto-Preorder</p>
            <div className="flex flex-wrap gap-2">
              {forecasts
                .filter((f) => f.predictedDemand > f.currentStock)
                .map((f) => (
                  <button
                    key={f.supplement}
                    onClick={() => handleAutoPreorder(f.supplement)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-terracotta-50 border border-terracotta-100 text-terracotta-600 text-xs font-medium hover:bg-terracotta-100 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {f.supplement}
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </button>
                ))}
            </div>
            {preorderToast && (
              <div className="mt-3 bg-sage-50 border border-sage-200 text-sage-500 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Auto-preorder placed for {preorderToast}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Package className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
          <h3 className="font-serif text-xl text-ink-900">Live Inventory — FIFO Model</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-8 text-center text-ink-500">Loading live data from MongoDB...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-200">
                  <th className="text-left py-3 px-3 label-text font-medium">Medicine</th>
                  <th className="text-left py-3 px-3 label-text font-medium">Category</th>
                  <th className="text-left py-3 px-3 label-text font-medium">Batch ID</th>
                  <th className="text-left py-3 px-3 label-text font-medium">Expiry</th>
                  <th className="text-right py-3 px-3 label-text font-medium">Stock</th>
                  <th className="text-left py-3 px-3 label-text font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 && (
                   <tr><td colSpan={6} className="text-center py-4 text-ink-400">No inventory found in database.</td></tr>
                )}
                {inventory.map((item) => {
                  const lowStock = item.stock <= item.reorderLevel;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-beige-200 last:border-0 hover:bg-beige-50/50 transition-colors"
                    >
                      <td className="py-3 px-3 font-medium text-ink-900">{item.name}</td>
                      <td className="py-3 px-3 text-ink-500">{item.category}</td>
                      <td className="py-3 px-3 font-mono text-xs text-ink-500">{item.batchId}</td>
                      <td className="py-3 px-3 text-ink-500">
                        {new Date(item.expiryDate).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className={`py-3 px-3 text-right font-medium ${lowStock ? 'text-terracotta-500' : 'text-ink-900'}`}>
                        {item.stock} <span className="text-ink-400 text-xs">{item.unit}</span>
                      </td>
                      <td className="py-3 px-3">
                        {lowStock ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-terracotta-50 text-terracotta-600 font-medium">
                            <AlertCircle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-sage-50 text-sage-500 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}