import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  query,
  limit
} from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

// Configuration from environment variables or fallback to the config file
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || "clinica-dental-b0cf5",
  appId: metaEnv.VITE_FIREBASE_APP_ID || appletConfig.appId || "1:796666227200:web:657586378d44e1a67d06e5",
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || appletConfig.apiKey || "AIzaSyBjlfjCIXNXHbEMJ_sKFAe2lIJ55Mpyg8A",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || "clinica-dental-b0cf5.firebaseapp.com",
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || undefined,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || "clinica-dental-b0cf5.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || "796666227200"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
export const firebaseProjectId = firebaseConfig.projectId;

// Default Data Constants used as local fallback and initial seeding
export const DEFAULT_TREATMENTS = [
  { id: 'limpieza', name: 'Limpieza Avanzada', category: 'Preventivo', price: 65, duration: 45 },
  { id: 'invisalign', name: 'Ortodoncia Invisalign', category: 'Estética', price: 2400, duration: 60 },
  { id: 'implante', name: 'Implante de Titanio', category: 'Cirugía', price: 850, duration: 90 },
  { id: 'blanqueamiento', name: 'Blanqueamiento Dental LED', category: 'Estética', price: 180, duration: 60 },
  { id: 'odontopediatria', name: 'Consulta Odontopediatría', category: 'Infantil', price: 50, duration: 30 },
  { id: 'endodoncia', name: 'Endodoncia Avanzada', category: 'Cirugía', price: 220, duration: 60 },
  { id: 'carillas', name: 'Carillas de Porcelana', category: 'Estética', price: 350, duration: 90 },
  { id: 'ferula', name: 'Férula de Descarga', category: 'Preventivo', price: 150, duration: 45 },
  { id: 'reconstruccion', name: 'Reconstrucción Composite Alta Estética', category: 'Estética', price: 120, duration: 45 },
  { id: 'periodoncia', name: 'Tratamiento de Periodoncia (Curetajes)', category: 'Preventivo', price: 90, duration: 50 },
  { id: 'extraccion', name: 'Extracción de Muela del Juicio', category: 'Cirugía', price: 150, duration: 60 }
];

export const DEFAULT_DOCTORS = [
  { 
    id: 'dra_martinez', 
    name: 'Dra. Elena Martínez', 
    specialty: 'Especialista en Cirugía Oral y Maxilofacial', 
    status: 'DISPONIBLE', 
    nextAvailable: '16:30h',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMEimeyx4vbfOOIRVuINqJ6S0wm8AduvGo2z06pA3WfYQV0OJDNhOpEg3gf2KRFPh51HsGZh76DTFLG4o1foA6fGen9-8rFWydw-KL_cpKqI1loCos_4qX19lIcQJ3tnxkL3QxwUDFHdfnphT_IKQADb__mDURp_2z8vvBsUfTXMKK4129Q-ULx-KC24G6nTLiqCNIHOfpIPHTfyDIrzzDoNoJQs0gVXLquQAyMda8BGcp8mEg1DPmTmFe51hPfLuOsy-v9aQD5Pg1'
  },
  { 
    id: 'dr_ruiz', 
    name: 'Dr. Javier Ruiz', 
    specialty: 'Odontología Estética y Restauradora', 
    status: 'EN CONSULTA', 
    nextAvailable: '17:15h',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtDPNiEVXN020aqzw7U2LD4ZqzsJ1xPsrs4iemcgrSUoEibtDWzAUuJdOxZfy6flMCnrugqq1-7bv4otbdLqLSxPYKDji_c6eX4B-98bqoMfip3iu1dypcwaeWSx-ZonpkGGi9ec82vNLmZ63dlc7ezicaVS_9hD5SZ4Ne0oPpKs0jDR0nLdLeqKF6PWBwXoe7fkL8yMwWGIRE5fN1CB68DMP199AF1m8q5vLNh7zEgnuISXbu8j2kmCtpSgVV8vJZCtzhE2ZnxGmi'
  },
  { 
    id: 'dr_sanz', 
    name: 'Dr. Alejandro Sanz', 
    specialty: 'Ortodoncista y Director Clínico', 
    status: 'DISPONIBLE', 
    nextAvailable: '09:00h',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmXxNho4geOpoTtoWAldaI32InHw2n9wbO3dMcCxVkoWSuZllI60CBEsfi8fa35z7L-RwoDNZ8IgiY_dF_wtLvo4Hvmjm_4tGmbEjvGaQFRfgVmkk3t92zXXHP6cBrHMW3SoRclSBTxE-GuzpYR5nzNp5DpzSOyPMv7YpcvenAy3gcFadRXgyKLzfK1o3GiQUNbIaUC-58htiS1U4pDc_ACtFaADGGDEYkm1AboDLgXyucH62iTNjkZ5hXTWoxIuM07dpes83IpYd1'
  },
  {
    id: 'dra_alarcon',
    name: 'Dra. Sofía Alarcón',
    specialty: 'Especialista en Odontopediatría y Estética',
    status: 'DISPONIBLE',
    nextAvailable: '11:30h',
    image: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=250&h=250'
  },
  {
    id: 'dr_torres',
    name: 'Dr. Manuel Torres',
    specialty: 'Periodoncista e Implantes Dentales',
    status: 'DISPONIBLE',
    nextAvailable: '15:45h',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250&h=250'
  },
  {
    id: 'dra_benitez',
    name: 'Dra. Lucía Benítez',
    specialty: 'Endodoncista Avanzada y Microquirúrgica',
    status: 'EN CONSULTA',
    nextAvailable: '18:00h',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250&h=250'
  },
  {
    id: 'dra_ortiz',
    name: 'Dra. Carmen Ortiz',
    specialty: 'Especialista en Odontología Conservadora y Rehabilitación',
    status: 'DISPONIBLE',
    nextAvailable: '10:15h',
    image: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&q=80&w=250&h=250'
  },
  {
    id: 'dr_ortega',
    name: 'Dr. Francisco Ortega',
    specialty: 'Especialista en Estética Avanzada y Carillas Dentales',
    status: 'DISPONIBLE',
    nextAvailable: '12:00h',
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=250&h=250'
  },
  {
    id: 'dra_gomez',
    name: 'Dra. Isabel Gómez',
    specialty: 'Odontopediatra y Ortodoncia Infantil Especializada',
    status: 'DISPONIBLE',
    nextAvailable: '16:00h',
    image: 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&q=80&w=250&h=250'
  }
];

