import { useState, useCallback } from 'react';
import type { Prescription, AuditEntry, AuditCategory } from '@/types';
import { generateHash } from '@/services/utils';
import { useAuth } from '@/services/AuthContext';
import AuthScreen from '@/components/AuthScreen';
import Header from '@/components/Header';
import DoctorDashboard from '@/components/dashboards/DoctorDashboard';
import NurseDashboard from '@/components/dashboards/NurseDashboard';
import PharmacyDashboard from '@/components/dashboards/PharmacyDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  
  const addAuditEntry = useCallback(
    (action: string, actor: string, category: AuditCategory): string => {
      const hash = generateHash();
      setAuditLog((prev) => [
        {
          id: `a${Date.now()}`,
          action,
          actor,
          timestamp: new Date().toISOString(),
          hash,
          category,
        },
        ...prev,
      ]);
      return hash;
    },
    []
  );

  const handlePrescriptionSent = useCallback(
    (rx: Prescription) => {
      setPrescriptions((prev) => [rx, ...prev]);
      addAuditEntry(
        `E-Rx sent to pharmacy — ${rx.medicineName} for ${rx.patientName}`,
        user?.name || 'Doctor',
        'prescription'
      );
    },
    [addAuditEntry, user]
  );

  const handleAdvanceRx = useCallback((id: string) => {
    setPrescriptions((prev) =>
      prev.map((rx) => {
        if (rx.id !== id) return rx;
        const nextStatus =
          rx.status === 'Pending'
            ? 'Approved_Pending_Payment'
            : rx.status === 'Approved_Pending_Payment'
            ? 'Paid_And_Dispensed'
            : 'Paid_And_Dispensed';
        return { ...rx, status: nextStatus };
      })
    );
  }, []);

  if (loading) {
    return (
      <div key="loading" className="min-h-screen bg-beige-50 flex items-center justify-center page-transition">
        <div className="flex items-center gap-3 text-ink-400">
          <div className="w-8 h-8 border-2 border-terracotta-200 border-t-terracotta-500 rounded-full animate-spin" />
          <span className="font-serif text-lg">Loading Ashirwad ERP…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div key="auth" className="page-transition">
        <AuthScreen />
      </div>
    );
  }

  return (
    <div key={`dashboard-${user.role}`} className="min-h-screen bg-beige-50 page-transition">
      <Header user={user} onSignOut={signOut} />
      {user.role === 'doctor' && <DoctorDashboard onPrescriptionSent={handlePrescriptionSent} />}
      {user.role === 'nurse' && <NurseDashboard onAuditLog={addAuditEntry} />}
      {user.role === 'pharmacist' && (
        <PharmacyDashboard
          prescriptions={prescriptions}
          onAdvanceRx={handleAdvanceRx}
          onAuditLog={addAuditEntry}
        />
      )}
      {user.role === 'admin' && <AdminDashboard auditLog={auditLog} />}
    </div>
  );
}
