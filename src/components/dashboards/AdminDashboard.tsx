import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  Link2,
  ShieldCheck,
  Activity,
  Clock,
  Siren,
  FileText,
  Pill,
  Settings,
  ArrowUpRight,
  CreditCard,
  Terminal,
  CircleDot,
  Plus,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Calendar,
  Trash2,
} from 'lucide-react';
import type { AuditEntry, AuditCategory, ClinicalRevenue } from '@/types';
import { api } from '@/services/api'; // The bridge! (Mock data imports removed completely)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  auditLog: AuditEntry[];
}

const priorityConfig: Record<
  string,
  { bg: string; text: string; border: string; icon: typeof Siren; label: string }
> = {
  Emergency: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-100',
    icon: Siren,
    label: 'Emergency',
  },
  Urgent: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    icon: AlertTriangle,
    label: 'Urgent',
  },
  Routine: {
    bg: 'bg-sage-50',
    text: 'text-sage-500',
    border: 'border-sage-100',
    icon: Clock,
    label: 'Routine',
  },
};

const categoryIcon: Record<AuditCategory, typeof FileText> = {
  imaging: Activity,
  prescription: Pill,
  triage: AlertTriangle,
  system: Settings,
  payment: CreditCard,
};

const categoryColor: Record<AuditCategory, string> = {
  imaging: 'text-sage-400',
  prescription: 'text-terracotta-400',
  triage: 'text-amber-400',
  system: 'text-blue-400',
  payment: 'text-purple-400',
};

