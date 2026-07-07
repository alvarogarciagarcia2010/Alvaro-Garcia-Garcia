import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, seedDatabaseIfEmpty } from './firebase';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import { HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'patient' | 'doctor' | 'admin' | null>(null);
  const [profileName, setProfileName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Seed clinical default database records if they are empty
    seedDatabaseIfEmpty();

    // 2. Auth state observer
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Fetch role from Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserRole(data.role || 'patient');
            setProfileName(data.name || user.displayName || 'Usuario');
          } else {
            // New user signed up, default to patient
            const name = user.displayName || 'Paciente Lumina';
            await setDoc(userDocRef, {
              id: user.uid,
              name: name,
              email: user.email,
              role: 'patient',
              premium: true
            });
            setUserRole('patient');
            setProfileName(name);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          // Local fallback in case Firestore connection has intermittent delay
          if (user.email === 'admin@lumina.com') {
            setUserRole('admin');
            setProfileName('Dr. Alarcón');
          } else if (user.email === 'doctor@lumina.com') {
            setUserRole('doctor');
            setProfileName('Dr. Alejandro Sanz');
          } else {
            setUserRole('patient');
            setProfileName(user.displayName || 'Carlos Méndez');
          }
        }
      } else {
        // If there is no active Firebase Auth user, check if there is a local mock session
        const savedLocalSession = localStorage.getItem('local_active_session');
        if (savedLocalSession) {
          try {
            const session = JSON.parse(savedLocalSession);
            setCurrentUser(session.user);
            setUserRole(session.role);
            setProfileName(session.name);
          } catch (err) {
            console.error('Error parsing local active session:', err);
            setCurrentUser(null);
            setUserRole(null);
            setProfileName('');
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
          setProfileName('');
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleAuthSuccess = (user: any, role: 'patient' | 'doctor' | 'admin', name: string) => {
    setCurrentUser(user);
    setUserRole(role);
    setProfileName(name);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('local_active_session');
      setCurrentUser(null);
      setUserRole(null);
      setProfileName('');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center">
            <HeartHandshake className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Cargando Entorno Clínico Lumina...
        </p>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen selection:bg-blue-600/20 antialiased">
      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LoginView onAuthSuccess={handleAuthSuccess} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {userRole === 'admin' && (
              <AdminDashboard 
                userId={currentUser.uid} 
                userEmail={currentUser.email} 
                profileName={profileName}
                onLogout={handleLogout} 
              />
            )}
            {userRole === 'doctor' && (
              <DoctorDashboard 
                userId={currentUser.uid} 
                userEmail={currentUser.email} 
                profileName={profileName}
                onLogout={handleLogout} 
              />
            )}
            {userRole === 'patient' && (
              <PatientDashboard 
                userId={currentUser.uid} 
                userEmail={currentUser.email} 
                profileName={profileName}
                onLogout={handleLogout} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
