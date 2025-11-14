
export interface FollowUp {
  id: string;
  date: string; // ISO string format
  notes: string;
  lead_id: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string; // ISO string for date and time
  duration: number; // in minutes
  details: string;
  status: 'scheduled' | 'completed' | 'canceled';
  lead_id: string;
}

export interface Licenciatura {
  id: string;
  name: string;
}

export interface StatusChange {
  id: string;
  old_status_id: string | null;
  new_status_id: string;
  date: string; // ISO string
  lead_id: string;
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
  advisor_id: string; // Corresponds to a user's UUID in auth.users
  source_id: string;
  registration_date: string; // ISO string format
  follow_ups?: FollowUp[];
  appointments?: Appointment[];
  status_history?: StatusChange[];
}

// Replaces Advisor
export interface Profile {
  id:string; // This is the user's UUID from auth.users
  full_name: string;
  email: string;
  role: 'admin' | 'advisor';
}

export interface Status {
  id: string;
  name: string;
  color: string; // e.g., 'bg-blue-500'
}

export interface Source {
  id: string;
  name: string;
}
