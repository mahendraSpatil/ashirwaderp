import { useState, useEffect, useMemo } from 'react';
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
  Plus,
  Search,
  RefreshCw,
  X,
  Calendar,
  Layers,
  Coins,
  Trash2,
  Sparkles,
  Building2,
  TrendingDown,
  ShieldAlert,
  Printer,
} from 'lucide-react';
import type { Prescription, PrescriptionStatus, AuditCategory, InventoryItem, PharmacyRevenue } from '@/types';
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

const medicineCategories = [
  'Supplement',
  'Antihypertensive',
  'Uterotonic',
  'Anticonvulsant',
  'Antibiotic',
  'Analgesic',
  'IV Fluid',
  'Anti-emetic',
  'Hormone',
  'Other',
];

const standardUnits = ['Tablet', 'Capsule', 'Ampoule', 'Vial', 'Bottle', 'Strip', 'IV Bag', 'Syrup'];

const commonMaternityMedicines = [
  { name: 'Labetalol 200mg', category: 'Antihypertensive', unit: 'Tablet', rate: 18.5, reorder: 40 },
  { name: 'Oxytocin 10 IU', category: 'Uterotonic', unit: 'Ampoule', rate: 42.0, reorder: 50 },
  { name: 'Folic Acid 5mg', category: 'Supplement', unit: 'Tablet', rate: 3.5, reorder: 80 },
  { name: 'Iron & Folic Acid (IFA)', category: 'Supplement', unit: 'Tablet', rate: 5.0, reorder: 100 },
  { name: 'Calcium + Vitamin D3', category: 'Supplement', unit: 'Tablet', rate: 8.5, reorder: 60 },
  { name: 'Magnesium Sulfate 50%', category: 'Anticonvulsant', unit: 'Ampoule', rate: 65.0, reorder: 30 },
  { name: 'Tranexamic Acid 500mg', category: 'Uterotonic', unit: 'Ampoule', rate: 85.0, reorder: 25 },
  { name: 'Methergine 0.2mg', category: 'Uterotonic', unit: 'Ampoule', rate: 38.0, reorder: 35 },
  { name: 'Cefixime 200mg', category: 'Antibiotic', unit: 'Tablet', rate: 22.0, reorder: 40 },
  { name: 'Paracetamol 500mg', category: 'Analgesic', unit: 'Tablet', rate: 4.0, reorder: 100 },
  { name: 'Ondansetron 4mg', category: 'Anti-emetic', unit: 'Tablet', rate: 12.0, reorder: 30 },
];

