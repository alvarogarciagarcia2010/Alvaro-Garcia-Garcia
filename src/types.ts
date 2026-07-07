export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  premium?: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  treatment: string;
  treatmentId: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'room';
  notes?: string;
  timestamp: number;
}

export interface Treatment {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number; // in minutes
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  status: 'DISPONIBLE' | 'EN CONSULTA' | 'AUSENTE';
  nextAvailable: string;
  image: string;
}

export interface InboxMessage {
  id: string;
  type: 'inbox' | 'review' | 'alert';
  sender: string;
  time: string;
  timestamp: number;
  content: string;
  status: 'unread' | 'read' | 'approved' | 'rejected' | 'pending';
  rating?: number;
}

export interface AlertNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  read: boolean;
}