export const DEFAULT_MESSAGES = [
  {
    id: 'msg_1',
    type: 'inbox',
    sender: 'Miguel S.',
    time: 'Hace 5 min',
    timestamp: Date.now() - 5 * 60000,
    content: '¿Hola, me gustaría saber si aceptan seguros de Mapfre para un tratamiento de implantes que necesito?',
    status: 'unread'
  },
  {
    id: 'msg_2',
    type: 'review',
    sender: 'Sara Benítez',
    rating: 5,
    time: 'Hace 1 hora',
    timestamp: Date.now() - 60 * 60000,
    content: 'Increíble trato de todo el equipo. Me hice una ortodoncia y el resultado es de 10. Muy recomendable.',
    status: 'pending' // pending approval
  },
  {
    id: 'msg_3',
    type: 'alert',
    sender: 'Admin (Auto-Alerta)',
    time: 'Ayer',
    timestamp: Date.now() - 24 * 3600000,
    content: 'Stock de resina para moldes por debajo del 10%. Solicitar pedido a proveedor habitual.',
    status: 'unread'
  }
];

export const DEFAULT_APPOINTMENTS = [
  {
    id: 'appt_1',
    patientName: 'Beatriz Moreno',
    patientId: 'demo_beatriz',
    treatment: 'Limpieza Profunda & Profilaxis',
    treatmentId: 'limpieza',
    doctorName: 'Dra. Elena Martínez',
    doctorId: 'dra_martinez',
    date: new Date().toISOString().split('T')[0], // Today
    time: '09:00',
    status: 'room', // In waiting room / Sala
    timestamp: Date.now()
  },
  {
    id: 'appt_2',
    patientName: 'Julián Rivas',
    patientId: 'demo_julian',
    treatment: 'Revisión Post-Ortodoncia',
    treatmentId: 'invisalign',
    doctorName: 'Dr. Alejandro Sanz',
    doctorId: 'dr_sanz',
    date: new Date().toISOString().split('T')[0], // Today
    time: '10:00',
    status: 'confirmed',
    timestamp: Date.now() + 3600000
  },
  {
    id: 'appt_3',
    patientName: 'Marta Gil',
    patientId: 'demo_marta',
    treatment: 'Tratamiento Caries',
    treatmentId: 'limpieza',
    doctorName: 'Dra. Elena Martínez',
    doctorId: 'dra_martinez',
    date: new Date().toISOString().split('T')[0], // Today
    time: '08:15',
    status: 'completed',
    timestamp: Date.now() - 7200000
  },
  {
    id: 'appt_carlos',
    patientName: 'Carlos Méndez',
    patientId: 'demo_carlos',
    treatment: 'Ortodoncia Invisible',
    treatmentId: 'invisalign',
    doctorName: 'Dr. Alejandro Sanz',
    doctorId: 'dr_sanz',
    date: new Date(Date.now() + 4 * 24 * 3600000).toISOString().split('T')[0], // 4 days from now
    time: '16:30',
    status: 'confirmed',
    timestamp: Date.now() + 4 * 24 * 3600000
  }
];

// Seeding Default Data to make the app incredibly lively on first load
export async function seedDatabaseIfEmpty() {
  try {
    const treatmentsRef = collection(db, 'treatments');
    const treatmentsSnap = await getDocs(query(treatmentsRef, limit(1)));

    // Try seeding. If permissions block us, we catch it silently as a warning.
    for (const t of DEFAULT_TREATMENTS) {
      await setDoc(doc(db, 'treatments', t.id), t);
    }

    for (const d of DEFAULT_DOCTORS) {
      await setDoc(doc(db, 'doctors', d.id), d);
    }
    
    if (treatmentsSnap.empty) {
      console.log('Seeding initial messages and appointments in Firebase...');
      
      for (const m of DEFAULT_MESSAGES) {
        await setDoc(doc(db, 'messages', m.id), m);
      }

      for (const a of DEFAULT_APPOINTMENTS) {
        await setDoc(doc(db, 'appointments', a.id), a);
      }

      console.log('Firebase Firestore successfully seeded with clinical defaults.');
    }
  } catch (err: any) {
    // Treat as non-critical warning, because the app has local fallback systems
    console.warn('Note: Running in offline local backup mode (Firestore seeding restricted):', err.message);
  }
}
