// types.ts

// --- Perfil de Usuario ---
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'advisor' | 'moderator';
}

// --- Catálogos ---
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

export interface Licenciatura {
  id: string;
  name: string;
}

// --- Actividades y Sub-Entidades ---
export interface FollowUp {
  id: string;
  date: string; // ISO String
  notes: string;
  lead_id: string;
  created_by?: Profile | null; // Puede ser null si el usuario se borró
  created_at?: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string; // ISO String
  duration: number;
  details: string;
  status: 'scheduled' | 'completed' | 'canceled';
  lead_id: string;
  created_at: string;
  updated_at: string;
  created_by?: Profile | null;
}

export interface StatusChange {
  id: string;
  old_status_id: string | null;
  new_status_id: string;
  date: string;
  lead_id: string;
  created_by?: Profile | null;
}

// --- Entidad Principal: Lead ---
export interface Lead {
  id: string;
  first_name: string;
  paternal_last_name: string;
  maternal_last_name?: string | null;
  email?: string | null;
  phone: string;
  program_id: string; // UUID
  status_id: string; // UUID
  advisor_id: string; // UUID
  source_id: string; // UUID
  registration_date: string; // ISO String
  updated_at?: string;

  // Relaciones (Opcionales porque dependen del query)
  follow_ups?: FollowUp[];
  appointments?: Appointment[];
  status_history?: StatusChange[];
}

// --- Plantillas ---
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

// --- Sistema ---
export interface LoginHistory {
  id: string;
  user_id: string;
  login_at: string;
  user_agent: string | null;
  profiles?: Profile; // Para joins
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

export type QuickFilterType = 'appointments_today' | 'no_followup' | 'stale_followup' | null;

export interface DashboardMetrics {
  totalLeads: number;
  newLeadsToday: number;
  enrolledToday: number; // Added
  appointmentsToday: number;
  noFollowUp: number;
  staleFollowUp: number;
  statusCallback: { name: string; value: number; color: string }[];
  advisorStats: { name: string; value: number; fullName: string }[];
}

export interface AlertsSummary {
  appointmentsCount: number;
  overdueFollowupsCount: number;
  untouchedLeadsCount: number;
  hasAlerts: boolean;
}