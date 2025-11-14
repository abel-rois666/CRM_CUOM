
import { createClient } from '@supabase/supabase-js';
import { Lead, Profile, Status, Source, Appointment, FollowUp, Licenciatura, StatusChange } from '../types';

// --- ¡ACCIÓN REQUERIDA! ---
// Pega tus credenciales de Supabase aquí.
// ¡MUY IMPORTANTE! Asegúrate de que no haya espacios extra al principio o al final.
// La URL debe empezar con "https" y la clave debe ser el texto largo (JWT).
const supabaseUrl = 'https://ltbejwoffguhrntmkskd.supabase.co'; // Reemplaza esto con tu URL real
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0YmVqd29mZmd1aHJudG1rc2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzYzMTYsImV4cCI6MjA3ODcxMjMxNn0.pqa5k19Hmfq0VnshRMwrs-tKiylezFqVLITkZhq1XNY'; // Reemplaza esto con tu clave anónima real

// --- No modifiques el código debajo de esta línea ---

// Define the database schema for type safety
export type Database = {
  public: {
    Tables: {
      leads: {
        Row: Omit<Lead, 'follow_ups' | 'appointments' | 'status_history'>;
        Insert: Omit<Lead, 'id' | 'follow_ups' | 'appointments' | 'status_history'>;
        Update: Partial<Omit<Lead, 'id' | 'follow_ups' | 'appointments' | 'status_history'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Profile;
        Update: Partial<Profile>;
      };
      statuses: {
        Row: Status;
        Insert: Omit<Status, 'id'>;
        Update: Partial<Omit<Status, 'id'>>;
      };
      sources: {
        Row: Source;
        Insert: Omit<Source, 'id'>;
        Update: Partial<Omit<Source, 'id'>>;
      };
      licenciaturas: {
        Row: Licenciatura;
        Insert: Omit<Licenciatura, 'id'>;
        Update: Partial<Omit<Licenciatura, 'id'>>;
      };
      follow_ups: {
        Row: FollowUp;
        Insert: Omit<FollowUp, 'id'>;
        Update: Partial<Omit<FollowUp, 'id'>>;
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, 'id'>;
        Update: Partial<Omit<Appointment, 'id'>>;
      };
      status_history: {
        Row: StatusChange;
        Insert: Omit<StatusChange, 'id'>;
        Update: Partial<Omit<StatusChange, 'id'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
};

if (!supabaseUrl || supabaseUrl === 'URL_DEL_PROYECTO_AQUI') {
    throw new Error('La URL de Supabase no está configurada en lib/supabase.ts. Por favor, reemplaza el valor de marcador de posición.');
}

if (!supabaseAnonKey || supabaseAnonKey === 'ANON_KEY_PUBLICA_AQUI') {
    throw new Error('La Anon Key de Supabase no está configurada en lib/supabase.ts. Por favor, reemplaza el valor de marcador de posición.');
}


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
