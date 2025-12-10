import { createClient } from '@supabase/supabase-js';

// --- CARGA SEGURA DE VARIABLES ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          first_name: string
          paternal_last_name: string
          maternal_last_name: string | null
          email: string | null
          phone: string
          program_id: string
          status_id: string
          advisor_id: string
          source_id: string
          registration_date: string
          updated_at: string
          search_text: string | null
        }
        Insert: {
          id?: string
          first_name: string
          paternal_last_name: string
          maternal_last_name?: string | null
          email?: string | null
          phone: string
          program_id: string
          status_id: string
          advisor_id: string
          source_id: string
          registration_date?: string
          updated_at?: string
          search_text?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          paternal_last_name?: string
          maternal_last_name?: string | null
          email?: string | null
          phone?: string
          program_id?: string
          status_id?: string
          advisor_id?: string
          source_id?: string
          registration_date?: string
          updated_at?: string
          search_text?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'advisor' | 'moderator'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'advisor' | 'moderator'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'advisor' | 'moderator'
          created_at?: string
        }
      }
      statuses: {
        Row: {
          id: string
          name: string
          color: string
          category: 'active' | 'won' | 'lost'
        }
        Insert: {
          id?: string
          name: string
          color: string
          category?: 'active' | 'won' | 'lost'
        }
        Update: {
          id?: string
          name?: string
          color?: string
          category?: 'active' | 'won' | 'lost'
        }
      }
      sources: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: { id?: string; name?: string }
      }
      licenciaturas: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: { id?: string; name?: string }
      }
      follow_ups: {
        Row: {
          id: string
          lead_id: string
          date: string
          notes: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          date: string
          notes: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          date?: string
          notes?: string
          created_by?: string | null
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          lead_id: string
          title: string
          date: string
          duration: number
          details: string | null
          status: 'scheduled' | 'completed' | 'canceled'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          title: string
          date: string
          duration?: number
          details?: string | null
          status?: 'scheduled' | 'completed' | 'canceled'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          title?: string
          date?: string
          duration?: number
          details?: string | null
          status?: 'scheduled' | 'completed' | 'canceled'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      status_history: {
        Row: {
          id: string
          lead_id: string
          old_status_id: string | null
          new_status_id: string
          date: string
          created_by: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          old_status_id?: string | null
          new_status_id: string
          date?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          old_status_id?: string | null
          new_status_id?: string
          date?: string
          created_by?: string | null
        }
      }
      whatsapp_templates: {
        Row: { id: string; name: string; content: string; created_at: string }
        Insert: { id?: string; name: string; content: string; created_at?: string }
        Update: { id?: string; name?: string; content?: string; created_at?: string }
      }
      email_templates: {
        Row: { id: string; name: string; subject: string; body: string; created_at: string }
        Insert: { id?: string; name: string; subject: string; body: string; created_at?: string }
        Update: { id?: string; name?: string; subject?: string; body?: string; created_at?: string }
      }
      login_history: {
        Row: { id: string; user_id: string; login_at: string; user_agent: string | null }
        Insert: { id?: string; user_id: string; login_at?: string; user_agent?: string | null }
        Update: { id?: string; user_id?: string; login_at?: string; user_agent?: string | null }
      }
      // ESTA ES LA TABLA QUE FALTABA Y CAUSABA EL ERROR 'NEVER'
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'warning' | 'success' | 'error'
          is_read: boolean
          created_at: string
          link: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: 'info' | 'warning' | 'success' | 'error'
          is_read?: boolean
          created_at?: string
          link?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'warning' | 'success' | 'error'
          is_read?: boolean
          created_at?: string
          link?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_user_profile: {
        Args: { user_id: string; full_name: string; user_email: string; user_role: string }
        Returns: void
      }
      update_user_details: {
        Args: { user_id_to_update: string; new_full_name: string; new_role: string; new_password?: string }
        Returns: void
      }
      delete_user_by_id: {
        Args: { user_id_to_delete: string }
        Returns: void
      }
      transfer_lead: {
        Args: { lead_id: string; new_advisor_id: string }
        Returns: void
      }
      check_duplicate_lead: {
        Args: { check_email: string | null; check_phone: string | null }
        Returns: { id: string; advisor_name: string }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);