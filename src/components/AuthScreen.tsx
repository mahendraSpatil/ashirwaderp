import { useState, useEffect, useRef } from 'react';
import {
  Stethoscope,
  Activity,
  Pill,
  Database,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  HeartPulse,
  TrendingUp,
  Blocks,
  Zap,
  ScanLine,
  Edit3,
  Save,
  X,
  Building2,
  Heart,
  Target,
} from 'lucide-react';
import type { Role } from '@/types';
import { useAuth } from '@/services/AuthContext';

const roleCards: {
  role: Role;
  title: string;
  subtitle: string;
  icon: typeof Stethoscope;
  color: string;
  bg: string;
}[] = [
  { role: 'doctor', title: 'Obstetrician', subtitle: 'Clinical Consultation Portal', icon: Stethoscope, color: 'text-terracotta-500', bg: 'bg-terracotta-50' },
  { role: 'nurse', title: 'Nurse', subtitle: 'Triage & Records', icon: Activity, color: 'text-sage-500', bg: 'bg-sage-50' },
  { role: 'pharmacist', title: 'Pharmacist', subtitle: 'Dispensary & Inventory', icon: Pill, color: 'text-terracotta-500', bg: 'bg-terracotta-50' },
  { role: 'admin', title: 'Data Manager', subtitle: 'Admin & Analytics', icon: Database, color: 'text-sage-500', bg: 'bg-sage-50' },
];

const heroImage = 'https://images.pexels.com/photos/7088531/pexels-photo-7088531.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const ultrasoundImage = 'https://images.pexels.com/photos/7108418/pexels-photo-7108418.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const nurseImage = 'https://images.pexels.com/photos/6129678/pexels-photo-6129678.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';
const pharmacyImage = 'https://images.pexels.com/photos/12672359/pexels-photo-12672359.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const stats = [
  { label: 'Patients managed', value: 2400, suffix: '+' },
  { label: 'Audit blocks sealed', value: 18000, suffix: '+' },
  { label: 'Avg. triage time', value: 4, suffix: ' min' },
  { label: 'PCPNDT compliance', value: 100, suffix: '%' },
];

const features = [
  {
    icon: Blocks,
    title: 'Blockchain Audit Trail',
    desc: 'Every action — triage, prescription, dispense — is sealed into a SHA-256 linked block. Tamper-evident and court-admissible.',
    color: 'text-terracotta-500',
    bg: 'bg-terracotta-50',
  },
  {
    icon: ShieldCheck,
    title: 'PCPNDT Compliance Vault',
    desc: 'Ultrasound scans and records are hash-locked on upload. Merkle-root verified, regulator-ready at any moment.',
    color: 'text-sage-500',
    bg: 'bg-sage-50',
  },
  {
    icon: Zap,
    title: 'Smart Triage Queue',
    desc: 'Auto-sorts by clinical priority. BP ≥ 140/90 and reduced fetal movement escalate to the top instantly.',
    color: 'text-terracotta-500',
    bg: 'bg-terracotta-50',
  },
  {
    icon: TrendingUp,
    title: 'AI Demand Forecasting',
    desc: 'Predicts medicine demand from active patient EDDs. FIFO dispensing prevents expiry waste.',
    color: 'text-sage-500',
    bg: 'bg-sage-50',
  },
];

const workflowSteps = [
  { step: '01', icon: Activity, title: 'Triage', desc: 'Nurse logs vitals, risk auto-flagged', color: 'text-sage-500' },
  { step: '02', icon: Stethoscope, title: 'Consult', desc: 'Doctor reviews and prescribes', color: 'text-terracotta-500' },
  { step: '03', icon: Pill, title: 'Dispense', desc: 'Pharmacist 3-step lock, FIFO stock', color: 'text-sage-500' },
  { step: '04', icon: Blocks, title: 'Seal', desc: 'Every action hash-locked to chain', color: 'text-terracotta-500' },
];

const blockchainStatusMessages = [
  'Chain integrity verified',
  'SHA-256 seal active',
  'Merkle root synced',
  '18,432 blocks sealed',
  'Audit trail immutable',
  'PCPNDT vault locked',
];

function useCountUp(target: number, duration = 1500, start = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, start]);

  return value;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