export default function AdminDashboard({ auditLog }: AdminDashboardProps) {
  // Live Database States
  const [liveQueue, setLiveQueue] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Clinical Registry States
  const [clinicalRegistry, setClinicalRegistry] = useState<ClinicalRevenue[]>([
    { id: 'CR-001', date: new Date().toISOString(), patientId: 'UPID-1024', patientName: 'Aarti Sharma', category: 'Consultation', amount: 800, paymentMethod: 'UPI', project: 'OPD' },
    { id: 'CR-002', date: new Date().toISOString(), patientId: 'UPID-1025', patientName: 'Priya Patel', category: 'Procedure/Surgery', amount: 15000, paymentMethod: 'Card', project: 'Maternity' },
    { id: 'CR-003', date: new Date(Date.now() - 86400000).toISOString(), patientId: 'UPID-1010', patientName: 'Sneha Rao', category: 'IPD & Room Rent', amount: 4500, paymentMethod: 'Cash', project: 'General Ward' },
    { id: 'CR-004', date: new Date(Date.now() - 86400000).toISOString(), category: 'Diagnostic Scan', amount: 1200, paymentMethod: 'UPI', project: 'Radiology' },
  ]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Clinical Revenue Registry', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
    
    const tableColumn = ["Date", "Patient Info", "Category", "Project", "Amount", "Payment"];
    const tableRows: any[] = [];
    
    const filteredRegistry = clinicalRegistry.filter(entry => 
      entry.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      entry.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredRegistry.forEach(entry => {
      const entryData = [
        new Date(entry.date).toLocaleDateString(),
        entry.patientName ? `${entry.patientName} (${entry.patientId})` : 'Walk-in / Anonymous',
        entry.category,
        entry.project,
        entry.amount.toString(),
        entry.paymentMethod
      ];
      tableRows.push(entryData);
    });

    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 30 });
    doc.save('clinical_revenue_registry.pdf');
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    const filteredRegistry = clinicalRegistry.filter(entry => 
      entry.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      entry.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportData = filteredRegistry.map(entry => ({
      Date: new Date(entry.date).toLocaleDateString(),
      'Patient Name': entry.patientName || 'Walk-in / Anonymous',
      'Patient ID': entry.patientId || '',
      Category: entry.category,
      Project: entry.project,
      Amount: entry.amount,
      'Payment Method': entry.paymentMethod
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Revenue');
    XLSX.writeFile(workbook, 'clinical_revenue_registry.xlsx');
    setIsExportMenuOpen(false);
  };

  const handleDeleteClinicalRevenue = (id: string) => {
    if (confirm('Are you sure you want to delete this revenue entry?')) {
      setClinicalRegistry(prev => prev.filter(entry => entry.id !== id));
    }
  };

  // Fetch all dashboard data on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch Patients, Revenue, and Forecast simultaneously
        const [patientsData, revenueData, forecastData] = await Promise.all([
          api.getPatients(),
          api.getRevenue(),
          api.getForecast()
        ]);
        
        // Format the patients for the Smart Queue
        const formattedQueue = patientsData.map((p: any) => {
          const isHighRisk = p.riskLevel === 'High';
          const isMedRisk = p.riskLevel === 'Medium';
          
          return {
            id: p._id || p.id,
            patientName: p.name,
            upid: p.upid,
            priority: isHighRisk ? 'Emergency' : isMedRisk ? 'Urgent' : 'Routine',
            reason: p.notes || 'Pending triage evaluation',
            waitTime: p.waitMinutes ? `${p.waitMinutes}m` : '0m',
          };
        });

        setLiveQueue(formattedQueue);
        // Map old clinicRevenue into mock split categories for the updated chart
        setRevenue(revenueData.map((r: any) => ({
          day: r.day,
          consultationRevenue: r.clinicRevenue * 0.6,
          procedureRevenue: r.clinicRevenue * 0.4
        })));
        setForecast(forecastData);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const sortedQueue = [...liveQueue].sort((a, b) => {
    const priorityOrder: Record<string, number> = { Emergency: 0, Urgent: 1, Routine: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Calculate dynamic totals based on live MongoDB revenue data
  const totalClinic = revenue.reduce((sum, d) => sum + (d.consultationRevenue || 0) + (d.procedureRevenue || 0), 0);
  const totalConsultations = revenue.reduce((sum, d) => sum + (d.consultationRevenue || 0), 0);
  const totalProcedures = revenue.reduce((sum, d) => sum + (d.procedureRevenue || 0), 0);
  const totalRevenue = totalClinic; // Pharmacy is no longer tracked here

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="label-text">Total Revenue</p>
            <div className="w-9 h-9 rounded-xl bg-terracotta-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-terracotta-500" strokeWidth={1.5} />
            </div>
          </div>
          <p className="font-serif text-3xl text-ink-900">
            ₹{(totalRevenue / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-sage-500 flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3" /> +12.4% vs last week
          </p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="label-text">Clinic Revenue</p>
            <div className="w-9 h-9 rounded-xl bg-sage-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-sage-500" strokeWidth={1.5} />
            </div>
          </div>
          <p className="font-serif text-3xl text-ink-900">
            ₹{(totalClinic / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-ink-400 mt-1">Consultations & procedures</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="label-text">Pending Dues</p>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
            </div>
          </div>
          <p className="font-serif text-3xl text-ink-900">
            ₹12.4K
          </p>
          <p className="text-xs text-ink-400 mt-1">From IPD admissions</p>
        </div>
      </div>

      {/* Smart Triage Queue + AI Inventory Forecaster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Triage Queue */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-terracotta-50 flex items-center justify-center">
              <Siren className="w-4 h-4 text-terracotta-500" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-ink-900">Smart Triage Queue</h3>
              <p className="text-xs text-ink-400">Auto-prioritized by clinical urgency</p>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-8 text-center text-ink-400">Loading live patient queue...</div>
            ) : sortedQueue.length === 0 ? (
              <div className="py-8 text-center text-ink-400">No patients currently in queue.</div>
            ) : (
              sortedQueue.map((patient, idx) => {
                const config = priorityConfig[patient.priority];
                const Icon = config.icon;
                return (
                  <div
                    key={patient.id}
                    className={`rounded-xl p-4 border ${config.border} ${config.bg} animate-fade-in`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg} border ${config.border}`}
                        >
                          <Icon className={`w-5 h-5 ${config.text}`} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-serif text-lg text-ink-900 leading-tight">
                            {patient.patientName}
                          </p>
                          <p className="text-xs text-ink-500 font-mono">{patient.upid}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block text-xs px-2 py-1 rounded-full ${config.bg} ${config.text} font-medium mb-1`}
                        >
                          {config.label}
                        </span>
                        <p className="text-xs text-ink-400">
                          {patient.reason} · Wait {patient.waitTime}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Inventory Forecaster — Line Chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-sage-500" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-ink-900">AI Inventory Forecaster</h3>
              <p className="text-xs text-ink-400">Current stock vs. forecasted demand (by EDD)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            {/* Swapped mock data for live 'forecast' state */}
            <LineChart data={forecast} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" vertical={false} />
              <XAxis
                dataKey="week"
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
              />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="currentStock"
                stroke="#9E5B43"
                strokeWidth={2.5}
                dot={{ fill: '#9E5B43', r: 4 }}
                name="Current Stock"
              />
              <Line
                type="monotone"
                dataKey="forecastedDemand"
                stroke="#547A5F"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ fill: '#547A5F', r: 4 }}
                name="Forecasted Demand"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Dashboard — Area Chart */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-terracotta-50 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-terracotta-500" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif text-xl text-ink-900">Clinical Revenue by Category</h3>
            <p className="text-xs text-ink-400">Consultations vs. Procedures (₹)</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          {/* Swapped mock data for live 'revenue' state */}
          <AreaChart data={revenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="clinicGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9E5B43" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#9E5B43" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pharmacyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#547A5F" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#547A5F" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: '#7D7A75', fontSize: 11 }}
              axisLine={{ stroke: '#EAE6DF' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#7D7A75', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                background: '#FFFFFF',
                border: '1px solid #EAE6DF',
                borderRadius: '0.75rem',
                boxShadow: '0 8px 30px -6px rgba(110,80,60,0.12)',
                fontSize: '0.75rem',
              }}
              formatter={(value) => `₹${Number(value).toLocaleString()}`}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }} iconType="circle" />
            <Area
              type="monotone"
              dataKey="consultationRevenue"
              stroke="#9E5B43"
              strokeWidth={2.5}
              fill="url(#clinicGrad)"
              name="Consultations"
              dot={{ fill: '#9E5B43', r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="procedureRevenue"
              stroke="#547A5F"
              strokeWidth={2.5}
              fill="url(#pharmacyGrad)"
              name="Procedures"
              dot={{ fill: '#547A5F', r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Clinical Revenue Registry */}
      <div className="card p-6 border-2 border-sage-100 bg-gradient-to-br from-white to-sage-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center shadow-soft">
              <CreditCard className="w-5 h-5 text-sage-600" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-ink-900">Clinical Revenue Registry</h3>
              <p className="text-xs text-ink-400">Date-wise registry of all clinical collections</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                placeholder="Search patient or bill..."
                className="input-field pl-9 py-2 text-sm w-48 bg-white/80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 rounded-xl border border-beige-200 bg-white/70 hover:bg-beige-100 text-ink-600 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="btn-ghost px-4 py-2 flex items-center gap-2 text-sm bg-white/80"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-beige-200 py-2 z-10">
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2 text-sm text-ink-600 hover:bg-beige-50 hover:text-ink-900 transition-colors"
                  >
                    Export as PDF
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="w-full text-left px-4 py-2 text-sm text-ink-600 hover:bg-beige-50 hover:text-ink-900 transition-colors"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="btn-sage px-4 py-2 flex items-center gap-2 text-sm shadow-soft"
            >
              <Plus className="w-4 h-4" />
              Add Revenue Entry
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-beige-200 bg-white/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-beige-200 bg-beige-50/50">
                <th className="text-left py-3 px-4 label-text font-medium">Date</th>
                <th className="text-left py-3 px-4 label-text font-medium">Patient Info</th>
                <th className="text-left py-3 px-4 label-text font-medium">Category</th>
                <th className="text-left py-3 px-4 label-text font-medium">Project</th>
                <th className="text-right py-3 px-4 label-text font-medium">Amount</th>
                <th className="text-right py-3 px-4 label-text font-medium">Payment</th>
                <th className="text-center py-3 px-4 label-text font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beige-100">
              {clinicalRegistry
                .filter(entry => entry.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || entry.category.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((entry) => (
                <tr key={entry.id} className="hover:bg-beige-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-ink-600">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {entry.patientName ? (
                      <div>
                        <p className="font-medium text-ink-900">{entry.patientName}</p>
                        <p className="text-[11px] text-ink-400 font-mono">{entry.patientId}</p>
                      </div>
                    ) : (
                      <span className="text-ink-400 italic text-xs">Walk-in / Anonymous</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-beige-100 text-ink-600 border border-beige-200">
                      {entry.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink-600 text-sm">
                    {entry.project}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-ink-900">
                    ₹{entry.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                      entry.paymentMethod === 'UPI' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      entry.paymentMethod === 'Card' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-sage-50 text-sage-600 border-sage-100'
                    }`}>
                      {entry.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDeleteClinicalRevenue(entry.id)}
                      title="Delete Entry"
                      className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 transition-colors inline-block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Revenue Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-beige-200">
            <h3 className="font-serif text-2xl text-ink-900 mb-5">Record Clinical Revenue</h3>
            <div className="space-y-4">
              <div>
                <label className="label-text mb-1 block">Category</label>
                <select className="input-field bg-white">
                  <option>Consultation</option>
                  <option>Procedure/Surgery</option>
                  <option>IPD & Room Rent</option>
                  <option>Diagnostic Scan</option>
                  <option>Lab Test</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text mb-1 block">Amount (₹)</label>
                  <input type="number" className="input-field" placeholder="e.g. 1500" />
                </div>
                <div>
                  <label className="label-text mb-1 block">Payment Method</label>
                  <select className="input-field bg-white">
                    <option>UPI</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Insurance</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text mb-1 block">Patient Name (Optional)</label>
                  <input type="text" className="input-field" placeholder="Patient Name" />
                </div>
                <div>
                  <label className="label-text mb-1 block">Project / Dept</label>
                  <select className="input-field bg-white">
                    <option>OPD</option>
                    <option>Maternity</option>
                    <option>General Ward</option>
                    <option>Radiology</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-beige-100">
              <button onClick={() => setIsAddModalOpen(false)} className="btn-ghost px-5 py-2">Cancel</button>
              <button onClick={() => setIsAddModalOpen(false)} className="btn-sage px-5 py-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blockchain Audit Log — Dark Terminal */}
      <div className="rounded-2xl overflow-hidden shadow-soft-lg" style={{ background: '#1A1714' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-sage-400" strokeWidth={1.5} />
            <h3 className="font-serif text-xl text-white">Blockchain Audit Log</h3>
            <span className="text-xs text-white/40 font-mono ml-2">— immutable EMR ledger</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-sage-500/20 text-sage-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
              Chain Verified
            </span>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/60 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              {auditLog.length} blocks
            </span>
          </div>
        </div>

        <div className="p-6 max-h-[420px] overflow-y-auto terminal-scroll font-mono text-sm space-y-2">
          {auditLog.map((entry, idx) => {
            const Icon = categoryIcon[entry.category];
            const colorClass = categoryColor[entry.category];
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0 animate-slide-in"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <CircleDot className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colorClass}`} strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${colorClass}`} strokeWidth={1.5} />
                    <span className="text-white/90">{entry.action}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/40">
                    <span>{entry.actor}</span>
                    <span>·</span>
                    <span>
                      {new Date(entry.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-sage-400/60 mt-1 break-all">
                    {entry.hash}
                  </p>
                </div>
              </div>
            );
          })}
          {/* Blinking cursor */}
          <div className="flex items-center gap-2 pt-2 text-white/40">
            <span className="text-sage-400">medichain@ledger</span>
            <span>:</span>
            <span className="text-blue-400">~</span>
            <span>$</span>
            <span className="inline-block w-2 h-4 bg-sage-400 animate-terminal-blink" />
          </div>
        </div>
      </div>
    </div>
  );
}