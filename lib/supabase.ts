import { createClient } from '@supabase/supabase-js';
import { Lead, Profile, Status, Source, Appointment, FollowUp, Licenciatura, StatusChange, WhatsAppTemplate, EmailTemplate, LoginHistory } from '../types';

// --- SEGURIDAD MEJORADA ---
// Las credenciales ahora se cargan desde el archivo .env para no exponerlas en el código.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación: Si no encuentra las variables, detiene la app y avisa el error.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'CRITICAL ERROR: Faltan las variables de entorno. Asegúrate de tener un archivo .env en la raíz con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY definidas.'
  );
}

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
      whatsapp_templates: {
        Row: WhatsAppTemplate;
        Insert: Omit<WhatsAppTemplate, 'id'>;
        Update: Partial<Omit<WhatsAppTemplate, 'id'>>;
      };
      email_templates: {
        Row: EmailTemplate;
        Insert: Omit<EmailTemplate, 'id'>;
        Update: Partial<Omit<EmailTemplate, 'id'>>;
      };
      login_history: {
        Row: LoginHistory;
        Insert: Omit<LoginHistory, 'id' | 'login_at'>;
        Update: Partial<Omit<LoginHistory, 'id' | 'login_at'>>;
      }
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_user_profile: {
        Args: {
          user_id: string;
          full_name: string;
          user_email: string;
          user_role: string;
        };
        Returns: undefined;
      };
      update_user_details: {
        Args: {
          user_id_to_update: string;
          new_full_name: string;
          new_role: string;
          new_password?: string;
        };
        Returns: undefined;
      };
      delete_user_by_id: {
        Args: {
          user_id_to_delete: string;
        };
        Returns: undefined;
      };
      update_lead_details: {
        Args: {
          lead_id_to_update: string;
          new_advisor_id: string;
          new_status_id: string;
        };
        Returns: Database['public']['Tables']['leads']['Row'];
      };
      transfer_lead: {
        Args: {
          lead_id: string;
          new_advisor_id: string;
        };
        Returns: undefined;
      };
    };
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);