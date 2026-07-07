import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc
} from 'firebase/firestore';
import { db, DEFAULT_APPOINTMENTS } from '../firebase';
import { Appointment } from '../types';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Plus, 
  Sparkles, 
  LogOut, 
  Clipboard, 
  Lightbulb,
  Pin,
  Stethoscope,
  X,
  Menu
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface DoctorDashboardProps {
  userId: string;
  userEmail: string;
  profileName: string;
  onLogout: () => void;
}

export default function DoctorDashboard({ userId: _userId, userEmail: _userEmail, profileName, onLogout }: DoctorDashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Interactive Reminders/Notes taking
  const [reminders, setReminders] = useState<string[]>([
    'Pedir nuevos moldes para el laboratorio de prótesis antes de las 14:00.',
    'Revisar radiografías del paciente de las 12:00 (R. Castro).'
  ]);
  const [newReminder, setNewReminder] = useState('');

  // Active observation modal for notes
  const [selectedApptForNotes, setSelectedApptForNotes] = useState<Appointment | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Read all appointments scheduled for today with local storage fallback
    const unsubscribe = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const items: Appointment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Appointment;
        items.push({ id: doc.id, ...data });
      });
      // Sort by time
      items.sort((a, b) => a.time.localeCompare(b.time));
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

    return unsubscribe;
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Update appointment status (Confirmed -> Waiting Room / Sala -> Completed)
  const handleUpdateStatus = async (apptId: string, newStatus: Appointment['status']) => {
    try {
      const apptRef = doc(db, 'appointments', apptId);
      await updateDoc(apptRef, { status: newStatus });
      showToast(`Estado cambiado a: ${newStatus === 'room' ? 'En Sala' : 'Finalizado'}`);
    } catch (err: any) {
      console.warn('Firestore write failed, using local storage fallback:', err.message);
      const updated = appointments.map(a => a.id === apptId ? { ...a, status: newStatus } : a);
      setAppointments(updated);
      localStorage.setItem('local_appointments', JSON.stringify(updated));
      showToast(`Estado cambiado localmente a: ${newStatus === 'room' ? 'En Sala' : 'Finalizado'}`);
    }
  };

  // Add customized doctor observations in real-time
  const handleSaveNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptForNotes) return;

    try {
      const apptRef = doc(db, 'appointments', selectedApptForNotes.id);
      await updateDoc(apptRef, { notes: sessionNotes });
      setSelectedApptForNotes(null);
      setSessionNotes('');
      showToast('Notas clínicas guardadas en el historial del paciente.');
    } catch (err: any) {
      console.warn('Firestore write failed, using local storage fallback:', err.message);
      const updated = appointments.map(a => a.id === selectedApptForNotes.id ? { ...a, notes: sessionNotes } : a);
      setAppointments(updated);
      localStorage.setItem('local_appointments', JSON.stringify(updated));
      setSelectedApptForNotes(null);
      setSessionNotes('');
      showToast('Notas clínicas guardadas localmente.');
    }
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim()) return;
    setReminders([...reminders, newReminder.trim()]);
    setNewReminder('');
    showToast('Recordatorio añadido.');
  };

  const handleRemoveReminder = (index: number) => {
    const updated = reminders.filter((_, i) => i !== index);
    setReminders(updated);
    showToast('Recordatorio completado/eliminado.');
  };

  // Filter patients by categories
  const inRoomPatients = appointments.filter(a => a.status === 'room');
  const confirmedPatients = appointments.filter(a => a.status === 'confirmed');

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
          <span className="text-2xl font-black text-slate-900 dark:text-white block tracking-tight">Lumina Admin</span>
          <span className="text-xs text-slate-400 font-bold block uppercase tracking-widest mt-0.5">Clinical Specialist</span>
        </div>

        <nav className="flex-grow flex flex-col gap-1.5">
          <a className="flex items-center gap-3 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-2xl p-3.5 font-bold transition-all text-sm" href="#" onClick={() => setMobileSidebarOpen(false)}>
            <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Dashboard</span>
          </a>
          <a className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl p-3.5 text-sm transition-all font-semibold" href="#" onClick={() => setMobileSidebarOpen(false)}>
            <Calendar className="w-5 h-5" />
            <span>Agenda del Día</span>
          </a>
          <a className="flex items-center gap-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl p-3.5 text-sm transition-all font-semibold" href="#" onClick={() => setMobileSidebarOpen(false)}>
            <Clipboard className="w-5 h-5" />
            <span>Historial Clínico</span>
          </a>
        </nav>

        {/* Footer Specialist profile info */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/15 overflow-hidden flex items-center justify-center font-bold">
              AS
            </div>
            <div>
              <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{profileName}</p>
              <p className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Especialista • ID: 29384</p>
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
        
        {/* Header / Stats */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Buenos días, {profileName.split(' ')[0]}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
              Aquí tienes el resumen de tu jornada para hoy.
            </p>
          </div>

          <div className="flex gap-4">
            {/* Stat Card 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[170px] shadow-sm">
              <div className="w-11 h-11 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Citas Hoy</p>
                <p className="text-2xl font-black text-slate-950 dark:text-white">{appointments.filter(a => a.status !== 'cancelled').length}</p>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[170px] shadow-sm">
              <div className="w-11 h-11 rounded-full bg-amber-400/15 flex items-center justify-center text-amber-500">
                <Sparkles className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Valoración</p>
                <p className="text-2xl font-black text-slate-950 dark:text-white">4.9/5</p>
              </div>
            </div>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Main Section: Agenda Calendar Timeline */}
          <section className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Agenda Cronológica de Consultas
                </h2>
                <span className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest">HOY</span>
              </div>

              {/* Custom Medical Timeline Component */}
              <div className="space-y-6">
                {appointments.filter(a => a.status !== 'cancelled').map((appt, idx) => (
                  <div key={appt.id} className="flex gap-4 relative group">
                    {idx < appointments.filter(a => a.status !== 'cancelled').length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800/80"></div>
                    )}
                    
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 z-10 shadow-sm border ${
                      appt.status === 'room' 
                        ? 'bg-emerald-500 text-white border-emerald-400' 
                        : appt.status === 'completed'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200/50'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}>
                      {appt.time}
                    </div>

                    <div className="flex-grow p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-500/30 transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{appt.patientName}</h4>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            appt.status === 'room'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse'
                              : appt.status === 'completed'
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                : 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
                          }`}>
                            {appt.status === 'room' ? 'En Sala' : appt.status === 'completed' ? 'Finalizado' : 'Confirmado'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{appt.treatment}</p>
                        {appt.notes && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 italic">
                            " {appt.notes} "
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {appt.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'room')}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Llamar a Sala
                          </button>
                        )}
                        {appt.status === 'room' && (
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'completed')}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Marcar Completado
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedApptForNotes(appt);
                            setSessionNotes(appt.notes || '');
                          }}
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold transition-all hover:bg-blue-500 hover:text-white cursor-pointer"
                        >
                          Escribir Notas
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right Sidebar Section: Today's queue & Reminders */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Patients Waiting Queue */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white text-md mb-4 flex justify-between items-center">
                <span>Pacientes Activos</span>
                <span className="text-[10px] font-black bg-blue-600/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full uppercase tracking-wider">Hoy</span>
              </h3>

              <div className="space-y-4">
                {/* Waiting Room Patient */}
                {inRoomPatients.length > 0 ? (
                  inRoomPatients.map(p => (
                    <div key={p.id} className="p-4 rounded-2xl bg-emerald-500/5 border-l-4 border-emerald-500 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-emerald-600">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          EN SALA DE ESPERA
                        </span>
                        <span>{p.time}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{p.patientName}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">{p.treatment}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-2xl text-center text-xs text-slate-400">
                    Ningún paciente en sala de espera en este momento.
                  </div>
                )}

                {/* Confirmed list */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="text-xs font-bold text-slate-400 mb-2">Próximos Confirmados</p>
                  <div className="space-y-2">
                    {confirmedPatients.map(p => (
                      <div key={p.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{p.patientName}</p>
                          <span className="text-[10px] text-slate-400">{p.treatment}</span>
                        </div>
                        <span className="font-mono text-slate-500">{p.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick reminders notes */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-md flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Mis Recordatorios
              </h3>

              <form onSubmit={handleAddReminder} className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Escribir recordatorio..."
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none dark:text-white"
                />
                <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                {reminders.map((r, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 group">
                    <button 
                      onClick={() => handleRemoveReminder(idx)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-600 mt-0.5"
                    >
                      <Pin className="w-3.5 h-3.5 rotate-45 text-indigo-500" />
                    </button>
                    <span className="flex-1 leading-relaxed">{r}</span>
                  </div>
                ))}
              </div>
            </div>

          </aside>

        </div>

      </main>

      {/* MODAL: Edit observation notes */}
      {selectedApptForNotes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slideup">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Notas Clínicas</h3>
                <p className="text-xs text-slate-400">Paciente: {selectedApptForNotes.patientName}</p>
              </div>
              <button onClick={() => setSelectedApptForNotes(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNotesSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Observación Médica</label>
                <textarea 
                  rows={4}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Escribe comentarios, receta, evolución o indicaciones post-tratamiento..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none dark:text-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Guardar Observaciones Médicas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Feedback Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-slate-900 dark:bg-slate-800 text-white px-5 py-4 rounded-xl border-l-4 border-indigo-500 shadow-2xl z-50 flex items-center gap-3 animate-slideup max-w-sm">
          <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
          <span className="text-xs font-bold">{toast}</span>
        </div>
      )}

    </div>
  );
}