export default function AuthScreen() {
  const { signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<'landing' | 'select' | 'signin' | 'signup'>('landing');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { ref: statsRef, inView: statsInView } = useInView<HTMLDivElement>();

  const [statusMessage, setStatusMessage] = useState(blockchainStatusMessages[0]);
  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % blockchainStatusMessages.length;
      setStatusMessage(blockchainStatusMessages[idx]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const aboutKey = 'ashirwad_about_content';
  const defaultAbout = {
    heading: 'About Ashirwad Nursing Home',
    tagline: 'A legacy of compassionate maternity care, now powered by blockchain-secured technology.',
    paragraphs: [
      'Ashirwad Nursing Home has served the community for over two decades, delivering excellence in maternal and neonatal care. Our team of dedicated obstetricians, nurses, and pharmacists work in harmony to ensure every mother receives the safest, most dignified care experience.',
      'With the launch of our ERP platform, we bring the same trust and transparency to our digital records. Every prescription, every scan, every triage entry is cryptographically sealed — building an audit trail that is tamper-evident and court-admissible.',
      'We are committed to PCPNDT compliance, patient privacy, and clinical excellence. This platform is our promise that behind every record is a story of care we are proud to stand by.',
    ],
    stats: [
      { label: 'Years of experience', value: '15+' },
      { label: 'Babies delivered', value: '1000+' },
      { label: 'Expert staff', value: '10' },
      { label: 'Patient satisfaction', value: '98%' },
    ],
  };

  const [aboutContent, setAboutContent] = useState(defaultAbout);
  const [editingAbout, setEditingAbout] = useState(false);
  const [draftAbout, setDraftAbout] = useState(defaultAbout);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(aboutKey);
      if (saved) setAboutContent(JSON.parse(saved));
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleSaveAbout = () => {
    setAboutContent(draftAbout);
    localStorage.setItem(aboutKey, JSON.stringify(draftAbout));
    setEditingAbout(false);
  };

  const handleCancelEdit = () => {
    setDraftAbout(aboutContent);
    setEditingAbout(false);
  };

  const startEditing = () => {
    setDraftAbout(aboutContent);
    setEditingAbout(true);
  };

  const updateDraftParagraph = (idx: number, value: string) => {
    setDraftAbout((prev) => ({
      ...prev,
      paragraphs: prev.paragraphs.map((p, i) => (i === idx ? value : p)),
    }));
  };

  const updateDraftStat = (idx: number, field: 'label' | 'value', val: string) => {
    setDraftAbout((prev) => ({
      ...prev,
      stats: prev.stats.map((s, i) => (i === idx ? { ...s, [field]: val } : s)),
    }));
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setMode('signin');
    setError(null);
  };

  const handleBack = () => {
    setMode('select');
    setError(null);
    setEmail('');
    setPassword('');
    setFullName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetRole = selectedRole || 'doctor';
    if (!targetRole) {
      setError('Please select a role.');
      return;
    }

    setSubmitting(true);

    if (mode === 'signin') {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
        setSubmitting(false);
      }
    } else {
      const { error: signUpError } = await signUp(email, password, fullName, targetRole);
      if (signUpError) {
        setError(signUpError);
        setSubmitting(false);
      }
    }
  };

  const activeRoleCard = roleCards.find((r) => r.role === (selectedRole || (mode === 'signup' ? 'doctor' : null)));

  // LANDING MODE — full marketing page
  if (mode === 'landing') {
    return (
      <div key="landing" className="min-h-screen bg-beige-50 page-transition">
        {/* Nav */}
        <nav className="sticky top-0 z-50 px-4 sm:px-6 pt-4">
          <div className="glass-nav rounded-2xl shadow-soft px-5 py-3 flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-terracotta-500 flex items-center justify-center shadow-soft">
                <span className="font-serif text-white text-xl font-semibold">A</span>
              </div>
              <div>
                <span className="font-serif text-xl text-ink-900 font-semibold block leading-none">Ashirwad Nursing Home</span>
                <span className="text-xs text-ink-400">ERP Suite</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <a href="#about" className="hidden sm:block text-sm text-ink-500 hover:text-terracotta-500 transition-colors">About Us</a>
              <button
                onClick={() => setMode('select')}
                className="btn-terracotta px-5 py-2.5 flex items-center gap-2 text-sm"
              >
                Sign In
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden px-4 sm:px-6 pt-16 pb-24">
          <div className="absolute top-0 -left-20 w-96 h-96 bg-terracotta-200/20 rounded-full blur-3xl animate-float-slow" />
          <div className="absolute bottom-0 -right-20 w-96 h-96 bg-sage-200/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/3 left-1/2 w-72 h-72 bg-terracotta-100/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-50 border border-sage-100 mb-6">
                <span className="w-2 h-2 rounded-full bg-sage-500 animate-pulse" />
                <span className="text-sm text-sage-600 font-medium">PCPNDT-Compliant · Blockchain-Sealed</span>
              </div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-ink-900 leading-[1.05] mb-6">
                The future of
                <br />
                <span className="text-terracotta-500">maternity care</span>,
                <br />
                sealed in trust.
              </h1>
              <p className="text-ink-500 text-lg leading-relaxed mb-8 max-w-lg">
                A unified OPD platform for obstetricians, nurses, pharmacists, and administrators —
                where every prescription, scan, and triage is cryptographically locked to a blockchain audit trail.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setMode('select')}
                  className="btn-terracotta px-7 py-3.5 flex items-center gap-2 text-base"
                >
                  Enter the Portal
                  <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <a
                  href="#features"
                  className="btn-ghost px-7 py-3.5 flex items-center gap-2 text-base border border-beige-200"
                >
                  Explore Features
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-6 mt-10 pt-8 border-t border-beige-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-sage-500" strokeWidth={1.5} />
                  <span className="text-sm text-ink-500 font-medium">SHA-256 Sealed</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-sage-500" strokeWidth={1.5} />
                  <span className="text-sm text-ink-500 font-medium">Merkle Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-sage-500" strokeWidth={1.5} />
                  <span className="text-sm text-ink-500 font-medium">Role-Secured</span>
                </div>
              </div>
            </div>

            {/* Hero image with floating cards */}
            <div className="relative animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="relative rounded-3xl overflow-hidden shadow-glass">
                <img
                  src={heroImage}
                  alt="Doctor consulting with pregnant patient"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/30 via-transparent to-transparent" />
              </div>

              {/* Floating stat card */}
              <div className="absolute -bottom-6 -left-6 glass rounded-2xl p-5 shadow-soft animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center">
                    <HeartPulse className="w-6 h-6 text-sage-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-serif text-2xl text-ink-900 leading-none">154 bpm</p>
                    <p className="text-xs text-ink-400 mt-1">Live FHR monitor</p>
                  </div>
                </div>
              </div>

              {/* Floating blockchain card */}
              <div className="absolute -top-4 -right-4 glass rounded-2xl p-4 shadow-soft animate-float-slow">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-terracotta-500" />
                    <div className="absolute inset-0 rounded-full bg-terracotta-500 animate-pulse-ring" />
                  </div>
                  <span className="font-mono text-xs text-ink-600 transition-opacity duration-500">{statusMessage}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section ref={statsRef} className="px-4 sm:px-6 py-16 bg-white border-y border-beige-200">
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <StatCounter key={stat.label} {...stat} inView={statsInView} delay={idx * 150} />
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-4 sm:px-6 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <p className="text-terracotta-500 font-medium text-sm uppercase tracking-wider mb-3">Why Ashirwad ERP</p>
              <h2 className="font-serif text-4xl md:text-5xl text-ink-900 mb-4">
                Built for high-trust maternity care
              </h2>
              <p className="text-ink-500 text-lg max-w-2xl mx-auto">
                Four portals, one immutable ledger. Every action is cryptographically sealed —
                no backdated records, no silent edits, no missing scans.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {features.map((f, idx) => (
                <div
                  key={f.title}
                  className="card card-hover p-8 animate-fade-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mb-5`}>
                    <f.icon className={`w-7 h-7 ${f.color}`} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-2xl text-ink-900 mb-3">{f.title}</h3>
                  <p className="text-ink-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="px-4 sm:px-6 py-24 bg-white border-y border-beige-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sage-500 font-medium text-sm uppercase tracking-wider mb-3">The Workflow</p>
              <h2 className="font-serif text-4xl md:text-5xl text-ink-900 mb-4">
                From triage to sealed — in minutes
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {workflowSteps.map((s, idx) => (
                <div key={s.step} className="relative animate-fade-in" style={{ animationDelay: `${idx * 120}ms` }}>
                  {idx < workflowSteps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-beige-200" />
                  )}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-beige-50 flex items-center justify-center mb-4 relative z-10">
                      <s.icon className={`w-7 h-7 ${s.color}`} strokeWidth={1.5} />
                    </div>
                    <span className="font-mono text-xs text-ink-300 font-semibold">{s.step}</span>
                    <h3 className="font-serif text-xl text-ink-900 mt-1 mb-1">{s.title}</h3>
                    <p className="text-sm text-ink-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Image showcase */}
        <section className="px-4 sm:px-6 py-24">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
            <div className="rounded-3xl overflow-hidden shadow-soft group cursor-pointer">
              <div className="relative h-72 overflow-hidden">
                <img src={ultrasoundImage} alt="Ultrasound scan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ScanLine className="w-4 h-4 text-white" strokeWidth={1.5} />
                    <span className="text-xs text-white/80 font-medium">PCPNDT Vault</span>
                  </div>
                  <p className="text-white font-serif text-lg">Hash-locked scans</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-soft group cursor-pointer">
              <div className="relative h-72 overflow-hidden">
                <img src={nurseImage} alt="Nurse checking blood pressure" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-white" strokeWidth={1.5} />
                    <span className="text-xs text-white/80 font-medium">Smart Triage</span>
                  </div>
                  <p className="text-white font-serif text-lg">Auto-prioritized queue</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-soft group cursor-pointer">
              <div className="relative h-72 overflow-hidden">
                <img src={pharmacyImage} alt="Pharmacy medication" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="w-4 h-4 text-white" strokeWidth={1.5} />
                    <span className="text-xs text-white/80 font-medium">FIFO Dispensing</span>
                  </div>
                  <p className="text-white font-serif text-lg">3-step lock</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-6 py-24">
          <div className="max-w-4xl mx-auto text-center relative overflow-hidden rounded-3xl bg-gradient-to-br from-terracotta-500 to-terracotta-600 p-16 shadow-soft">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">Ready to secure your OPD?</h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Join the maternity care platform where every record is sealed, every action is logged,
                and every patient is safe.
              </p>
              <button
                onClick={() => setMode('select')}
                className="bg-white text-terracotta-600 px-8 py-3.5 rounded-xl font-medium hover:bg-beige-50 transition-colors inline-flex items-center gap-2 text-base shadow-soft"
              >
                Choose Your Portal
                <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </section>

        {/* About Us */}
        <section id="about" className="px-4 sm:px-6 py-24 bg-beige-50 relative overflow-hidden">
          <div className="absolute top-1/4 -right-20 w-80 h-80 bg-sage-200/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-terracotta-200/15 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-5xl mx-auto">
            <div className="flex items-start justify-between mb-12">
              <div>
                <p className="text-sage-500 font-medium text-sm uppercase tracking-wider mb-3">About Us</p>
                <h2 className="font-serif text-4xl md:text-5xl text-ink-900 mb-3">
                  {editingAbout ? (
                    <input
                      type="text"
                      value={draftAbout.heading}
                      onChange={(e) => setDraftAbout((prev) => ({ ...prev, heading: e.target.value }))}
                      className="input-field text-3xl md:text-4xl font-serif"
                    />
                  ) : (
                    aboutContent.heading
                  )}
                </h2>
                <p className="text-ink-500 text-lg max-w-2xl">
                  {editingAbout ? (
                    <input
                      type="text"
                      value={draftAbout.tagline}
                      onChange={(e) => setDraftAbout((prev) => ({ ...prev, tagline: e.target.value }))}
                      className="input-field text-lg w-full"
                    />
                  ) : (
                    aboutContent.tagline
                  )}
                </p>
              </div>

              {!editingAbout ? (
                // Only show Edit to signed-in admins
                user?.role === 'admin' ? (
                  <button
                    onClick={startEditing}
                    className="btn-ghost px-4 py-2.5 flex items-center gap-2 text-sm border border-beige-200 flex-shrink-0"
                  >
                    <Edit3 className="w-4 h-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                ) : null
              ) : (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleSaveAbout}
                    className="btn-terracotta px-4 py-2.5 flex items-center gap-2 text-sm"
                  >
                    <Save className="w-4 h-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Save</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="btn-ghost px-4 py-2.5 flex items-center gap-2 text-sm border border-beige-200"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Paragraphs */}
            <div className="space-y-5 mb-12">
              {(editingAbout ? draftAbout : aboutContent).paragraphs.map((para, idx) =>
                editingAbout ? (
                  <textarea
                    key={idx}
                    value={draftAbout.paragraphs[idx]}
                    onChange={(e) => updateDraftParagraph(idx, e.target.value)}
                    rows={3}
                    className="input-field text-ink-600 leading-relaxed resize-none"
                  />
                ) : (
                  <p key={idx} className="text-ink-500 text-lg leading-relaxed">
                    {para}
                  </p>
                )
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {(editingAbout ? draftAbout : aboutContent).stats.map((stat, idx) => (
                <div key={idx} className="glass rounded-2xl p-6 text-center shadow-soft">
                  {editingAbout ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={draftAbout.stats[idx].value}
                        onChange={(e) => updateDraftStat(idx, 'value', e.target.value)}
                        className="input-field text-center font-serif text-2xl text-terracotta-500"
                      />
                      <input
                        type="text"
                        value={draftAbout.stats[idx].label}
                        onChange={(e) => updateDraftStat(idx, 'label', e.target.value)}
                        className="input-field text-center text-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-serif text-3xl md:text-4xl text-terracotta-500 mb-2">{stat.value}</p>
                      <p className="text-sm text-ink-500 font-medium">{stat.label}</p>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Value pillars */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="card p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-terracotta-50 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-terracotta-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-serif text-lg text-ink-900 mb-1">Compassionate Care</h4>
                  <p className="text-sm text-ink-500">Every patient treated with dignity and warmth.</p>
                </div>
              </div>
              <div className="card p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-sage-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-serif text-lg text-ink-900 mb-1">Clinical Excellence</h4>
                  <p className="text-sm text-ink-500">Evidence-based protocols, continuously refined.</p>
                </div>
              </div>
              <div className="card p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-terracotta-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-terracotta-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-serif text-lg text-ink-900 mb-1">Trusted Legacy</h4>
                  <p className="text-sm text-ink-500">Two decades of trusted maternity service.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-12 border-t border-beige-200">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-terracotta-500 flex items-center justify-center">
                <span className="font-serif text-white text-sm font-semibold">A</span>
              </div>
              <span className="font-serif text-lg text-ink-900 font-semibold">Ashirwad Nursing Home</span>
            </div>
            <p className="text-sm text-ink-400">Nursing Home ERP · MongoDB + Blockchain · PCPNDT Compliant</p>
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
              <span>Secured by JWT + scrypt</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // SELECT / SIGNIN / SIGNUP MODE
  return (
    <div key={`auth-${mode}-${selectedRole || 'none'}`} className="min-h-screen bg-beige-50 relative overflow-hidden page-transition">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-terracotta-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-sage-200/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-terracotta-100/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
        {/* Brand */}
        <button
          onClick={() => setMode('landing')}
          className="flex items-center gap-3 mb-10 animate-fade-in group"
        >
          <div className="w-12 h-12 rounded-2xl bg-terracotta-500 flex items-center justify-center shadow-soft">
            <span className="font-serif text-white text-2xl font-semibold">A</span>
          </div>
          <span className="font-serif text-3xl text-ink-900 font-semibold tracking-tight group-hover:text-terracotta-500 transition-colors">Ashirwad Nursing Home</span>
        </button>

        {/* Role Selection */}
        {mode === 'select' && (
          <div className="w-full max-w-5xl animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="font-serif text-4xl md:text-5xl text-ink-900 leading-tight mb-3">
                Welcome back.
              </h1>
              <p className="text-ink-500 text-lg">Select your role to sign in to the portal.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {roleCards.map(({ role, title, subtitle, icon: Icon, color, bg }, idx) => (
                <button
                  key={role}
                  onClick={() => handleSelectRole(role)}
                  className="glass rounded-2xl p-8 text-left card-hover shadow-glass group animate-fade-in"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center mb-6 shadow-soft group-hover:bg-terracotta-500 transition-colors duration-300`}>
                    <Icon
                      className={`w-7 h-7 ${color} group-hover:text-white transition-colors duration-300`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="font-serif text-2xl text-ink-900 mb-1">{title}</h3>
                  <p className="text-ink-500 text-sm mb-6">{subtitle}</p>
                  <div className="flex items-center gap-2 text-terracotta-500 text-sm font-medium">
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </button>
              ))}
            </div>

            <p className="text-center text-ink-400 text-sm mt-10">
              New to Ashirwad ERP?{' '}
              <button
                onClick={() => {
                  setSelectedRole('doctor');
                  setMode('signup');
                  setError(null);
                }}
                className="text-terracotta-500 font-medium hover:underline"
              >
                Create an account
              </button>
            </p>
          </div>
        )}

        {/* Sign In / Sign Up Form */}
        {(mode === 'signin' || mode === 'signup') && (
          <div className="w-full max-w-md animate-fade-in">
            {/* Role badge */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-ink-400 hover:text-ink-600 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              {activeRoleCard && (
                <>
                  <span className="text-ink-300">·</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-terracotta-50 border border-terracotta-100">
                    <activeRoleCard.icon className="w-4 h-4 text-terracotta-500" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-terracotta-600">{activeRoleCard.title}</span>
                  </div>
                </>
              )}
            </div>

            <div className="glass rounded-3xl p-8 shadow-glass">
              <h2 className="font-serif text-3xl text-ink-900 mb-1">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </h2>
              <p className="text-ink-500 text-sm mb-6">
                {mode === 'signin'
                  ? 'Enter your credentials to access the portal.'
                  : `Register as ${activeRoleCard?.title || 'a staff member'}.`}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="label-text block mb-1.5">Select Role</label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {roleCards.map((rc) => {
                          const isSelected = (selectedRole || 'doctor') === rc.role;
                          const RcIcon = rc.icon;
                          return (
                            <button
                              type="button"
                              key={rc.role}
                              onClick={() => setSelectedRole(rc.role)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-terracotta-50/80 border-terracotta-400 text-terracotta-800 shadow-sm ring-1 ring-terracotta-300'
                                  : 'bg-white/50 border-beige-200 hover:border-beige-300 text-ink-600'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-terracotta-500 text-white' : 'bg-beige-100 text-ink-500'}`}>
                                <RcIcon className="w-4 h-4" strokeWidth={1.5} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate leading-tight">{rc.title}</div>
                                <div className="text-[10px] text-ink-400 truncate leading-tight">{rc.subtitle.split(' ')[0]}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="label-text block mb-1.5">Full Name</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.5} />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="input-field pl-10"
                          placeholder="Dr. Ananya Iyer"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="label-text block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.5} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="you@ashirwad.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label-text block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.5} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm animate-fade-in">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-terracotta px-5 py-3 w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                      {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                    </>
                  ) : (
                    <>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-beige-200 text-center">
                {mode === 'signin' ? (
                  <p className="text-sm text-ink-400">
                    Don't have an account?{' '}
                    <button
                      onClick={() => {
                        setSelectedRole(selectedRole || 'doctor');
                        setMode('signup');
                        setError(null);
                      }}
                      className="text-terracotta-500 font-medium hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-ink-400">
                    Already have an account?{' '}
                    <button
                      onClick={() => {
                        setMode('signin');
                        setError(null);
                      }}
                      className="text-terracotta-500 font-medium hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6 text-ink-400 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Protected by JWT + scrypt · PCPNDT compliant</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCounter({
  value,
  label,
  suffix,
  inView,
  delay,
}: {
  value: number;
  label: string;
  suffix: string;
  inView: boolean;
  delay: number;
}) {
  const [startCount, setStartCount] = useState(false);
  const count = useCountUp(value, 1500, startCount);

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setStartCount(true), delay);
      return () => clearTimeout(t);
    }
  }, [inView, delay]);

  return (
    <div className="text-center">
      <p className="font-serif text-4xl md:text-5xl text-terracotta-500 mb-2">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-ink-500 font-medium">{label}</p>
    </div>
  );
}
