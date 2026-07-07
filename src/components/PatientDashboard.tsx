import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  query, 
  where
} from 'firebase/firestore';
import { db, DEFAULT_TREATMENTS, DEFAULT_DOCTORS, DEFAULT_APPOINTMENTS } from '../firebase';
import { Appointment, Treatment, Doctor, AlertNotification } from '../types';
import { 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle, 
  ArrowRight, 
  LogOut, 
  Bell, 
  Activity, 
  Plus, 
  X, 
  Sparkles, 
  FileText, 
  UserCheck,
  ArrowDownToLine,
  Eye,
  Bot,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ThemeToggle from './ThemeToggle';
import LuminaChatbot from './LuminaChatbot';

interface PatientDashboardProps {
  userId: string;
  userEmail: string;
  profileName: string;
  onLogout: () => void;
}

export default function PatientDashboard({ userId, userEmail: _userEmail, profileName, onLogout }: PatientDashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  
  // Modals / Interactivity
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState<string | null>(null);
  
  // Form fields for new booking
  const [selectedTreatmentId, setSelectedTreatmentId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [treatmentSearch, setTreatmentSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todos');
  
  // Custom Toasts for push-like alerts
  const [toast, setToast] = useState<{ message: string; sub?: string } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Load patient data in real-time from Firestore with robust offline fallbacks
  useEffect(() => {
    // 1. Appointments real-time listener (specific to this patient or including default demo_carlos)
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('patientId', 'in', [userId, 'demo_carlos'])
    );
    
    const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      const appts: Appointment[] = [];
      snapshot.forEach((doc) => {
        appts.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      appts.sort((a, b) => b.timestamp - a.timestamp);
      if (appts.length > 0) {
        setAppointments(appts);
        localStorage.setItem('local_appointments', JSON.stringify(appts));
      } else {
        const localData = localStorage.getItem('local_appointments');
        const fallbackAppts = localData ? JSON.parse(localData) : DEFAULT_APPOINTMENTS;
        setAppointments(fallbackAppts.filter((a: any) => a.patientId === userId || a.patientId === 'demo_carlos'));
      }
    }, (error) => {
      console.warn('Appointments query restricted, using local storage fallback:', error.message);
      const localData = localStorage.getItem('local_appointments');
      const fallbackAppts = localData ? JSON.parse(localData) : DEFAULT_APPOINTMENTS;
      setAppointments(fallbackAppts.filter((a: any) => a.patientId === userId || a.patientId === 'demo_carlos'));
    });

    // 2. Treatments real-time listener
    const unsubscribeTreatments = onSnapshot(collection(db, 'treatments'), (snapshot) => {
      const treatList: Treatment[] = [];
      snapshot.forEach((doc) => {
        treatList.push({ id: doc.id, ...doc.data() } as Treatment);
      });
      if (treatList.length > 0) {
        setTreatments(treatList);
        localStorage.setItem('local_treatments', JSON.stringify(treatList));
      } else {
        const localData = localStorage.getItem('local_treatments');
        setTreatments(localData ? JSON.parse(localData) : DEFAULT_TREATMENTS);
      }
    }, (error) => {
      console.warn('Treatments onSnapshot restricted, using local storage fallback:', error.message);
      const localData = localStorage.getItem('local_treatments');
      setTreatments(localData ? JSON.parse(localData) : DEFAULT_TREATMENTS);
    });

    // 3. Doctors real-time listener
    const unsubscribeDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const docList: Doctor[] = [];
      snapshot.forEach((doc) => {
        docList.push({ id: doc.id, ...doc.data() } as Doctor);
      });
      if (docList.length > 0) {
        setDoctors(docList);
        localStorage.setItem('local_doctors', JSON.stringify(docList));
      } else {
        const localData = localStorage.getItem('local_doctors');
        setDoctors(localData ? JSON.parse(localData) : DEFAULT_DOCTORS);
      }
    }, (error) => {
      console.warn('Doctors onSnapshot restricted, using local storage fallback:', error.message);
      const localData = localStorage.getItem('local_doctors');
      setDoctors(localData ? JSON.parse(localData) : DEFAULT_DOCTORS);
    });

    // 4. Seeding dynamic mock patient alerts
    const unsubscribeNotifications = onSnapshot(collection(db, 'messages'), (_snapshot) => {
      const tempAlerts: AlertNotification[] = [
        {
          id: 'note_1',
          title: 'Nueva factura disponible',
          body: 'Revisión periódica y limpieza.',
          type: 'info',
          timestamp: Date.now() - 7200000,
          read: false
        },
        {
          id: 'note_2',
          title: 'Recordatorio de Medicación',
          body: 'Tomar analgésico según prescripción.',
          type: 'warning',
          timestamp: Date.now() - 18000000,
          read: false
        }
      ];
      setNotifications(tempAlerts);
    }, (_error) => {
      // Catch notifications block silently
      const tempAlerts: AlertNotification[] = [
        {
          id: 'note_1',
          title: 'Nueva factura disponible',
          body: 'Revisión periódica y limpieza.',
          type: 'info',
          timestamp: Date.now() - 7200000,
          read: false
        },
        {
          id: 'note_2',
          title: 'Recordatorio de Medicación',
          body: 'Tomar analgésico según prescripción.',
          type: 'warning',
          timestamp: Date.now() - 18000000,
          read: false
        }
      ];
      setNotifications(tempAlerts);
    });

    return () => {
      unsubscribeAppointments();
      unsubscribeTreatments();
      unsubscribeDoctors();
      unsubscribeNotifications();
    };
  }, [userId]);

  const showToast = (message: string, sub?: string) => {
    setToast({ message, sub });
    setTimeout(() => setToast(null), 4000);
  };

  // Cancel Appointment
  const handleCancelAppointment = async (apptId: string) => {
    try {
      const apptRef = doc(db, 'appointments', apptId);
      await updateDoc(apptRef, { status: 'cancelled' });
      showToast('Cita cancelada con éxito', 'La reserva ha cambiado de estado.');
    } catch (err: any) {
      console.warn('Firestore cancel failed, using local storage fallback:', err.message);
      const updated = appointments.map(a => a.id === apptId ? { ...a, status: 'cancelled' as const } : a);
      setAppointments(updated);
      localStorage.setItem('local_appointments', JSON.stringify(updated));
      showToast('Cita cancelada localmente con éxito', 'La reserva ha cambiado de estado.');
    }
  };

  // Open Reschedule Modal or Action
  const handleRescheduleSubmit = async (apptId: string, newDate: string, newTime: string) => {
    try {
      const apptRef = doc(db, 'appointments', apptId);
      await updateDoc(apptRef, {
        date: newDate,
        time: newTime,
        status: 'confirmed',
        timestamp: new Date(`${newDate}T${newTime}`).getTime()
      });
      setIsRescheduling(null);
      showToast('Cita reprogramada', `Nueva fecha: ${newDate} a las ${newTime}`);
    } catch (err: any) {
      console.warn('Firestore reschedule failed, using local storage fallback:', err.message);
      const updated = appointments.map(a => a.id === apptId ? {
        ...a,
        date: newDate,
        time: newTime,
        status: 'confirmed' as const,
        timestamp: new Date(`${newDate}T${newTime}`).getTime()
      } : a);
      setAppointments(updated);
      localStorage.setItem('local_appointments', JSON.stringify(updated));
      setIsRescheduling(null);
      showToast('Cita reprogramada localmente', `Nueva fecha: ${newDate} a las ${newTime}`);
    }
  };

  // Create new booking
  const handleNewBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatmentId || !selectedDoctorId || !bookingDate || !bookingTime) {
      showToast('Faltan campos', 'Por favor selecciona tratamiento, doctor, fecha y hora.');
      return;
    }

    const t = treatments.find(treat => treat.id === selectedTreatmentId);
    const d = doctors.find(docItem => docItem.id === selectedDoctorId);

    if (!t || !d) return;

    const timestamp = new Date(`${bookingDate}T${bookingTime}`).getTime();
    const newBooking = {
      patientId: userId === 'sim_patient' ? 'demo_carlos' : userId,
      patientName: profileName,
      treatment: t.name,
      treatmentId: t.id,
      doctorName: d.name,
      doctorId: d.id,
      date: bookingDate,
      time: bookingTime,
      status: 'confirmed' as const,
      timestamp: timestamp
    };

    try {
      await addDoc(collection(db, 'appointments'), newBooking);
      
      // Save notification/alert
      try {
        await addDoc(collection(db, 'messages'), {
          type: 'alert',
          sender: 'Lumina Dental System',
          time: 'Hace un momento',
          timestamp: Date.now(),
          content: `Nueva cita reservada para ${profileName} con ${d.name} (${t.name})`,
          status: 'unread'
        });
      } catch (e) {
        // Suppress messaging block
      }

      setIsNewBookingOpen(false);
      setSelectedTreatmentId('');
      setSelectedDoctorId('');
      setBookingDate('');
      setBookingTime('');
      showToast('¡Cita agendada!', `Confirmada con ${d.name} para el ${bookingDate} a las ${bookingTime}`);
    } catch (err: any) {
      console.warn('Firestore addDoc failed, using local storage fallback:', err.message);
      const localId = 'appt_' + Date.now();
      const localBooking = { id: localId, ...newBooking };
      const updated = [localBooking, ...appointments];
      setAppointments(updated);
      localStorage.setItem('local_appointments', JSON.stringify(updated));

      setIsNewBookingOpen(false);
      setSelectedTreatmentId('');
      setSelectedDoctorId('');
      setBookingDate('');
      setBookingTime('');
      showToast('¡Cita agendada localmente!', `Confirmada con ${d.name} para el ${bookingDate} a las ${bookingTime}`);
    }
  };

  // Find next active appointment
  const nextAppointment = appointments.find(appt => appt.status === 'confirmed' || appt.status === 'room' || appt.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-300">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">Lumina Dental</span>
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
          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight block">Lumina</span>
          <span className="text-xs text-slate-400 font-bold block uppercase tracking-widest mt-0.5">Área Privada</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1.5">
          <a className="flex items-center gap-3 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-2xl p-3.5 font-bold transition-all text-sm" href="#" onClick={() => setMobileSidebarOpen(false)}>
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Inicio</span>
          </a>
          <button 
            onClick={() => { setMobileSidebarOpen(false); setIsNewBookingOpen(true); }}
            className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl p-3.5 text-sm transition-all text-left font-semibold cursor-pointer"
          >
            <CalendarIcon className="w-5 h-5" />
            <span>Reservar Nueva Cita</span>
          </button>
          <a className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl p-3.5 text-sm transition-all font-semibold" href="#" onClick={() => setMobileSidebarOpen(false)}>
            <FileText className="w-5 h-5" />
            <span>Historial Clínico</span>
          </a>
          <a className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl p-3.5 text-sm transition-all font-semibold" href="#" onClick={() => setMobileSidebarOpen(false)}>
            <User className="w-5 h-5" />
            <span>Mi Perfil Dental</span>
          </a>
        </nav>

        {/* Footer Area with active profile info */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 overflow-hidden font-bold">
              {profileName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{profileName}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Paciente Premium</p>
            </div>
          </div>

          <div className="flex gap-2 justify-between items-center">
            <ThemeToggle />
            <button
              onClick={() => { setMobileSidebarOpen(false); onLogout(); }}
              className="flex-1 py-2 px-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Canvas */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 md:overflow-y-auto custom-scrollbar md:h-screen">
        
        {/* Dynamic Patient Area Title & Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Bienvenido, {profileName.split(' ')[0]}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
              Tu salud dental es nuestra prioridad hoy.
            </p>
          </div>
          <button 
            onClick={() => setIsNewBookingOpen(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/15 text-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Cita Lumina
          </button>
        </header>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Focus: Next Scheduled Appointment Card */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden h-full min-h-[250px]">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <CalendarIcon className="w-64 h-64" />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-indigo-200 rounded-full text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Próxima Cita
                </div>
                
                {nextAppointment ? (
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                        {nextAppointment.treatment}
                      </h2>
                      <div className="space-y-2 mt-4 text-slate-300 text-sm">
                        <p className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-indigo-400" />
                          <span>{nextAppointment.date} • {nextAppointment.time} h</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <User className="w-4 h-4 text-indigo-400" />
                          <span>{nextAppointment.doctorName}</span>
                        </p>
                        {nextAppointment.status === 'room' && (
                          <p className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold mt-1">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                            EN SALA DE ESPERA - Te llamarán en breve
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsRescheduling(nextAppointment.id)}
                        className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Reprogramar
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(nextAppointment.id)}
                        className="px-5 py-3 bg-white/10 hover:bg-rose-600/20 text-rose-400 font-semibold rounded-xl text-xs transition-all border border-white/10 hover:border-rose-500/30 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-3">
                    <p className="text-slate-400 text-sm">No tienes citas programadas pendientes en este momento.</p>
                    <button 
                      onClick={() => setIsNewBookingOpen(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 cursor-pointer"
                    >
                      Agendar tu primera consulta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Bento Card: Treatments Progress Tracker */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md h-full">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Tus Tratamientos</h3>
                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Invisalign® Platinum</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">65%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1.5 italic">Semana 14 de 22 • Siguiente control: 24 May</span>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Blanqueamiento LED</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">Completado</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1.5 italic">Completado por Dra. Elena Martínez</span>
                </div>
              </div>

              <button className="w-full mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 cursor-pointer">
                Ver plan clínico detallado
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Notification Alerts */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md h-full">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-4">Avisos Recientes</h3>
              
              <div className="space-y-3">
                {notifications.map((note) => (
                  <div 
                    key={note.id}
                    className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl flex gap-3 hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{note.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{note.body}</p>
                      <span className="text-[9px] text-slate-400 block mt-1 uppercase font-semibold">Hace 2 horas</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Appointments History */}
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Historial de Visitas</h3>
                <span className="text-xs text-slate-400 font-semibold">Mostrando últimas visitas</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold">
                      <th className="pb-3 uppercase tracking-wider">Fecha</th>
                      <th className="pb-3 uppercase tracking-wider">Tratamiento</th>
                      <th className="pb-3 uppercase tracking-wider">Profesional</th>
                      <th className="pb-3 uppercase tracking-wider text-right">Documentación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/30">
                    <tr className="text-slate-700 dark:text-slate-300">
                      <td className="py-3.5 font-medium">12 Abr 2024</td>
                      <td className="py-3.5">Limpieza Dental Pro</td>
                      <td className="py-3.5">Dra. Elena Martínez</td>
                      <td className="py-3.5 text-right">
                        <button className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:scale-105 transition-all inline-flex items-center gap-1 cursor-pointer">
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">PDF</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="text-slate-700 dark:text-slate-300">
                      <td className="py-3.5 font-medium">22 Mar 2024</td>
                      <td className="py-3.5">Estudio Radiográfico 3D</td>
                      <td className="py-3.5">Dr. Javier Ruiz</td>
                      <td className="py-3.5 text-right">
                        <button className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:scale-105 transition-all inline-flex items-center gap-1 cursor-pointer">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">Ver</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="text-slate-700 dark:text-slate-300">
                      <td className="py-3.5 font-medium">05 Feb 2024</td>
                      <td className="py-3.5">Consulta General e Diagnóstico</td>
                      <td className="py-3.5">Dr. Alejandro Sanz</td>
                      <td className="py-3.5 text-right">
                        <button className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:scale-105 transition-all inline-flex items-center gap-1 cursor-pointer">
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold">PDF</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Visual Staff & Treatments Selection Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          
          {/* Left: Our Specialists (Trabajadores) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Equipo Lumina Dental</h3>
                <p className="text-[11px] text-slate-400">Nuestros especialistas en activo hoy</p>
              </div>
              <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {doctors.map(d => (
                <div 
                  key={d.id} 
                  className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 group hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img 
                      src={d.image} 
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm" 
                      alt={d.name} 
                      referrerPolicy="no-referrer"
                    />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{d.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{d.specialty}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                          {d.status} • {d.nextAvailable}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDoctorId(d.id);
                      setIsNewBookingOpen(true);
                    }}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/40 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-[10px] transition-all shrink-0 cursor-pointer"
                  >
                    Reservar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dynamic Treatments and Tariffs */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Catálogo de Servicios y Tarifas</h3>
                <p className="text-[11px] text-slate-400">Tratamientos transparentes sin cargos ocultos</p>
              </div>
              
              {/* Search input and category selector */}
              <div className="flex gap-2 max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Buscar tratamiento..."
                  value={treatmentSearch}
                  onChange={(e) => setTreatmentSearch(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-3 py-1.5 rounded-xl outline-none text-slate-800 dark:text-white focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              {['Todos', 'Preventivo', 'Estética', 'Cirugía', 'Ortodoncia', 'Infantil'].map(cat => {
                const isSelected = selectedCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/10' 
                        : 'bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {treatments
                .filter(t => {
                  const matchesSearch = t.name.toLowerCase().includes(treatmentSearch.toLowerCase());
                  const matchesCategory = selectedCategoryFilter === 'Todos' || t.category === selectedCategoryFilter;
                  return matchesSearch && matchesCategory;
                })
                .map(t => (
                  <div 
                    key={t.id} 
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl flex items-center justify-between gap-4 hover:border-indigo-500/20 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{t.name}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                          t.category === 'Preventivo' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          t.category === 'Estética' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          t.category === 'Cirugía' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                          t.category === 'Infantil' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {t.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Duración estimada: {t.duration} minutos</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="block text-sm font-black text-indigo-600 dark:text-indigo-400">{t.price}€</span>
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Tarifa Plana</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTreatmentId(t.id);
                          setIsNewBookingOpen(true);
                        }}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Agendar
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </section>

        {/* Footer Area */}
        <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 gap-3">
          <p>© 2026 Lumina Dental Care. Área Privada de Pacientes.</p>
          <div className="flex gap-4">
            <a className="hover:text-indigo-600 transition-colors" href="#">Privacidad</a>
            <a className="hover:text-indigo-600 transition-colors" href="#">Términos y Condiciones</a>
            <a className="hover:text-indigo-600 transition-colors" href="#">Soporte Técnico</a>
          </div>
        </footer>

      </main>

      {/* MODAL: New Appointment Booking */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Reservar Cita Lumina</h3>
                <p className="text-xs text-slate-400">Selecciona el tratamiento y profesional preferido para agendar.</p>
              </div>
              <button 
                onClick={() => setIsNewBookingOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNewBooking} className="space-y-5">
              
              {/* Dropdown Treatments Selector with Pricing */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  1. Tratamiento Dental
                </label>
                <select 
                  value={selectedTreatmentId}
                  onChange={(e) => setSelectedTreatmentId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none dark:text-white font-bold cursor-pointer transition-colors"
                  required
                >
                  <option value="">Selecciona el tratamiento...</option>
                  {treatments.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.price}€ ({t.duration} min) [{t.category}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown Staff (Trabajadores) Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  2. Especialista / Odontólogo
                </label>
                <select 
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none dark:text-white font-bold cursor-pointer transition-colors"
                  required
                >
                  <option value="">Selecciona el profesional...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty} ({d.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Fecha</label>
                  <input 
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-sm outline-none dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Hora</label>
                  <input 
                    type="time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-sm outline-none dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                <Sparkles className="w-4 h-4" />
                Confirmar Reserva Online
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: Reschedule Appointment */}
      {isRescheduling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">Reprogramar Consulta</h3>
              <button onClick={() => setIsRescheduling(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Nueva Fecha</label>
                <input 
                  type="date"
                  id="reschedule-date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-sm outline-none dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Nueva Hora</label>
                <input 
                  type="time"
                  id="reschedule-time"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-sm outline-none dark:text-white"
                />
              </div>

              <button
                onClick={() => {
                  const dVal = (document.getElementById('reschedule-date') as HTMLInputElement)?.value;
                  const tVal = (document.getElementById('reschedule-time') as HTMLInputElement)?.value;
                  if (dVal && tVal) {
                    handleRescheduleSubmit(isRescheduling, dVal, tVal);
                  } else {
                    showToast('Faltan datos', 'Por favor ingresa fecha y hora.');
                  }
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Confirmar Reprogramación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (AI Assistant) and LuminaChatbot integration */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group cursor-pointer relative"
        >
          <Bot className="w-7 h-7 animate-pulse" />
          <span className="absolute right-full mr-3 bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            ¿En qué puedo ayudarte hoy?
          </span>
        </button>
      </div>

      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed bottom-24 right-6 w-full max-w-[440px] h-[600px] z-50 animate-slideup">
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl h-full border border-slate-200 dark:border-slate-800/80">
              <LuminaChatbot onClose={() => setIsChatOpen(false)} />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom dynamic notifications toast */}
      {toast && (
        <div className="fixed bottom-8 left-8 bg-slate-900 dark:bg-slate-800 text-white px-5 py-4 rounded-2xl border-l-4 border-indigo-500 shadow-2xl z-50 flex items-center gap-3 animate-slideup max-w-sm">
          <CheckCircle className="w-6 h-6 text-indigo-400 shrink-0" />
          <div>
            <p className="font-bold text-xs">{toast.message}</p>
            {toast.sub && <p className="text-[10px] text-slate-400 mt-0.5">{toast.sub}</p>}
          </div>
        </div>
      )}

    </div>
  );
}
