import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, firebaseProjectId } from '../firebase';
import { 
  Sparkles, Mail, Lock, User, Activity, AlertCircle, Shield, UserCheck,
  ArrowRight, ChevronDown, Award, Heart, Smile, Zap,
  CheckCircle, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginViewProps {
  onAuthSuccess: (user: any, role: 'patient' | 'doctor' | 'admin', profileName: string) => void;
}

export default function LoginView({ onAuthSuccess }: LoginViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLocalFallbackBanner, setShowLocalFallbackBanner] = useState(false);

  // Pre-configured test accounts for instant evaluation
  const demoAccounts = [
    {
      label: 'Director Clínico (Admin)',
      email: 'admin@lumina.com',
      pass: 'admin123',
      role: 'admin',
      desc: 'Panel de Control General',
      color: 'border-brand-navy dark:border-slate-600 bg-brand-navy/5 text-brand-navy dark:text-slate-200'
    },
    {
      label: 'Especialista (Dr. Alejandro Sanz)',
      email: 'doctor@lumina.com',
      pass: 'doctor123',
      role: 'doctor',
      desc: 'Panel del Especialista y Agenda',
      color: 'border-indigo-200 bg-indigo-50/50 text-indigo-700 dark:text-indigo-300'
    },
    {
      label: 'Paciente Premium (Carlos Méndez)',
      email: 'paciente@lumina.com',
      pass: 'paciente123',
      role: 'patient',
      desc: 'Área Privada de Pacientes',
      color: 'border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:text-emerald-300'
    }
  ];

  const startLocalDemoMode = (role: 'patient' | 'doctor' | 'admin') => {
    const demo = demoAccounts.find(d => d.role === role) || demoAccounts[0];
    const simulatedUser = { 
      uid: `sim_${role}`, 
      email: demo.email, 
      displayName: role === 'admin' ? 'Dr. Alarcón' : role === 'doctor' ? 'Dr. Alejandro Sanz' : 'Carlos Méndez' 
    };
    localStorage.setItem('local_active_session', JSON.stringify({
      user: simulatedUser,
      role: role,
      name: simulatedUser.displayName
    }));
    onAuthSuccess(simulatedUser, role as any, simulatedUser.displayName);
  };

  const handleDemoLogin = async (demo: typeof demoAccounts[0]) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Sign in with Auth
      const userCredential = await signInWithEmailAndPassword(auth, demo.email, demo.pass);
      const user = userCredential.user;

      // 2. Double check profile in Firestore (if not exists, create it)
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let profileName = user.displayName || (demo.role === 'admin' ? 'Dr. Alarcón' : demo.role === 'doctor' ? 'Dr. Alejandro Sanz' : 'Carlos Méndez');
      let role = demo.role as 'patient' | 'doctor' | 'admin';

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          id: user.uid,
          name: profileName,
          email: demo.email,
          role: role,
          premium: demo.role === 'patient'
        });
      } else {
        const data = userDocSnap.data();
        role = data.role || demo.role;
        profileName = data.name || profileName;
      }

      onAuthSuccess(user, role, profileName);
    } catch (err: any) {
      console.warn('Firebase login failed for demo account, auto-falling back to local simulated session:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setShowLocalFallbackBanner(true);
      }
      // Instantly start local simulated session to provide an elite, unblocked user experience
      startLocalDemoMode(demo.role as 'patient' | 'doctor' | 'admin');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      
      // Check if user doc exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let role: 'patient' | 'doctor' | 'admin' = 'patient';
      let profileName = user.displayName || 'Usuario de Google';
      
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        role = data.role || 'patient';
        profileName = data.name || profileName;
      } else {
        // If it's a new user, register them in Firestore
        // Use the selectedRole on the Sign Up tab, or default to 'patient'
        const registrationRole = isSignUp ? selectedRole : 'patient';
        await setDoc(userDocRef, {
          id: user.uid,
          name: profileName,
          email: user.email,
          role: registrationRole,
          premium: registrationRole === 'patient'
        });
        role = registrationRole;
      }
      
      onAuthSuccess(user, role, profileName);
    } catch (err: any) {
      console.error('Google Auth failed:', err);
      let msg = err.message || 'Error al iniciar sesión con Google.';
      if (err.code === 'auth/popup-blocked') {
        msg = 'El navegador bloqueó la ventana de Google. Por favor, permite las ventanas emergentes.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = `El inicio de sesión con Google no está habilitado en tu consola Firebase ${firebaseProjectId}. Actívalo en Authentication.`;
        setShowLocalFallbackBanner(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (isSignUp && !fullName) {
      setError('Por favor indica tu nombre completo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // 1. Create Auth user in Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update display name in Auth
        await updateProfile(user, { displayName: fullName });

        // 3. Create user doc in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          name: fullName,
          email: email,
          role: selectedRole,
          premium: selectedRole === 'patient'
        });

        onAuthSuccess(user, selectedRole, fullName);
      } else {
        // Sign in
        // 1. Try Firebase Auth sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Fetch role from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        let role: 'patient' | 'doctor' | 'admin' = 'patient';
        let profileName = user.displayName || 'Usuario';

        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            role = data.role || 'patient';
            profileName = data.name || profileName;
          } else {
            // Create default fallback document in case profile was not present
            await setDoc(userDocRef, {
              id: user.uid,
              name: profileName,
              email: email,
              role: 'patient'
            });
          }
        } catch (docErr) {
          console.warn('Could not read user profile from Firestore:', docErr);
        }

        onAuthSuccess(user, role, profileName);
      }
    } catch (err: any) {
      console.error('Firebase Auth operation failed:', err);
      let msg = err.message || 'Ocurrió un error. Verifica tus datos.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Credenciales incorrectas o el usuario no existe. Regístrate antes de ingresar.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'El correo electrónico ya está en uso.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = `El inicio de sesión con Correo/Contraseña no está habilitado en tu consola Firebase ${firebaseProjectId}. Por favor actívalo en la pestaña Authentication de tu consola.`;
        setShowLocalFallbackBanner(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const scrollToAuth = () => {
    const element = document.getElementById('portal-acceso');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-0 right-0 h-[650px] bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none z-0" />
      <div className="absolute top-[15%] right-10 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[45%] left-10 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none z-0" />

      {/* Header / Navigation Bar */}
      <header className="relative z-50 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/40">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-300 bg-clip-text text-transparent">
              LUMINA
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-widest -mt-1">
              Dental Care
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <a href="#especialidades" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Especialidades</a>
          <a href="#tecnologia" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Tecnología</a>
          <a href="#metodo" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Método Lumina</a>
          <a href="#portal-acceso" onClick={(e) => { e.preventDefault(); scrollToAuth(); }} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Portal Clínico</a>
        </nav>

        <div className="flex items-center gap-2">
          <button 
            onClick={scrollToAuth}
            className="hidden sm:inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full shadow-md shadow-indigo-500/10 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Área de Pacientes
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 mx-6 p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl flex flex-col gap-4 z-50 md:hidden"
            >
              <a 
                href="#especialidades" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-1 transition-colors border-b border-slate-100 dark:border-slate-900"
              >
                Especialidades
              </a>
              <a 
                href="#tecnologia" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-1 transition-colors border-b border-slate-100 dark:border-slate-900"
              >
                Tecnología
              </a>
              <a 
                href="#metodo" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-1 transition-colors border-b border-slate-100 dark:border-slate-900"
              >
                Método Lumina
              </a>
              <a 
                href="#portal-acceso" 
                onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); scrollToAuth(); }}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 py-1 transition-colors border-b border-slate-100 dark:border-slate-900"
              >
                Portal Clínico
              </a>
              <button 
                onClick={() => { setMobileMenuOpen(false); scrollToAuth(); }}
                className="w-full mt-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-500/10 active:scale-95 transition-all text-center cursor-pointer"
              >
                Área de Pacientes
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Intro Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-16 text-center">
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold tracking-wide mb-6"
        >
          <Sparkles className="w-4 h-4" />
          Odontología de Vanguardia & Cuidado Premium Sincronizado
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6"
        >
          La odontología del futuro, <span className="text-indigo-600 dark:text-indigo-400">diseñada para tu comodidad</span>.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Lumina Dental Care fusiona el rigor clínico de especialistas líderes con tecnología digital e inteligencia artificial. Gestiona tus tratamientos 3D, accede a tu historial médico y agenda citas virtuales desde una sola plataforma premium.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button 
            onClick={scrollToAuth}
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
          >
            <span>Acceder al Portal Premium</span>
            <ArrowRight className="w-5 h-5 animate-pulse" />
          </button>
          <a 
            href="#especialidades"
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 text-slate-700 dark:text-slate-300 font-bold rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all"
          >
            <span>Conoce Lumina</span>
          </a>
        </motion.div>

        {/* Small Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-16 animate-bounce text-slate-400 flex flex-col items-center gap-1"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Deslizar para descubrir</span>
          <ChevronDown className="w-4 h-4 text-indigo-500" />
        </motion.div>
      </section>

      {/* Corporate Clinical Stats */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-y border-slate-200/50 dark:border-slate-800/40 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm rounded-3xl grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-center"
        >
          <span className="block text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">+15.000</span>
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Sonrisas Diseñadas</span>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-center"
        >
          <span className="block text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">99.2%</span>
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Satisfacción Clínica</span>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-center"
        >
          <span className="block text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">24/7</span>
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Soporte Lumina AI</span>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="text-center"
        >
          <span className="block text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">18+ Años</span>
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">De Vanguardia Médica</span>
        </motion.div>
      </section>

      {/* Specialties Grid */}
      <section id="especialidades" className="relative z-10 max-w-7xl mx-auto px-6 py-16 scroll-mt-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-3">Nuestras Especialidades</h2>
          <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Cuidado médico integral con tecnología de punta</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-4">Nuestros gabinetes están equipados con los últimos avances en diagnóstico e implantología digital.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Estética & Implantología */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-lg hover:border-indigo-500/20 dark:hover:border-indigo-500/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Smile className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-3">Implantología & Estética Digital</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Implantes de carga inmediata guiados por ordenador y carillas estéticas personalizadas en 3D para una rehabilitación rápida y segura.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Saber más</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </motion.div>

          {/* Card 2: Ortodoncia Invisible */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-lg hover:border-indigo-500/20 dark:hover:border-indigo-500/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-3">Ortodoncia Invisible (Invisalign®)</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Alineadores transparentes con tecnología biomecánica de vanguardia para corregir tu sonrisa de forma cómoda, higiénica y discreta.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Saber más</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </motion.div>

          {/* Card 3: Periodoncia & Salud General */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-lg hover:border-indigo-500/20 dark:hover:border-indigo-500/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-3">Prevención & Periodoncia Avanzada</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Tratamientos biológicos de encías y programas personalizados de higiene dental clínica para garantizar la salud ósea a largo plazo.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Saber más</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Assistance and cloud tech spotlight */}
      <section id="tecnologia" className="relative z-10 max-w-7xl mx-auto px-6 py-16 scroll-mt-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="bg-gradient-to-r from-indigo-900 to-slate-900 dark:from-indigo-950 dark:to-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center gap-10"
        >
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex-1 space-y-6"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Innovación Lumina AI
            </span>
            <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Asistencia personalizada y diagnósticos interactivos 24/7
            </h3>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              La IA exclusiva de Lumina te asiste en todo momento. Consulta dudas sobre tus tratamientos activos, reprograma citas en lenguaje natural o conversa con nuestro chatbot entrenado clínicamente para brindarte respuestas veraces y seguras.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Pre-evaluación interactiva de síntomas</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Sincronización instantánea con tu expediente clínico en la nube</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Recordatorios proactivos y guías de cuidado post-tratamiento</span>
              </div>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 w-full max-w-sm bg-white/5 dark:bg-black/20 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-md"
          >
            <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-bold text-base text-white mb-2">Simulador de Consulta Virtual</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              "Hola Carlos, recuerda que tu próximo control de Invisalign es el 24 de Mayo. ¿Deseas consultar las pautas de uso para el alineador actual?"
            </p>
            <button 
              onClick={scrollToAuth}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>Probar Asistente</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Lumina Method */}
      <section id="metodo" className="relative z-10 max-w-7xl mx-auto px-6 py-16 scroll-mt-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-3">El Método Lumina</h2>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Tu camino hacia una salud oral óptima</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-3">Un flujo digital ágil que respeta tu tiempo y se adapta a tu ritmo.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.93 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.05 }}
            whileHover={{ y: -6 }}
            className="space-y-4 p-6 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm hover:shadow-md hover:border-indigo-500/10 dark:hover:border-indigo-500/10 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center mx-auto shadow-md shadow-indigo-500/10">1</div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Registro Instantáneo</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Crea tu cuenta premium en menos de un minuto. Tus datos médicos están completamente protegidos por la nube segura de Firebase.</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.93 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            whileHover={{ y: -6 }}
            className="space-y-4 p-6 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm hover:shadow-md hover:border-indigo-500/10 dark:hover:border-indigo-500/10 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center mx-auto shadow-md shadow-indigo-500/10">2</div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Diagnóstico Virtual & Físico</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Reserva citas presenciales o virtuales asistidas por IA. Recibe notificaciones y recordatorios automáticos en tiempo real.</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.93 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.25 }}
            whileHover={{ y: -6 }}
            className="space-y-4 p-6 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm hover:shadow-md hover:border-indigo-500/10 dark:hover:border-indigo-500/10 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center mx-auto shadow-md shadow-indigo-500/10">3</div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Plan 3D Sincronizado</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Sigue tu tratamiento interactivo paso a paso. Consulta recetas, estudios radiográficos, descargables PDF y evoluciones clínicas.</p>
          </motion.div>
        </div>
      </section>

      {/* PORTAL DE ACCESO / LOGIN / SIGNUP AT THE BOTTOM */}
      <section id="portal-acceso" className="relative z-10 py-24 bg-slate-100/50 dark:bg-slate-900/40 border-t border-slate-200/50 dark:border-slate-800/40 scroll-mt-6">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Acceso Premium Lumina</span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Ingresa a tu Área Privada</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 max-w-md mx-auto">
              Utiliza el formulario de abajo para ingresar con tus credenciales o accede de inmediato utilizando uno de los perfiles demo de prueba.
            </p>
          </motion.div>

          <div className="w-full max-w-3xl mx-auto">
            <motion.div 
              layout
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isSignUp ? 'Crear una cuenta' : 'Iniciar Sesión'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {isSignUp ? 'Únete a Lumina Dental' : 'Bienvenido de nuevo'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {isSignUp ? '¿Ya tienes cuenta? Ingresa' : '¿Eres nuevo? Regístrate'}
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-2xl flex items-start gap-2 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {showLocalFallbackBanner && (
                <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-4">
                  <div className="flex gap-3">
                    <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                        ¿Cómo activar el acceso en tu consola Firebase?
                      </h4>
                      <p className="text-xs text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
                        Para que funcione el login en tu proyecto <code className="bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-amber-900 dark:text-amber-200">{firebaseProjectId}</code>, debes habilitar el proveedor en la consola:
                      </p>
                      <ol className="list-decimal list-inside text-[11px] text-amber-700/80 dark:text-amber-400/80 space-y-1 mt-2">
                        <li>Ve a tu <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-950 dark:hover:text-amber-200">Consola de Firebase</a>.</li>
                        <li>Entra en <strong>Authentication</strong> &gt; pestaña <strong>Sign-in method</strong>.</li>
                        <li>Haz clic en <strong>Agregar nuevo proveedor</strong> y selecciona <strong>Google</strong> o <strong>Correo electrónico/contraseña</strong>.</li>
                        <li>Habilita el proveedor, configura el correo de soporte si se solicita, y haz clic en <strong>Guardar</strong>.</li>
                      </ol>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-amber-200 dark:border-amber-900/40">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">
                      O accede de inmediato usando el modo demo simulado local para probar el sistema:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => startLocalDemoMode('patient')}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <UserCheck className="w-4 h-4" />
                        Paciente Demo
                      </button>
                      <button
                        type="button"
                        onClick={() => startLocalDemoMode('doctor')}
                        className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Shield className="w-4 h-4" />
                        Médico Demo
                      </button>
                      <button
                        type="button"
                        onClick={() => startLocalDemoMode('admin')}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Lock className="w-4 h-4" />
                        Admin Demo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                        Nombre Completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Ej. Carlos Méndez"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white outline-none transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                        Rol de Usuario para pruebas
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRole('patient')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            selectedRole === 'patient'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <UserCheck className="w-4 h-4" />
                          Paciente
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRole('doctor')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            selectedRole === 'doctor'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <Shield className="w-4 h-4" />
                          Especialista
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRole('admin')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            selectedRole === 'admin'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/10'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <Lock className="w-4 h-4" />
                          Admin
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="email"
                      placeholder="ejemplo@lumina.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {isSignUp ? 'Registrar Cuenta' : 'Ingresar'}
                    </>
                  )}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-950 px-2.5 text-slate-500 dark:text-slate-400 font-medium">
                    O continúa con
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 active:scale-[0.98] text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm mb-2"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.73 14.9 1 12 1 7.35 1 3.39 3.67 1.41 7.56l3.85 2.99C6.18 7.23 8.86 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.49z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.26 14.55c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.41 6.96C.51 8.76 0 10.77 0 12.9s.51 4.14 1.41 5.94l3.85-2.99z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-3.9 1.09-3.14 0-5.82-2.19-6.74-5.11L1.81 16.2C3.79 20.09 7.75 23 12 23z"
                  />
                </svg>
                <span>
                  {isSignUp ? 'Registrarse con Google' : 'Iniciar sesión con Google'}
                </span>
              </button>

              {/* Quick Demo Credentials Panel */}
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 block">
                  Acceso Rápido para Demostración e Inspección
                </h3>
                <div className="space-y-2.5">
                  {demoAccounts.map((demo) => (
                    <button
                      key={demo.role}
                      onClick={() => handleDemoLogin(demo)}
                      className={`w-full text-left p-3.5 border rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center hover:scale-[1.01] transition-all cursor-pointer ${demo.color}`}
                    >
                      <div>
                        <span className="font-bold text-xs block">{demo.label}</span>
                        <span className="text-[11px] opacity-80 block md:inline">{demo.desc}</span>
                      </div>
                      <div className="text-[10px] mt-1 md:mt-0 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 font-mono font-medium">
                        {demo.email} • {demo.pass}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Corporate Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-12 bg-white dark:bg-slate-950 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
              L
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Lumina Dental Care</span>
          </div>
          <p>© 2026 Lumina Dental Care. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Términos</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Soporte</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