export default function PharmacyDashboard({
  prescriptions,
  onAdvanceRx,
  onAuditLog,
}: PharmacyDashboardProps) {
  const [activeStep, setActiveStep] = useState<PrescriptionStatus>('Pending');
  const [livePrescriptions, setLivePrescriptions] = useState<Prescription[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preorderToast, setPreorderToast] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'Low' | 'InStock' | 'ExpiringSoon'>('All');

  // Add Medicine Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Pharmacy Revenue State
  const [pharmacyRevenue, setPharmacyRevenue] = useState<PharmacyRevenue[]>([
    { id: 'PR-101', date: new Date().toISOString(), billId: 'BILL-441', patientId: 'UPID-1055', items: 'Labetalol 200mg (30), Folic Acid 5mg (30)', quantity: 60, amount: 660, paymentMethod: 'UPI', category: 'Prescription Sales' },
    { id: 'PR-102', date: new Date().toISOString(), billId: 'BILL-442', patientId: '', items: 'Paracetamol 500mg (10)', quantity: 10, amount: 40, paymentMethod: 'Cash', category: 'OTC Sales' },
  ]);

  const handleDeletePharmacyRevenue = (id: string) => {
    if (confirm('Are you sure you want to delete this revenue entry?')) {
      setPharmacyRevenue(prev => prev.filter(entry => entry.id !== id));
    }
  };

  // Billing Modal State
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [selectedRxForBill, setSelectedRxForBill] = useState<Prescription | null>(null);
  const [billDetails, setBillDetails] = useState<{ rate: number; quantity: number; total: number } | null>(null);

  // Form fields
  const [medName, setMedName] = useState('');
  const [category, setCategory] = useState('Supplement');
  const [unit, setUnit] = useState('Tablet');
  const [rate, setRate] = useState<number | ''>('');
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [reorderLevel, setReorderLevel] = useState<number>(50);
  const [supplier, setSupplier] = useState('');

  // Quick auto-generate batch code
  const handleAutoGenerateBatch = () => {
    const prefix = medName.trim()
      ? medName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
      : 'BAT';
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    setBatchId(`${prefix}-${year}-${rand}`);
  };

  // Quick prefill from common medicines
  const handleSelectCommonMedicine = (med: (typeof commonMaternityMedicines)[0]) => {
    setMedName(med.name);
    setCategory(med.category);
    setUnit(med.unit);
    setRate(med.rate);
    setReorderLevel(med.reorder);
    if (!batchId) {
      const prefix = med.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
      const rand = Math.floor(100 + Math.random() * 900);
      setBatchId(`${prefix}-2026-${rand}`);
    }
  };

  // Merge prop prescriptions with live backend prescriptions
  const allPrescriptions = [
    ...prescriptions,
    ...livePrescriptions.filter(
      (lr) => !prescriptions.some((p) => p.id === lr.id || (p as any)._id === lr.id)
    ),
  ];

  const filteredRx = allPrescriptions.filter((rx) => rx.status === activeStep);

  const fetchLiveData = async () => {
    try {
      const [inventoryData, rxData, forecastData] = await Promise.all([
        api.getInventory().catch(() => []),
        api.getPrescriptions().catch(() => []),
        api.getForecasts().catch(() => []),
      ]);

      const formattedData: InventoryItem[] = (inventoryData || []).map((batch: any) => ({
        id: batch._id || batch.id,
        name: batch.medicine?.medicineName || batch.medicineName || 'Unknown Medicine',
        category: batch.medicine?.category || batch.category || 'Other',
        batchId: (batch.batchId || batch._id || 'BATCH').toUpperCase(),
        expiryDate: batch.expiryDate || new Date().toISOString(),
        stock: batch.quantity !== undefined ? batch.quantity : 0,
        rate: Number(batch.rate || batch.medicine?.rate || 0),
        unit: batch.medicine?.unit || batch.unit || 'Tablet',
        reorderLevel: Number(batch.medicine?.reorderLevel || batch.reorderLevel || 50),
        supplier: batch.supplier || '',
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
        prescribedBy:
          typeof rx.prescribedBy === 'object'
            ? rx.prescribedBy?.fullName || 'Dr. Ananya Iyer'
            : rx.prescribedBy || 'Dr. Ananya Iyer',
        timestamp: rx.createdAt || rx.timestamp || new Date().toISOString(),
      }));
      setLivePrescriptions(formattedRx);

      // Setup forecast chart data
      if (forecastData && forecastData.length > 0 && forecastData[0].supplement) {
        setForecasts(forecastData);
      } else {
        setForecasts([
          { supplement: 'Folic Acid', predictedDemand: 280, currentStock: 150 },
          { supplement: 'Iron Tabs', predictedDemand: 310, currentStock: 350 },
          { supplement: 'Calcium + D3', predictedDemand: 190, currentStock: 220 },
          { supplement: 'Labetalol', predictedDemand: 120, currentStock: 80 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Form Submit: Add New Medicine & Batch
  const handleAddMedicineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!medName.trim()) {
      setFormError('Please enter a medicine name');
      return;
    }
    if (!batchId.trim()) {
      setFormError('Please provide a batch number / ID');
      return;
    }
    if (quantity === '' || Number(quantity) < 0) {
      setFormError('Please enter a valid stock quantity');
      return;
    }
    if (!expiryDate) {
      setFormError('Please select an expiry date');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        medicineName: medName.trim(),
        category,
        unit,
        rate: Number(rate) || 0,
        batchId: batchId.trim().toUpperCase(),
        quantity: Number(quantity),
        expiryDate,
        reorderLevel: Number(reorderLevel) || 50,
        supplier: supplier.trim(),
      };

      await api.addMedicine(payload);

      // Log in cryptographic audit log
      onAuditLog(
        `Added medicine batch ${payload.batchId} (${payload.quantity} ${payload.unit}) for ${payload.medicineName} @ ₹${payload.rate}/${payload.unit}`,
        'Karthik Rao',
        'system'
      );

      setSuccessToast(`Stock batch ${payload.batchId} added successfully!`);
      setTimeout(() => setSuccessToast(null), 3500);

      // Reset form
      setMedName('');
      setBatchId('');
      setQuantity('');
      setRate('');
      setExpiryDate('');
      setSupplier('');
      setReorderLevel(50);
      setIsAddModalOpen(false);

      // Refresh live inventory
      await fetchLiveData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add medicine stock batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvance = async (rx: Prescription, dispenseQuantity = 30) => {
    const rxId = (rx as any)._id || rx.id;
    const isDispensing = rx.status === 'Approved_Pending_Payment';
    const nextStatus: PrescriptionStatus =
      rx.status === 'Pending' ? 'Approved_Pending_Payment' : 'Paid_And_Dispensed';

    onAdvanceRx(rx.id);
    setLivePrescriptions((prev) =>
      prev.map((r) =>
        r.id === rxId || (r as any)._id === rxId ? { ...r, status: nextStatus } : r
      )
    );

    try {
      await api.advancePrescription(rxId, 'Karthik Rao');
    } catch (err) {
      console.error('Failed to advance prescription in database:', err);
    }

    if (isDispensing) {
      try {
        await api.deductInventory(rx.medicineName, dispenseQuantity);
        await fetchLiveData();
      } catch (error) {
        console.error('Failed to deduct stock in database:', error);
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

  const handleOpenBillModal = (rx: Prescription) => {
    const inventoryItem = inventory.find(
      (item) =>
        item.name.toLowerCase() === rx.medicineName.toLowerCase() ||
        rx.medicineName.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(rx.medicineName.toLowerCase())
    );
    const rate = inventoryItem?.rate || 0;
    const quantity = 30; // Default quantity
    
    setBillDetails({ rate, quantity, total: rate * quantity });
    setSelectedRxForBill(rx);
    setBillModalOpen(true);
  };

  const handleConfirmBillAndDispense = async () => {
    if (!selectedRxForBill || !billDetails) return;
    await handleAdvance(selectedRxForBill, billDetails.quantity);
    
    // Add to pharmacy revenue
    const newRevenue: PharmacyRevenue = {
      id: `PR-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toISOString(),
      billId: `BILL-${Math.floor(Math.random() * 10000)}`,
      patientId: selectedRxForBill.upid,
      items: `${selectedRxForBill.medicineName} (${billDetails.quantity})`,
      quantity: billDetails.quantity,
      amount: billDetails.total,
      paymentMethod: 'UPI', // Defaulting for mock
      category: 'Prescription Sales'
    };
    setPharmacyRevenue(prev => [newRevenue, ...prev]);

    setBillModalOpen(false);
    setSelectedRxForBill(null);
    
    setSuccessToast(`Bill generated and ${selectedRxForBill.medicineName} dispensed successfully!`);
    setTimeout(() => setSuccessToast(null), 3500);
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

  const handleDeleteBatch = async (batchIdToDelete: string, batchName: string, batchCode: string) => {
    if (!confirm(`Are you sure you want to remove batch ${batchCode} of ${batchName}?`)) return;
    try {
      await api.deleteBatch(batchIdToDelete);
      onAuditLog(`Removed stock batch ${batchCode} (${batchName})`, 'Karthik Rao', 'system');
      setInventory((prev) => prev.filter((b) => b.id !== batchIdToDelete));
      setSuccessToast(`Batch ${batchCode} removed.`);
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to remove batch');
    }
  };

  const getStepIndex = (status: PrescriptionStatus) =>
    statusSteps.findIndex((s) => s.status === status);

  // Check if a batch is expiring within 60 days
  const isExpiringSoon = (dateStr: string) => {
    const exp = new Date(dateStr).getTime();
    const now = Date.now();
    const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 60;
  };

  const isExpired = (dateStr: string) => {
    return new Date(dateStr).getTime() < Date.now();
  };

  // Filtered Inventory List
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategoryFilter === 'All' || item.category === selectedCategoryFilter;

      let matchesStock = true;
      if (stockStatusFilter === 'Low') {
        matchesStock = item.stock <= item.reorderLevel;
      } else if (stockStatusFilter === 'InStock') {
        matchesStock = item.stock > item.reorderLevel;
      } else if (stockStatusFilter === 'ExpiringSoon') {
        matchesStock = isExpiringSoon(item.expiryDate) || isExpired(item.expiryDate);
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [inventory, searchTerm, selectedCategoryFilter, stockStatusFilter]);

  // Inventory Totals
  const totalStockUnits = useMemo(
    () => inventory.reduce((acc, item) => acc + (item.stock || 0), 0),
    [inventory]
  );

  const totalInventoryValuation = useMemo(
    () =>
      inventory.reduce(
        (acc, item) => acc + (item.stock || 0) * (item.rate || 0),
        0
      ),
    [inventory]
  );

  const lowStockCount = useMemo(
    () => inventory.filter((item) => item.stock <= item.reorderLevel).length,
    [inventory]
  );

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 print:hidden">
        {/* Success Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-sage-600 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in border border-sage-400">
          <CheckCircle2 className="w-5 h-5 text-sage-200" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Top 3-Step Dispensary Queue Lock Banner */}
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

      {/* Grid: E-Rx Queue + AI Demand Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* E-Rx Queue */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Pill className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
            <h3 className="font-serif text-xl text-ink-900">E-Rx Queue</h3>
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-terracotta-50 text-terracotta-600 font-medium">
              {filteredRx.length}{' '}
              {activeStep === 'Pending'
                ? 'pending'
                : activeStep === 'Approved_Pending_Payment'
                ? 'awaiting payment'
                : 'dispensed'}
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
                      onClick={() => handleOpenBillModal(rx)}
                      className="btn-sage px-4 py-2 text-sm flex items-center gap-2"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Generate Bill & Dispense
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

        {/* AI Demand Forecast */}
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

      {/* Main Inventory Section with Add Medicine Action & Controls */}
      <div className="card p-6">
        {/* Section Header with Action Buttons & Summary Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terracotta-50 flex items-center justify-center shadow-soft">
              <Package className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-2xl text-ink-900">Live Inventory & Stock Batches</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sage-50 text-sage-600 font-medium border border-sage-200">
                  FIFO Model
                </span>
              </div>
              <p className="text-xs text-ink-400">
                Track batch numbers, expiry dates, rates, and live stock levels
              </p>
            </div>
          </div>

          {/* Primary Action Button to Add New Medicine & Stock */}
          <div className="flex items-center gap-3">
            <button
              onClick={fetchLiveData}
              title="Refresh inventory"
              className="p-2.5 rounded-xl border border-beige-200 bg-white/70 hover:bg-beige-100 text-ink-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                setFormError(null);
                handleAutoGenerateBatch();
                setIsAddModalOpen(true);
              }}
              className="btn-terracotta px-4 py-2.5 flex items-center gap-2 text-sm font-medium shadow-soft"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add Medicine & Batch
            </button>
          </div>
        </div>

        {/* Inventory Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-beige-50/70 border border-beige-200 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-ink-400 text-xs mb-1">
              <Layers className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Total Batches</span>
            </div>
            <p className="font-serif text-xl font-semibold text-ink-900">{inventory.length}</p>
          </div>
          <div className="bg-beige-50/70 border border-beige-200 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-ink-400 text-xs mb-1">
              <Package className="w-3.5 h-3.5 text-sage-500" />
              <span>Total Live Units</span>
            </div>
            <p className="font-serif text-xl font-semibold text-ink-900">{totalStockUnits.toLocaleString()}</p>
          </div>
          <div className="bg-beige-50/70 border border-beige-200 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-ink-400 text-xs mb-1">
              <Coins className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Inventory Valuation</span>
            </div>
            <p className="font-serif text-xl font-semibold text-terracotta-600">
              ₹ {totalInventoryValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-beige-50/70 border border-beige-200 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-ink-400 text-xs mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
              <span>Low Stock Alerts</span>
            </div>
            <p className="font-serif text-xl font-semibold text-amber-600">{lowStockCount}</p>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search medicine name, batch ID, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 py-2 text-sm bg-white/80"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Category Dropdown */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="text-xs rounded-xl border border-beige-200 bg-white/80 px-3 py-2 text-ink-700 focus:outline-none focus:ring-1 focus:ring-terracotta-400"
            >
              <option value="All">All Categories</option>
              {medicineCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Stock Status Filter Pills */}
            <div className="flex bg-beige-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setStockStatusFilter('All')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  stockStatusFilter === 'All' ? 'bg-white text-ink-900 shadow-xs font-medium' : 'text-ink-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStockStatusFilter('Low')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  stockStatusFilter === 'Low' ? 'bg-white text-terracotta-600 shadow-xs font-medium' : 'text-ink-500'
                }`}
              >
                Low Stock
              </button>
              <button
                onClick={() => setStockStatusFilter('ExpiringSoon')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  stockStatusFilter === 'ExpiringSoon' ? 'bg-white text-amber-600 shadow-xs font-medium' : 'text-ink-500'
                }`}
              >
                Expiring
              </button>
            </div>
          </div>
        </div>

        {/* Live Inventory Table */}
        <div className="overflow-x-auto rounded-2xl border border-beige-200 bg-white/40">
          {loading ? (
            <div className="py-12 text-center text-ink-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-terracotta-500" />
              Loading live inventory records...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-beige-200 bg-beige-50/80">
                  <th className="text-left py-3.5 px-4 label-text font-medium">Medicine Name</th>
                  <th className="text-left py-3.5 px-3 label-text font-medium">Category</th>
                  <th className="text-left py-3.5 px-3 label-text font-medium">Batch No.</th>
                  <th className="text-right py-3.5 px-3 label-text font-medium">Rate / Unit</th>
                  <th className="text-right py-3.5 px-3 label-text font-medium">Live Stock</th>
                  <th className="text-right py-3.5 px-3 label-text font-medium">Batch Value</th>
                  <th className="text-left py-3.5 px-3 label-text font-medium">Expiry Date</th>
                  <th className="text-left py-3.5 px-3 label-text font-medium">Status</th>
                  <th className="text-center py-3.5 px-3 label-text font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-100">
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-ink-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-beige-300" />
                      <p className="font-medium">No inventory items match your search/filter</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategoryFilter('All');
                          setStockStatusFilter('All');
                        }}
                        className="mt-2 text-xs text-terracotta-500 hover:underline"
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                )}
                {filteredInventory.map((item) => {
                  const lowStock = item.stock <= item.reorderLevel;
                  const expired = isExpired(item.expiryDate);
                  const expiring = !expired && isExpiringSoon(item.expiryDate);
                  const batchValuation = (item.stock || 0) * (item.rate || 0);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-beige-50/70 transition-colors group"
                    >
                      {/* Medicine Name & Supplier */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink-900">{item.name}</div>
                        {item.supplier && (
                          <div className="text-[11px] text-ink-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            <span>{item.supplier}</span>
                          </div>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-beige-100 text-ink-600 border border-beige-200">
                          {item.category}
                        </span>
                      </td>

                      {/* Batch ID */}
                      <td className="py-3 px-3 font-mono text-xs text-ink-600 font-semibold">
                        <span className="bg-terracotta-50 text-terracotta-700 px-2 py-0.5 rounded-md border border-terracotta-100">
                          {item.batchId}
                        </span>
                      </td>

                      {/* Rate / Unit */}
                      <td className="py-3 px-3 text-right font-medium text-ink-800">
                        {item.rate > 0 ? (
                          <span>₹ {item.rate.toFixed(2)}</span>
                        ) : (
                          <span className="text-ink-300 text-xs">—</span>
                        )}
                        <span className="text-ink-400 text-[11px] block leading-none mt-0.5">
                          per {item.unit}
                        </span>
                      </td>

                      {/* Live Stock */}
                      <td className={`py-3 px-3 text-right font-medium ${lowStock ? 'text-terracotta-600 font-bold' : 'text-ink-900'}`}>
                        <div className="text-base leading-tight">{item.stock}</div>
                        <div className="text-xs text-ink-400 leading-tight">{item.unit}s</div>
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-3 text-right font-medium text-terracotta-700">
                        ₹ {batchValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3 px-3 text-ink-600">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-ink-400" />
                          <span>
                            {new Date(item.expiryDate).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        {expired ? (
                          <span className="text-[10px] text-red-600 font-semibold block mt-0.5">
                            Expired
                          </span>
                        ) : expiring ? (
                          <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                            Expiring in &lt; 60 days
                          </span>
                        ) : null}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        {expired ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium border border-red-200">
                            <ShieldAlert className="w-3 h-3" /> Expired
                          </span>
                        ) : lowStock ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-terracotta-50 text-terracotta-600 font-medium border border-terracotta-200">
                            <AlertCircle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sage-50 text-sage-600 font-medium border border-sage-200">
                            <CheckCircle2 className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleDeleteBatch(item.id, item.name, item.batchId)}
                          title="Delete / Archive Batch"
                          className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pharmacy Revenue Registry */}
      <div className="card p-6 border-2 border-sage-100 bg-gradient-to-br from-white to-sage-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center shadow-soft">
              <Coins className="w-5 h-5 text-sage-600" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-ink-900">Pharmacy Revenue Registry</h3>
              <p className="text-xs text-ink-400">Track all prescription and OTC sales</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] text-ink-400 font-medium">Today's Collection</p>
              <p className="font-serif text-xl text-sage-600 font-bold">
                ₹{pharmacyRevenue.reduce((sum, r) => sum + r.amount, 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-beige-200 bg-white/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-200 bg-beige-50/50">
                <th className="text-left py-3 px-4 label-text font-medium">Time</th>
                <th className="text-left py-3 px-4 label-text font-medium">Bill ID</th>
                <th className="text-left py-3 px-4 label-text font-medium">Category</th>
                <th className="text-left py-3 px-4 label-text font-medium">Items Dispensed</th>
                <th className="text-right py-3 px-4 label-text font-medium">Qty</th>
                <th className="text-right py-3 px-4 label-text font-medium">Amount</th>
                <th className="text-right py-3 px-4 label-text font-medium">Status</th>
                <th className="text-center py-3 px-4 label-text font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beige-100">
              {pharmacyRevenue.map((entry) => (
                <tr key={entry.id} className="hover:bg-beige-50/50 transition-colors">
                  <td className="py-3 px-4 text-ink-600">
                    {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-ink-700">
                    {entry.billId}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-beige-100 text-ink-600 border border-beige-200">
                      {entry.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-ink-900">{entry.items}</div>
                    {entry.patientId && <div className="text-[11px] text-ink-400 font-mono mt-0.5">Pt: {entry.patientId}</div>}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-ink-800">
                    {entry.quantity}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-terracotta-600">
                    ₹{entry.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-sage-50 text-sage-600 font-medium border border-sage-100">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDeletePharmacyRevenue(entry.id)}
                      title="Delete Entry"
                      className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 transition-colors inline-block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {pharmacyRevenue.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-ink-400 text-sm">
                    No revenue recorded today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL: PATIENT BILLING & DISPENSE                         */}
      {/* ========================================================= */}
      {billModalOpen && selectedRxForBill && billDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm print:static print:bg-white print:backdrop-blur-none animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-beige-200 print:shadow-none print:border-none print:p-0 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-beige-200 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sage-50 flex items-center justify-center shadow-soft">
                  <CreditCard className="w-5 h-5 text-sage-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-ink-900">Patient Bill</h3>
                  <p className="text-xs text-ink-500">
                    Review and print the bill before dispensing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBillModalOpen(false)}
                className="p-2 rounded-xl text-ink-400 hover:text-ink-700 hover:bg-beige-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Invoice Area */}
            <div className="print:block">
              <div className="text-center mb-6 hidden print:block">
                <h2 className="font-serif text-2xl text-ink-900 font-bold">HealthCare Pharmacy</h2>
                <p className="text-sm text-ink-500">Official Patient Invoice</p>
                <div className="mt-2 text-xs text-ink-400">Date: {new Date().toLocaleDateString()}</div>
              </div>

              <div className="bg-beige-50 rounded-2xl p-5 mb-6 print:bg-transparent print:border print:border-beige-200">
                <h4 className="font-medium text-ink-900 mb-4 border-b border-beige-200 pb-2">Patient Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-ink-400 text-xs">Patient Name</p>
                    <p className="font-medium text-ink-900">{selectedRxForBill.patientName}</p>
                  </div>
                  <div>
                    <p className="text-ink-400 text-xs">Patient ID (UPID)</p>
                    <p className="font-medium text-ink-900 font-mono">{selectedRxForBill.upid}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-ink-400 text-xs">Prescribed By</p>
                    <p className="font-medium text-ink-900">{selectedRxForBill.prescribedBy}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-ink-900 mb-3 border-b border-beige-200 pb-2">Prescription Items</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-400 text-xs border-b border-beige-100">
                      <th className="pb-2 font-medium">Medicine</th>
                      <th className="pb-2 font-medium text-center">Qty</th>
                      <th className="pb-2 font-medium text-right">Rate</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-beige-100">
                    <tr>
                      <td className="py-3">
                        <div className="font-medium text-ink-900">{selectedRxForBill.medicineName}</div>
                        <div className="text-xs text-ink-400">{selectedRxForBill.dosage}</div>
                      </td>
                      <td className="py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={billDetails.quantity}
                          onChange={(e) => {
                            const q = Number(e.target.value) || 1;
                            setBillDetails({ ...billDetails, quantity: q, total: q * billDetails.rate });
                          }}
                          className="w-16 text-center input-field py-1 px-2 mx-auto print:hidden"
                        />
                        <span className="hidden print:inline">{billDetails.quantity}</span>
                      </td>
                      <td className="py-3 text-right">
                        ₹{billDetails.rate > 0 ? billDetails.rate.toFixed(2) : '0.00'}
                      </td>
                      <td className="py-3 text-right font-medium text-ink-900">
                        ₹{billDetails.total.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-beige-200">
                      <td colSpan={3} className="py-3 text-right font-medium text-ink-900">Total Amount:</td>
                      <td className="py-3 text-right font-bold text-terracotta-600 text-lg">
                        ₹{billDetails.total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {billDetails.rate === 0 && (
                  <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-100 text-amber-700 px-3 py-2 rounded-lg text-xs print:hidden">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Warning: Rate not found in inventory. It will be billed at ₹0.00.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-beige-200 print:hidden">
              <button
                onClick={() => window.print()}
                className="btn-ghost px-5 py-2.5 text-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Bill
              </button>
              <button
                onClick={handleConfirmBillAndDispense}
                className="btn-sage px-6 py-2.5 text-sm font-medium flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Dispense Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD NEW MEDICINE & BATCH STOCK                     */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-7 shadow-2xl border border-beige-200 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-beige-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-terracotta-50 flex items-center justify-center shadow-soft">
                  <Package className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-ink-900">Add Medicine & Stock Batch</h3>
                  <p className="text-xs text-ink-500">
                    Register medicine profile, batch number, live stock & rate
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-ink-400 hover:text-ink-700 hover:bg-beige-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Suggestions for Maternity OPD */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 text-xs text-ink-400 font-medium mb-2">
                <Sparkles className="w-3.5 h-3.5 text-terracotta-500" />
                <span>Quick Prefill Common Maternity OPD Medicines:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {commonMaternityMedicines.slice(0, 6).map((m) => (
                  <button
                    type="button"
                    key={m.name}
                    onClick={() => handleSelectCommonMedicine(m)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-beige-100 hover:bg-terracotta-50 hover:text-terracotta-700 text-ink-700 transition-colors border border-beige-200"
                  >
                    + {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleAddMedicineSubmit} className="space-y-4">
              {/* Medicine Name */}
              <div>
                <label className="label-text block mb-1">
                  Medicine Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Labetalol 200mg, Oxytocin 10 IU, Folic Acid 5mg"
                  className="input-field"
                  required
                />
              </div>

              {/* Grid 2: Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-field bg-white"
                  >
                    {medicineCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text block mb-1">Unit Type</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="input-field bg-white"
                  >
                    {standardUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid 2: Batch ID & Auto-Gen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label-text">
                      Batch Number / ID <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateBatch}
                      className="text-[11px] text-terracotta-500 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Gen
                    </button>
                  </div>
                  <input
                    type="text"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    placeholder="e.g. BAT-2026-101"
                    className="input-field font-mono text-xs uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="label-text block mb-1">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Grid 3: Live Stock, Rate (₹), Reorder Level */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label-text block mb-1">
                    Live Stock Present <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 150"
                    className="input-field font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="label-text block mb-1">
                    Rate of Medicine (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 18.50"
                    className="input-field font-medium"
                  />
                </div>

                <div>
                  <label className="label-text block mb-1">
                    Reorder Alert Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(Number(e.target.value) || 50)}
                    placeholder="e.g. 50"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Supplier / Distributor */}
              <div>
                <label className="label-text block mb-1">Supplier / Distributor (Optional)</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Cipla Pharma / Sun Pharmaceuticals / Local Distributor"
                  className="input-field"
                />
              </div>

              {/* Estimated Valuation Summary Box */}
              {Number(quantity) > 0 && Number(rate) > 0 && (
                <div className="bg-sage-50 border border-sage-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                  <span className="text-sage-700 font-medium flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-sage-600" />
                    Estimated Batch Stock Valuation:
                  </span>
                  <span className="font-serif text-sm font-bold text-sage-800">
                    ₹ {(Number(quantity) * Number(rate)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Error Box */}
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm animate-fade-in">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-beige-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-ghost px-5 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-terracotta px-6 py-2.5 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving Stock...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add to Live Inventory
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}