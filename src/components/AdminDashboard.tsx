import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc
} from 'firebase/firestore';
import { db, DEFAULT_TREATMENTS, DEFAULT_DOCTORS, DEFAULT_MESSAGES, DEFAULT_APPOINTMENTS } from '../firebase';
import { Treatment, Doctor, InboxMessage, Appointment } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  Download, 
  FileText, 
  Star, 
  RefreshCw, 
  Filter, 
  CheckCircle2, 
  Users, 
  DollarSign, 
  LogOut,
  Calendar,
  Menu
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface AdminDashboardProps {
  userId: string;
  userEmail: string;
  profileName: string;
  onLogout: () => void;
}

export default function AdminDashboard({ userId: _userId, userEmail: _userEmail, profileName: _profileName, onLogout }: AdminDashboardProps) {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Treatment CRUD Modal & State
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [treatmentForm, setTreatmentForm] = useState({
    name: '',
    category: 'Estética',
    price: 0,
    duration: 30
  });

  // Doctor CRUD (Add / Modify Facultativos)
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    specialty: '',
    status: 'DISPONIBLE' as any,
    nextAvailable: '09:00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmXxNho4geOpoTtoWAldaI32InHw2n9wbO3dMcCxVkoWSuZllI60CBEsfi8fa35z7L-RwoDNZ8IgiY_dF_wtLvo4Hvmjm_4tGmbEjvGaQFRfgVmkk3t92zXXHP6cBrHMW3SoRclSBTxE-GuzpYR5nzNp5DpzSOyPMv7YpcvenAy3gcFadRXgyKLzfK1o3GiQUNbIaUC-58htiS1U4pDc_ACtFaADGGDEYkm1AboDLgXyucH62iTNjkZ5hXTWoxIuM07dpes83IpYd1'
  });

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Read treatments from Firestore with real-time sync and local storage fallback
    const unsubscribeTreatments = onSnapshot(collection(db, 'treatments'), (snapshot) => {
      const items: Treatment[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Treatment);
      });
      if (items.length > 0) {
        setTreatments(items);
        localStorage.setItem('local_treatments', JSON.stringify(items));
      } else {
        const localData = localStorage.getItem('local_treatments');
        setTreatments(localData ? JSON.parse(localData) : DEFAULT_TREATMENTS);
      }
    }, (error) => {
      console.warn('Treatments onSnapshot restricted, using local storage fallback:', error.message);
      const localData = localStorage.getItem('local_treatments');
      setTreatments(localData ? JSON.parse(localData) : DEFAULT_TREATMENTS);
    });

    // Read doctors
    const unsubscribeDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const items: Doctor[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Doctor);
      });
      if (items.length > 0) {
        setDoctors(items);
        localStorage.setItem('local_doctors', JSON.stringify(items));
      } else {
        const localData = localStorage.getItem('local_doctors');
        setDoctors(localData ? JSON.parse(localData) : DEFAULT_DOCTORS);
      }
    }, (error) => {
      console.warn('Doctors onSnapshot restricted, using local storage fallback:', error.message);
      const localData = localStorage.getItem('local_doctors');
      setDoctors(localData ? JSON.parse(localData) : DEFAULT_DOCTORS);
    });

    // Read inbox messages and reviews
    const unsubscribeMessages = onSnapshot(collection(db, 'messages'), (snapshot) => {
      const items: InboxMessage[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as InboxMessage);
      });
      items.sort((a, b) => b.timestamp - a.timestamp);
      if (items.length > 0) {
        setMessages(items);
        localStorage.setItem('local_messages', JSON.stringify(items));
      } else {
        const localData = localStorage.getItem('local_messages');
        setMessages(localData ? JSON.parse(localData) : DEFAULT_MESSAGES);
      }
    }, (error) => {
      console.warn('Messages onSnapshot restricted, using local storage fallback:', error.message);
      const localData = localStorage.getItem('local_messages');
      setMessages(localData ? JSON.parse(localData) : DEFAULT_MESSAGES);
    });

    // Read appointments to calculate visual metrics dynamically!
    const unsubscribeAppointments = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const items: Appointment[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      if (items.length > 0) {
        setAppointments(items);
        localStorage.setItem('local_appointments', JSON.stringify(items));
      } else {
        const localData = localStorage.getItem('local_appointments');
        setAppointments(localData ? JSON.parse(localData) : DEFAULT_APPOINTMENTS);
      }
    }, (error) => {
      console.warn('Appointments onSnapshot restricted, using local storage fallback:', error.message);
      const localData = localStorage.getItem('local_appointments');
      setAppointments(localData ? JSON.parse(localData) : DEFAULT_APPOINTMENTS);
    });

    return () => {
      unsubscribeTreatments();
      unsubscribeDoctors();
      unsubscribeMessages();
      unsubscribeAppointments();
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Treatment CRUD Operations
  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatmentForm.name || treatmentForm.price <= 0) {
      showToast('Por favor completa todos los campos.');
      return;
    }

    try {
      if (editingTreatment) {
        // Edit existing
        const tRef = doc(db, 'treatments', editingTreatment.id);
        await updateDoc(tRef, {
          name: treatmentForm.name,
          category: treatmentForm.category,
          price: Number(treatmentForm.price),
          duration: Number(treatmentForm.duration)
        });
        showToast('Servicio actualizado con éxito.');
      } else {
        // Create new
        const newId = treatmentForm.name.toLowerCase().replace(/\s+/g, '_');
        await setDoc(doc(db, 'treatments', newId), {
          id: newId,
          name: treatmentForm.name,
          category: treatmentForm.category,
          price: Number(treatmentForm.price),
          duration: Number(treatmentForm.duration)
        });
        showToast('Nuevo servicio añadido.');
      }
    } catch (err: any) {
      console.warn('Firestore write failed, using local storage fallback:', err.message);
      let currentTreatments = [...treatments];
      if (editingTreatment) {
        currentTreatments = currentTreatments.map(t => t.id === editingTreatment.id ? {
          ...t,
          name: treatmentForm.name,
          category: treatmentForm.category,
          price: Number(treatmentForm.price),
          duration: Number(treatmentForm.duration)
        } : t);
        showToast('Servicio actualizado localmente.');
      } else {
        const newId = treatmentForm.name.toLowerCase().replace(/\s+/g, '_') || ('t_' + Date.now());
        const newT = {
          id: newId,
          name: treatmentForm.name,
          category: treatmentForm.category,
          price: Number(treatmentForm.price),
          duration: Number(treatmentForm.duration)
        };
        currentTreatments.push(newT);
        showToast('Nuevo servicio añadido localmente.');
      }
      setTreatments(currentTreatments);
      localStorage.setItem('local_treatments', JSON.stringify(currentTreatments));
    } finally {
      setIsTreatmentModalOpen(false);
      setEditingTreatment(null);
      setTreatmentForm({ name: '', category: 'Estética', price: 0, duration: 30 });
    }
  };

  const handleDeleteTreatment = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este tratamiento?')) return;
    try {
      await deleteDoc(doc(db, 'treatments', id));
      showToast('Servicio eliminado.');
    } catch (err: any) {
      console.warn('Firestore delete failed, using local storage fallback:', err.message);
      const currentTreatments = treatments.filter(t => t.id !== id);
      setTreatments(currentTreatments);
      localStorage.setItem('local_treatments', JSON.stringify(currentTreatments));
      showToast('Servicio eliminado localmente.');
    }
  };

  const handleEditClick = (t: Treatment) => {
    setEditingTreatment(t);
    setTreatmentForm({
      name: t.name,
      category: t.category,
      price: t.price,
      duration: t.duration
    });
    setIsTreatmentModalOpen(true);
  };

  // Doctor Action
  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorForm.name || !doctorForm.specialty) {
      showToast('Por favor completa los campos del doctor.');
      return;
    }

    try {
      const newId = 'doc_' + Date.now();
      await setDoc(doc(db, 'doctors', newId), {
        id: newId,
        ...doctorForm
      });
      showToast('Nuevo facultativo añadido con éxito.');
    } catch (err: any) {
      console.warn('Firestore write failed, using local storage fallback:', err.message);
      const newId = 'doc_' + Date.now();
      const newDoc = {
        id: newId,
        ...doctorForm
      };
      const currentDoctors = [...doctors, newDoc];
      setDoctors(currentDoctors);
      localStorage.setItem('local_doctors', JSON.stringify(currentDoctors));
      showToast('Nuevo facultativo añadido localmente.');
    } finally {
      setIsDoctorModalOpen(false);
      setDoctorForm({
        name: '',
        specialty: '',
        status: 'DISPONIBLE',
        nextAvailable: '09:00',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmXxNho4geOpoTtoWAldaI32InHw2n9wbO3dMcCxVkoWSuZllI60CBEsfi8fa35z7L-RwoDNZ8IgiY_dF_wtLvo4Hvmjm_4tGmbEjvGaQFRfgVmkk3t92zXXHP6cBrHMW3SoRclSBTxE-GuzpYR5nzNp5DpzSOyPMv7YpcvenAy3gcFadRXgyKLzfK1o3GiQUNbIaUC-58htiS1U4pDc_ACtFaADGGDEYkm1AboDLgXyucH62iTNjkZ5hXTWoxIuM07dpes83IpYd1'
      });
    }
  };

  // Inbox & Reviews Management
  const handleApproveReview = async (id: string) => {
    try {
      const msgRef = doc(db, 'messages', id);
      await updateDoc(msgRef, { status: 'approved' });
      showToast('Reseña aprobada y publicada.');
    } catch (err: any) {
      console.warn('Firestore write failed, using local storage fallback:', err.message);
      const currentMessages = messages.map(m => m.id === id ? { ...m, status: 'approved' } : m);
      setMessages(currentMessages);
      localStorage.setItem('local_messages', JSON.stringify(currentMessages));
      showToast('Reseña aprobada localmente.');
    }
  };

  const handleRejectReview = async (id: string) => {
    try {
      const msgRef = doc(db, 'messages', id);
      await updateDoc(msgRef, { status: 'rejected' });
      showToast('Reseña rechazada.');
    } catch (err: any) {
      console.warn('Firestore write failed, using local storage fallback:', err.message);
      const currentMessages = messages.map(m => m.id === id ? { ...m, status: 'rejected' } : m);
      setMessages(currentMessages);
      localStorage.setItem('local_messages', JSON.stringify(currentMessages));
      showToast('Reseña rechazada localmente.');
    }
  };

  // Dynamic calculations for clinical metrics
  const activeAppointments = appointments.filter(a => a.status !== 'cancelled');
  const cancelations = appointments.filter(a => a.status === 'cancelled').length;
  const totalSlots = appointments.length || 1;
  const cancelationRate = Math.round((cancelations / totalSlots) * 100);

  // SVG representation data of Annual Revenue

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-300">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">Lumina Admin</span>
        </div>
        <button 
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          aria-label="Toggle Navigation"
        >
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Side Bar Navigation */}
      <aside className={`${mobileSidebarOpen ? 'flex' : 'hidden'} md:flex w-full md:w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex-col gap-6 shrink-0 z-30`}>
        <div className="hidden md:block">
          <span className="text-2xl font-black text-slate-900 dark:text-white block tracking-tight">Lumina Admin</span>
          <span className="text-xs text-slate-400 font-bold block uppercase tracking-widest mt-0.5">Clinical Director</span>
        </div>

        <nav className="flex-grow flex flex-col gap-1.5">
          <a className="flex items-center gap-3 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-2xl p-3.5 font-bold transition-all text-sm" href="#" onClick={() => setMobileSidebarOpen(false)}>
            <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Dashboard</span>
          </a>
          <a className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl p-3.5 text-sm transition-all font-semibold" href="#" onClick={() => setMobileSidebarOpen(false)}>
            <Calendar className="w-5 h-5" />
            <span>Appointments</span>
          </a>
          <button 
            onClick={() => { setMobileSidebarOpen(false); setIsTreatmentModalOpen(true); }}
            className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl p-3.5 text-sm transition-all text-left font-semibold cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Treatments</span>
          </button>
          <a className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl p-3.5 text-sm transition-all font-semibold" href="#" onClick={() => setMobileSidebarOpen(false)}>
            <Users className="w-5 h-5" />
            <span>Patient Records</span>
          </a>
        </nav>

        {/* ThemeToggle & Logout */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden">
              DA
            </div>
            <div>
              <p className="font-bold text-xs text-slate-800 dark:text-slate-100">Dr. Alarcón</p>
              <p className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Director de Clínica</p>
            </div>
          </div>

          <div className="flex gap-2 items-center justify-between">
            <ThemeToggle />
            <button
              onClick={() => { setMobileSidebarOpen(false); onLogout(); }}
              className="flex-1 py-2 px-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Canvas */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 md:overflow-y-auto custom-scrollbar md:h-screen">
        
        {/* Header Title */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              Panel de Control General
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
              Bienvenido de nuevo, Dr. Alarcón. Aquí tienes el resumen clínico de hoy.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-bold hover:scale-105 transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-bold hover:scale-105 transition-all cursor-pointer">
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button 
              onClick={() => setIsDoctorModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-indigo-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Alta Facultativo</span>
            </button>
          </div>
        </header>

        {/* KPI Grid Panel */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Ingresos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm border-l-4 border-indigo-600 flex flex-col justify-between">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider block">Ingresos Mensuales</span>
            <div className="mt-4">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">42.850€</h3>
              <p className="text-emerald-600 font-bold text-xs flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> +12.4% vs mes anterior
              </p>
            </div>
          </div>

          {/* Card 2: Nuevos Pacientes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm border-l-4 border-emerald-600 flex flex-col justify-between">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider block">Nuevos Pacientes</span>
            <div className="mt-4">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{activeAppointments.length * 15 + 104}</h3>
              <p className="text-emerald-600 font-bold text-xs flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> +5.2% crecimiento
              </p>
            </div>
          </div>

          {/* Card 3: Fidelidad */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm border-l-4 border-amber-500 flex flex-col justify-between">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider block">Tasa de Fidelidad</span>
            <div className="mt-4">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">88%</h3>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div className="bg-indigo-600 h-full" style={{ width: '88%' }}></div>
              </div>
            </div>
          </div>

          {/* Card 4: Cancelaciones */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm border-l-4 border-rose-500 flex flex-col justify-between">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black uppercase tracking-wider block">Cancelaciones</span>
            <div className="mt-4">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{cancelationRate}%</h3>
              <p className="text-rose-600 font-bold text-xs flex items-center gap-1 mt-1">
                <TrendingDown className="w-3.5 h-3.5" /> -1.2% mejora clinica
              </p>
            </div>
          </div>
        </section>

        {/* Charts & Demand Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Container */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between h-96">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-900 dark:text-white text-md">Rendimiento Clínico Anual</h4>
              <select className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs rounded-xl py-1 px-2.5 outline-none font-semibold text-slate-600 dark:text-slate-400">
                <option>Últimos 12 meses</option>
                <option>Año 2025</option>
              </select>
            </div>
            
            {/* Beautiful SVG graph */}
            <div className="flex-1 w-full flex items-center justify-center p-2 relative">
              <svg viewBox="0 0 800 200" className="w-full h-full">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0058be" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#0058be" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,150 Q100,140 200,100 T400,80 T600,120 T800,40" fill="transparent" stroke="#0058be" strokeWidth="3" strokeLinecap="round"/>
                <path d="M0,150 Q100,140 200,100 T400,80 T600,120 T800,40 L800,200 L0,200 Z" fill="url(#gradient)" />
                <circle cx="200" cy="100" r="5" fill="#0058be" stroke="white" strokeWidth="2" />
                <circle cx="400" cy="80" r="5" fill="#0058be" stroke="white" strokeWidth="2" />
                <circle cx="600" cy="120" r="5" fill="#0058be" stroke="white" strokeWidth="2" />
                <circle cx="800" cy="40" r="5" fill="#0058be" stroke="white" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Treatment Demand List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm h-96 flex flex-col justify-between">
            <h4 className="font-bold text-slate-900 dark:text-white text-md mb-4">Tratamientos Demandados</h4>
            
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Implantología</span>
                  <span className="font-bold">42%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full" style={{ width: '42%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Ortodoncia Invisible</span>
                  <span className="font-bold">28%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full" style={{ width: '28%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Estética Dental</span>
                  <span className="font-bold">18%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: '18%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Odontopediatría</span>
                  <span className="font-bold">12%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full" style={{ width: '12%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Advanced CRUD Sections */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CRUD: Service Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="p-5 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h4 className="font-bold text-slate-900 dark:text-white">Gestión de Servicios</h4>
              <button 
                onClick={() => {
                  setEditingTreatment(null);
                  setTreatmentForm({ name: '', category: 'Estética', price: 0, duration: 30 });
                  setIsTreatmentModalOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                + Añadir Tratamiento
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Servicio</th>
                    <th className="px-5 py-3">Precio Base</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/30">
                  {treatments.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{t.name}</p>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{t.category} • {t.duration} min</span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-950 dark:text-white">{t.price}€</td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        <button 
                          onClick={() => handleEditClick(t)}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-block cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTreatment(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 inline-block cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* INBOX & REVIEWS MODERATION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-5 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Bandeja de Entrada e Inbox</h4>
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {messages.filter(m => m.status === 'pending' || m.status === 'unread').length}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="text-slate-400 hover:text-indigo-600"><RefreshCw className="w-4 h-4" /></button>
                <button className="text-slate-400 hover:text-indigo-600"><Filter className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar">
              {messages.map((m) => (
                <div 
                  key={m.id}
                  className={`p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2 relative ${
                    m.status === 'unread' ? 'bg-indigo-500/5' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      {m.sender}
                      {m.rating && (
                        <span className="inline-flex items-center gap-0.5 text-amber-500 text-[10px] font-bold">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {m.rating}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">{m.time}</span>
                  </div>
                  
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    "{m.content}"
                  </p>

                  {/* Moderation Controls */}
                  {m.type === 'review' && m.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => handleApproveReview(m.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-full transition-all cursor-pointer"
                      >
                        Aprobar Publicación
                      </button>
                      <button 
                        onClick={() => handleRejectReview(m.id)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-full transition-all cursor-pointer"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}

                  {m.status === 'approved' && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">✓ Publicado en Portal</span>
                  )}
                  {m.status === 'rejected' && (
                    <span className="text-[10px] font-bold text-rose-500 mt-1 block">✗ Rechazado</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Medical Staff Display */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h4 className="font-bold text-slate-900 dark:text-white text-md mb-4">Equipo Clínico Facultativo</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {doctors.map(d => (
              <div key={d.id} className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex items-center gap-4">
                <img src={d.image} className="w-12 h-12 rounded-full object-cover shrink-0" alt={d.name} />
                <div className="overflow-hidden">
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">{d.name}</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{d.specialty}</p>
                  <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full mt-1.5 ${
                    d.status === 'DISPONIBLE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-400/10 text-amber-600'
                  }`}>
                    {d.status} • Siguiente: {d.nextAvailable}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* MODAL: Create or Edit Treatment */}
      {isTreatmentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slideup">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {editingTreatment ? 'Editar Tratamiento' : 'Añadir Tratamiento'}
              </h3>
              <button 
                onClick={() => setIsTreatmentModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTreatment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Nombre del Tratamiento</label>
                <input 
                  type="text" 
                  value={treatmentForm.name}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                  placeholder="Ej. Blanqueamiento LED Avanzado"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Categoría</label>
                <select
                  value={treatmentForm.category}
                  onChange={(e) => setTreatmentForm({ ...treatmentForm, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none dark:text-white"
                >
                  <option value="Estética">Estética</option>
                  <option value="Preventivo">Preventivo</option>
                  <option value="Cirugía">Cirugía</option>
                  <option value="Ortodoncia">Ortodoncia</option>
                  <option value="Infantil">Infantil</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Precio (€)</label>
                  <input 
                    type="number" 
                    value={treatmentForm.price}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Duración (min)</label>
                  <input 
                    type="number" 
                    value={treatmentForm.duration}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, duration: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Guardar Tratamiento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Doctor */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slideup">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">Alta Nuevo Odontólogo</h3>
              <button 
                onClick={() => setIsDoctorModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Nombre del Doctor</label>
                <input 
                  type="text" 
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  placeholder="Ej. Dr. Alejandro Sanz"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Especialidad</label>
                <input 
                  type="text" 
                  value={doctorForm.specialty}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                  placeholder="Ej. Ortodoncista y Director"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 block">Imagen (URL)</label>
                <input 
                  type="text" 
                  value={doctorForm.image}
                  onChange={(e) => setDoctorForm({ ...doctorForm, image: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Completar Alta Médica
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Feedback Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-slate-900 dark:bg-slate-800 text-white px-5 py-4 rounded-xl border-l-4 border-indigo-500 shadow-2xl z-50 flex items-center gap-3 animate-slideup max-w-sm">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <span className="text-xs font-bold">{toast}</span>
        </div>
      )}

    </div>
  );
}
