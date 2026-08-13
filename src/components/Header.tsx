import { LogOut, ShieldCheck } from 'lucide-react';
import type { AppUser } from '@/services/AuthContext';

interface HeaderProps {
  user: AppUser;
  onSignOut: () => void;
}

const roleBadge: Record<string, { label: string; bg: string; text: string }> = {
  doctor: { label: 'Obstetrician', bg: 'bg-terracotta-50', text: 'text-terracotta-600' },
  nurse: { label: 'Triage & Records', bg: 'bg-sage-50', text: 'text-sage-500' },
  pharmacist: { label: 'Clinical Pharmacist', bg: 'bg-terracotta-50', text: 'text-terracotta-600' },
  admin: { label: 'Data Manager', bg: 'bg-sage-50', text: 'text-sage-500' },
};

export default function Header({ user, onSignOut }: HeaderProps) {
  const badge = roleBadge[user.role];

  return (
    <header className="sticky top-0 z-40 px-4 sm:px-6 pt-4">
      <div className="glass-nav rounded-2xl shadow-soft px-5 py-3 flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-terracotta-500 flex items-center justify-center shadow-soft">
            <span className="font-serif text-white text-xl font-semibold">A</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-serif text-xl text-ink-900 font-semibold block leading-none">
              Ashirwad Nursing Home
            </span>
            <span className="text-xs text-ink-400">ERP Portal</span>
          </div>
        </div>

        {/* User + Sign out */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sage-50 border border-sage-100">
            <ShieldCheck className="w-4 h-4 text-sage-500" strokeWidth={1.5} />
            <span className="text-xs text-sage-500 font-medium">PCPNDT Secured</span>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-ink-900 leading-tight">{user.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} font-medium`}>
              {badge.label}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-terracotta-500 flex items-center justify-center shadow-soft">
            <span className="text-white text-sm font-semibold">{user.avatarInitials}</span>
          </div>
          <button
            onClick={onSignOut}
            className="btn-ghost px-3 py-2 flex items-center gap-2 text-sm"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
