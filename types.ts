
export interface FollowUp {
  id: string;
  date: string; // ISO string format
  notes: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string; // ISO string for date and time
  duration: number; // in minutes
  details: string;
  status: 'scheduled' | 'completed' | 'canceled';
}

export interface Licenciatura {
  id: string;
  name: string;
}

export interface StatusChange {
  id: string;
  oldStatusId: string | null;
  newStatusId: string;
  date: string; // ISO string
}

export interface Lead {
  id: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  email?: string;
  phone: string;
  programId: string;
  statusId: string;
  advisorId: string;
  sourceId: string;
  registrationDate: string; // ISO string format
  followUps: FollowUp[];
  appointments: Appointment[];
  statusHistory: StatusChange[];
}

export interface Advisor {
  id:string;
  name: string;
  email: string;
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