export interface FollowUp {
  id: string;
  date: string;
  notes: string;
  lead_id: string;
  created_by?: Profile;
  created_at?: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  duration: number;
  details: string;
  status: 'scheduled' | 'completed' | 'canceled';
  lead_id: string;
  created_at: string;
  updated_at: string;
  created_by?: Profile;
}

export interface StatusChange {
  id: string;
  old_status_id: string | null;
  new_status_id: string;
  date: string;
  lead_id: string;
  created_by?: Profile;
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


export interface Profile {
  id: string; 
  full_name: string;
  email: string;
  role: 'admin' | 'advisor' | 'moderator'; 
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

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
  link?: string;
}