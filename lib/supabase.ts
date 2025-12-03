import { createClient } from '@supabase/supabase-js';

// --- CARGA SEGURA DE VARIABLES ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

// Definición estricta basada en tu esquema SQL
export type Database = {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          first_name: string;
          paternal_last_name: string;
          maternal_last_name: string | null;
          email: string | null;
          phone: string;
          program_id: string;
          status_id: string;
          advisor_id: string;
          source_id: string;
          registration_date: string;
        };
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'registration_date'>;
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'advisor' | 'moderator';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'advisor' | 'moderator';
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      statuses: {
        Row: {
          id: string;
          name: string;
          color: string;
          category: 'active' | 'won' | 'lost';
        };
        Insert: Omit<Database['public']['Tables']['statuses']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['statuses']['Insert']>;
      };
      // Tipos genéricos para las demás tablas para evitar errores de compilación
      // pero manteniendo la estructura lista para tipar en el futuro si es necesario
      sources: { Row: any; Insert: any; Update: any };
      licenciaturas: { Row: any; Insert: any; Update: any };
      follow_ups: { Row: any; Insert: any; Update: any };
      appointments: { Row: any; Insert: any; Update: any };
      status_history: { Row: any; Insert: any; Update: any };
      whatsapp_templates: { Row: any; Insert: any; Update: any };
      email_templates: { Row: any; Insert: any; Update: any };
      login_history: { Row: any; Insert: any; Update: any };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_user_profile: {
        Args: { user_id: string; full_name: string; user_email: string; user_role: string };
        Returns: void;
      };
      update_user_details: {
        Args: { user_id_to_update: string; new_full_name: string; new_role: string; new_password?: string };
        Returns: void;
      };
      delete_user_by_id: {
        Args: { user_id_to_delete: string };
        Returns: void;
      };
      transfer_lead: {
        Args: { lead_id: string; new_advisor_id: string };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);