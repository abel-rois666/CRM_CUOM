-- ==============================================================================
-- 🧹 SCRIPT DE LIMPIEZA Y OPTIMIZACIÓN (FIX WARNINGS)
-- ==============================================================================
-- Este script realiza 3 acciones:
-- 1. Elimina índices duplicados reportados.
-- 2. Elimina TODAS las políticas RLS existentes en las tablas afectadas (para quitar duplicados y versiones lentas).
-- 3. Reaplica las políticas optimizadas (usando `(select auth.uid())` y eliminando redundancias).

-- ------------------------------------------------------------------------------
-- 1. ELIMINAR ÍNDICES DUPLICADOS Y NO USADOS (Cleanup)
-- ------------------------------------------------------------------------------
-- Duplicados previos
DROP INDEX IF EXISTS idx_appointments_lead_id;
DROP INDEX IF EXISTS idx_follow_ups_lead_id;
DROP INDEX IF EXISTS idx_followups_lead;
DROP INDEX IF EXISTS idx_leads_advisor_id;
DROP INDEX IF EXISTS idx_leads_email_search;
DROP INDEX IF EXISTS idx_leads_search_email;
DROP INDEX IF EXISTS idx_leads_phone_clean;
DROP INDEX IF EXISTS idx_leads_phone_search;
DROP INDEX IF EXISTS idx_leads_search_phone;
DROP INDEX IF EXISTS idx_leads_program_id;
DROP INDEX IF EXISTS idx_leads_registration_date;
DROP INDEX IF EXISTS idx_leads_status_id;
DROP INDEX IF EXISTS idx_status_history_lead_id;

-- No usados (Reportados por Linter)
DROP INDEX IF EXISTS idx_leads_search_text;
DROP INDEX IF EXISTS idx_appointments_status_date;
DROP INDEX IF EXISTS idx_appointments_created_by;
DROP INDEX IF EXISTS idx_status_history_lead_date;
DROP INDEX IF EXISTS idx_leads_status_date;
DROP INDEX IF EXISTS idx_leads_email_lower;
DROP INDEX IF EXISTS idx_status_history_lead;
DROP INDEX IF EXISTS idx_leads_search_text_gin;
DROP INDEX IF EXISTS idx_leads_status_board;
DROP INDEX IF EXISTS idx_leads_advisor;
DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_leads_email;
DROP INDEX IF EXISTS idx_leads_phone;
DROP INDEX IF EXISTS idx_status_history_date;

-- ------------------------------------------------------------------------------
-- 1.1 CREAR ÍNDICES FALTANTES (Foreign Keys sin índice)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_follow_ups_created_by ON follow_ups(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_settings_updated_by ON organization_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_status_history_created_by ON status_history(created_by);
CREATE INDEX IF NOT EXISTS idx_status_history_new_status_id ON status_history(new_status_id);
CREATE INDEX IF NOT EXISTS idx_status_history_old_status_id ON status_history(old_status_id);

-- Nuevos reportados (Iteración 2)
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON appointments(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_status_id ON leads(status_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_status_history_lead_id ON status_history(lead_id);


-- ------------------------------------------------------------------------------
-- 2. LIMPIAR POLÍTICAS ANTIGUAS (Messy Policies)
-- Usamos un bloque anónimo para borrar todo y empezar de cero en estas tablas.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tables text[] := ARRAY[
        'leads', 'profiles', 'statuses', 'sources', 'licenciaturas', 
        'follow_ups', 'appointments', 'status_history', 'whatsapp_templates', 
        'email_templates', 'login_history', 'notifications', 'organization_settings', 
        'status_categories', 'system_settings'
    ];
    t text;
    pol record;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = t AND schemaname = 'public' LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
        END LOOP;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. RE-APLICAR POLÍTICAS OPTIMIZADAS
-- (Estas versiones usan `(select auth.uid())` para evitar el warning "auth_rls_initplan")
-- ------------------------------------------------------------------------------

-- Enable RLS (Ensure it's on)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenciaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_categories ENABLE ROW LEVEL SECURITY;

-- --- TABLA: profiles ---
CREATE POLICY "Staff can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id);

-- --- TABLA: leads ---
CREATE POLICY "Staff full access leads" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --- TABLA: follow_ups ---
CREATE POLICY "Staff full access follow_ups" ON follow_ups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --- TABLA: appointments ---
CREATE POLICY "Staff full access appointments" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --- TABLA: status_history ---
CREATE POLICY "Staff full access status_history" ON status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --- TABLA: Catálogos (statuses, sources, etc) ---
CREATE POLICY "Staff full access statuses" ON statuses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff full access sources" ON sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff full access licenciaturas" ON licenciaturas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff full access status_categories" ON status_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --- TABLA: Templates ---
CREATE POLICY "Staff full access whatsapp_templates" ON whatsapp_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff full access email_templates" ON email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --- TABLA: organization_settings ---
-- Consolidated policy to avoid 'Multiple Permissive Policies' warning
CREATE POLICY "Staff full access organization_settings" ON organization_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- --- TABLA: notifications ---
CREATE POLICY "Users access own notifications" ON notifications FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- --- TABLA: login_history ---
CREATE POLICY "Users view own history" ON login_history FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users insert login_history" ON login_history FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- --- TABLA: system_settings ---
-- Fix for 'RLS Enabled No Policy': Allow staff to manage system settings
CREATE POLICY "Staff full access system_settings" ON system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. SEGURIDAD: Fijar search_path en Funciones (Security Hardening)
-- Evita hijacking de funciones por esquemas maliciosos.
-- ------------------------------------------------------------------------------
ALTER FUNCTION notify_lead_assignment SET search_path = public;
ALTER FUNCTION get_quick_filter_leads SET search_path = public;
ALTER FUNCTION check_pending_alerts SET search_path = public;
ALTER FUNCTION transfer_lead SET search_path = public;
ALTER FUNCTION update_updated_at_column SET search_path = public;
ALTER FUNCTION check_duplicate_lead SET search_path = public;
ALTER FUNCTION get_dashboard_metrics SET search_path = public;
ALTER FUNCTION is_admin_or_mod SET search_path = public;
ALTER FUNCTION is_role SET search_path = public;
ALTER FUNCTION generate_search_text SET search_path = public;
ALTER FUNCTION handle_new_user SET search_path = public;
ALTER FUNCTION get_my_role SET search_path = public;
ALTER FUNCTION create_user_profile SET search_path = public;
ALTER FUNCTION update_user_details SET search_path = public;
ALTER FUNCTION delete_user_by_id SET search_path = public;
ALTER FUNCTION update_lead_details SET search_path = public;

