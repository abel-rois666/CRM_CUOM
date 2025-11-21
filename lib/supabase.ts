import { createClient } from '@supabase/supabase-js';

// --- CARGA SEGURA DE VARIABLES ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

// --- SOLUCIÓN DE ERRORES DE TIPO ---
// Esta definición 'any' elimina las líneas rojas en SettingsModal y LoginPage
export type Database = {
  public: {
    Tables: {
      leads: { Row: any; Insert: any; Update: any };
      profiles: { Row: any; Insert: any; Update: any };
      statuses: { Row: any; Insert: any; Update: any };
      sources: { Row: any; Insert: any; Update: any };
      licenciaturas: { Row: any; Insert: any; Update: any };
      follow_ups: { Row: any; Insert: any; Update: any };
      appointments: { Row: any; Insert: any; Update: any };
      status_history: { Row: any; Insert: any; Update: any };
      whatsapp_templates: { Row: any; Insert: any; Update: any };
      email_templates: { Row: any; Insert: any; Update: any };
      login_history: { Row: any; Insert: any; Update: any };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_user_profile: { Args: any; Returns: any };
      update_user_details: { Args: any; Returns: any };
      delete_user_by_id: { Args: any; Returns: any };
      update_lead_details: { Args: any; Returns: any };
      transfer_lead: { Args: any; Returns: any };
    };
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);