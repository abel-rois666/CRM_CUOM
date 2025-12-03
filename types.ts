export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'advisor';
}
export interface FollowUp {
  id: string;
  date: string; // Fecha de contacto seleccionada por el usuario
  notes: string;
  lead_id: string;
  created_by?: Profile;
  created_at?: string; // Fecha real de registro en sistema
}

export interface Appointment {
  id: string;
  title: string;
  date: string; // Fecha programada de la cita
  duration: number;
  details: string;
  status: 'scheduled' | 'completed' | 'canceled';
  lead_id: string;
  created_at: string; // Cuándo se creó
  updated_at: string; // Cuándo se editó
  created_by?: Profile; // Quién la creó/editó
}

export interface StatusChange {
  id: string;
  old_status_id: string | null;
  new_status_id: string;
  date: string;
  lead_id: string;
  created_by?: Profile; // Quién cambió el estado
}

export interface Licenciatura {
  id: string;
  name: string;
}

export interface Lead {
  id: string;
  first_name: string;
  paternal_last_name: string;
  maternal_last_name?: string;
  email?: string;
  phone: string;
  program_id: string;
  status_id: string;
  advisor_id: string;
  source_id: string;
  registration_date: string;
  follow_ups?: FollowUp[];
  appointments?: Appointment[];
  status_history?: StatusChange[];
}

export type StatusCategory = 'active' | 'won' | 'lost';

export interface Status {
  id: string;
  name: string;
  color: string;
  category: StatusCategory;
}

export interface Source {
  id: string;
  name: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export interface LoginHistory {
  id: string;
  user_id: string;
  login_at: string;
  user_agent: string | null;
}