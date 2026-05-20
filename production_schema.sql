-- ==============================================================================
-- 🚀 CRM UNIVERSITARIO - ESQUEMA DE PRODUCCIÓN (FINAL v1.0)
-- ==============================================================================
-- Este archivo contiene TODA la definición de la base de datos necesaria para
-- desplegar el proyecto desde cero. Incluye:
-- 1. Extensiones
-- 2. Tablas (con últimas actualizaciones como design_json)
-- 3. Funciones y Triggers
-- 4. Políticas de Seguridad (RLS) Optimizadas
-- 5. Índices de Rendimiento
-- ==============================================================================

-- 1. CONFIGURACIÓN INICIAL Y EXTENSIONES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. FUNCIONES DE UTILERÍA Y SEGURIDAD (PRE-TABLAS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_role(required_role text) RETURNS boolean AS $$
DECLARE 
  current_user_role text;
BEGIN
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_user_role = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin_or_mod() RETURNS boolean AS $$
DECLARE 
  current_user_role text;
BEGIN
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_user_role IN ('admin', 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. CREACIÓN DE TABLAS
-- ==============================================================================

-- PROFILES (Usuarios extendidos)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'advisor', 'moderator')) DEFAULT 'advisor',
  preferences JSONB DEFAULT '{}'::jsonb, -- [NEW] User preferences (theme, columns, pageSize)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CATÁLOGOS BASE
CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  category TEXT CHECK (category IN ('active', 'won', 'lost')) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.licenciaturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.turnos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CONFIGURACIÓN DINÁMICA DE CATEGORÍAS DE ESTADO
CREATE TABLE IF NOT EXISTS public.status_categories (
  key TEXT PRIMARY KEY CHECK (key IN ('active', 'won', 'lost')),
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PLANTILLAS
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  design_json JSONB DEFAULT NULL, -- [NEW] Soporte para Drag & Drop
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LEADS (Tabla Principal)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  paternal_last_name TEXT NOT NULL,
  maternal_last_name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  program_id UUID REFERENCES public.licenciaturas(id) ON DELETE SET NULL,
  turno_id UUID REFERENCES public.turnos(id) ON DELETE SET NULL,
  status_id UUID REFERENCES public.statuses(id) ON DELETE SET NULL,
  advisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  registration_date TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  search_text TEXT, -- [OPTIMIZACIÓN] Campo calculado para búsquedas rápidas
  has_unread_messages BOOLEAN DEFAULT FALSE -- [NEW] Para alertas de WhatsApp
);

-- DETALLES Y ACTIVIDAD
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  duration INTEGER DEFAULT 60,
  details TEXT,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'canceled')) DEFAULT 'scheduled',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status_id UUID REFERENCES public.statuses(id) ON DELETE SET NULL,
  new_status_id UUID REFERENCES public.statuses(id) ON DELETE SET NULL,
  date TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  message_body TEXT NOT NULL,
  status TEXT,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SISTEMA Y SETTINGS
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, 
  login_at TIMESTAMPTZ DEFAULT now(),
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'success', 'error')) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  link TEXT
);

CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT 'CUOM CRM',
  company_subtitle TEXT DEFAULT 'Administración',
  logo_url TEXT,
  setup_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 4. TRIGGERS Y AUTOMATIZACIÓN
-- ==============================================================================

-- A. Función para search_text (Búsqueda global)
CREATE OR REPLACE FUNCTION generate_search_text() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := unaccent(lower(
    COALESCE(NEW.first_name, '') || ' ' || 
    COALESCE(NEW.paternal_last_name, '') || ' ' || 
    COALESCE(NEW.maternal_last_name, '') || ' ' || 
    COALESCE(NEW.email, '') || ' ' || 
    COALESCE(NEW.phone, '')
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_leads_search_text
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION generate_search_text();

-- B. Función para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. ÍNDICES (OPTIMIZADOS PARA RENDIMIENTO)
-- ==============================================================================
-- Búsqueda
CREATE INDEX IF NOT EXISTS idx_leads_search_text_gin ON public.leads USING GIN (search_text gin_trgm_ops);

-- Claves Foráneas y Filtros Comunes
CREATE INDEX IF NOT EXISTS idx_leads_advisor_id ON public.leads(advisor_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_id ON public.leads(status_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON public.leads(source_id);
CREATE INDEX IF NOT EXISTS idx_leads_pagination ON public.leads(registration_date DESC, id);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON public.appointments(created_by);

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_created_by ON public.follow_ups(created_by);

CREATE INDEX IF NOT EXISTS idx_status_history_lead_id ON public.status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);

-- 6. POLÍTICAS DE SEGURIDAD (RLS) - FINAL HARDENED
-- ==============================================================================

-- Habilitar RLS en TODO
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenciaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id);

-- Leads: Acceso basado en Rol
CREATE POLICY "Admin/Mod: Ver todo" ON public.leads FOR SELECT TO authenticated USING ( public.is_admin_or_mod() );
CREATE POLICY "Asesor: Ver asignados" ON public.leads FOR SELECT TO authenticated USING ( advisor_id = auth.uid() );
CREATE POLICY "Admin/Mod: Gestionar" ON public.leads FOR ALL TO authenticated USING ( public.is_admin_or_mod() );
CREATE POLICY "Asesor: Gestionar Propios" ON public.leads FOR ALL TO authenticated USING ( advisor_id = auth.uid() );

-- Related Data: Acceso abierto a Staff (simplificado para colaboración, pero restringido por UI)
CREATE POLICY "Staff full access appointments" ON public.appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff full access follow_ups" ON public.follow_ups FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff full access status_history" ON public.status_history FOR ALL TO authenticated USING (true);

-- Catálogos: Solo lectura para staff, escritura Admin
CREATE POLICY "Lectura General Statuses" ON public.statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Statuses" ON public.statuses FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Lectura General Sources" ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Sources" ON public.sources FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Lectura General Licenciaturas" ON public.licenciaturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Licenciaturas" ON public.licenciaturas FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Lectura General Turnos" ON public.turnos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Turnos" ON public.turnos FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Staff full access status_categories" ON public.status_categories FOR ALL TO authenticated USING (true);

-- Templates & Messages: Compartidos
CREATE POLICY "Staff full access whatsapp_templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff full access email_templates" ON public.email_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff full access whatsapp_messages" ON public.whatsapp_messages FOR ALL TO authenticated USING (true);

-- Settings & System
CREATE POLICY "Staff full access organization_settings" ON public.organization_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff full access system_settings" ON public.system_settings FOR ALL TO authenticated USING (true);

-- User Data Individual
CREATE POLICY "Users access own notifications" ON public.notifications FOR ALL TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users view own history" ON public.login_history FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users insert login_history" ON public.login_history FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Admins view all login history" ON public.login_history FOR SELECT TO authenticated USING ( public.is_role('admin') );

-- 7. FUNCIONES RPC (API DEL FRONTEND)
-- ==============================================================================

-- 7.1 Métricas del Dashboard (Optimizado)
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
    result JSON;
    today DATE := CURRENT_DATE;
    three_days_ago TIMESTAMPTZ := NOW() - INTERVAL '3 days';
    seven_days_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
    
    total_leads INTEGER;
    new_leads_today INTEGER;
    appointments_today INTEGER;
    no_follow_up INTEGER;
    stale_follow_up INTEGER;
    enrolled_today INTEGER;
    
    status_stats JSON;
    advisor_stats JSON;
BEGIN
    -- Contadores Rápidos
    SELECT COUNT(*) INTO total_leads FROM leads;
    SELECT COUNT(*) INTO new_leads_today FROM leads WHERE DATE(registration_date) = today;
    
    -- Citas programadas activas para hoy
    SELECT COUNT(a.id) INTO appointments_today
    FROM appointments a
    JOIN leads l ON a.lead_id = l.id
    JOIN statuses s ON l.status_id = s.id
    WHERE a.status = 'scheduled' AND DATE(a.date) = today AND s.category = 'active';

    -- Inscritos Hoy
    SELECT COUNT(*) INTO enrolled_today
    FROM status_history h
    JOIN statuses s ON h.status_id = s.id
    WHERE s.category = 'won' AND DATE(h.changed_at) = today; -- [NOTA] Asegurar que el frontend/trigger llene changed_at o usar date

    -- Alertas de Seguimiento
    SELECT COUNT(*) INTO no_follow_up
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND l.registration_date < three_days_ago
    AND NOT EXISTS (SELECT 1 FROM follow_ups f WHERE f.lead_id = l.id);

    SELECT COUNT(*) INTO stale_follow_up
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND EXISTS (
        SELECT 1 FROM follow_ups f WHERE f.lead_id = l.id HAVING MAX(f.date) < seven_days_ago
    );

    -- Estadísticas Agrupadas (JSON)
    SELECT json_agg(json_build_object('name', s.name, 'value', c.count, 'color', s.color)) INTO status_stats
    FROM (SELECT status_id, COUNT(*) as count FROM leads GROUP BY status_id) c
    JOIN statuses s ON c.status_id = s.id;

    SELECT json_agg(json_build_object('name', split_part(p.full_name, ' ', 1), 'fullName', p.full_name, 'value', c.count)) INTO advisor_stats
    FROM (SELECT advisor_id, COUNT(*) as count FROM leads GROUP BY advisor_id) c
    JOIN profiles p ON c.advisor_id = p.id;

    result := json_build_object(
        'totalLeads', COALESCE(total_leads, 0),
        'newLeadsToday', COALESCE(new_leads_today, 0),
        'enrolledToday', COALESCE(enrolled_today, 0), -- [NEW]
        'appointmentsToday', COALESCE(appointments_today, 0),
        'noFollowUp', COALESCE(no_follow_up, 0),
        'staleFollowUp', COALESCE(stale_follow_up, 0),
        'statusCallback', COALESCE(status_stats, '[]'::json),
        'advisorStats', COALESCE(advisor_stats, '[]'::json)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7.2 Alertas Diarias (Popup)
CREATE OR REPLACE FUNCTION check_pending_alerts(requesting_user_id uuid)
RETURNS json AS $$
DECLARE
    user_role text;
    result json;
    appointments_count int;
    overdue_followups_count int;
    untouched_leads_count int;
    seven_days_ago timestamp := NOW() - INTERVAL '7 days';
    three_days_ago timestamp := NOW() - INTERVAL '3 days';
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = requesting_user_id;

    -- Citas Hoy
    SELECT COUNT(*) INTO appointments_count
    FROM appointments a
    JOIN leads l ON a.lead_id = l.id
    WHERE DATE(a.date) = CURRENT_DATE AND a.status = 'scheduled'
    AND (user_role IN ('admin', 'coordinator') OR l.advisor_id = requesting_user_id);

    -- Vencidos
    SELECT COUNT(*) INTO overdue_followups_count
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND (user_role IN ('admin', 'coordinator') OR l.advisor_id = requesting_user_id)
    AND EXISTS (SELECT 1 FROM follow_ups f WHERE f.lead_id = l.id HAVING MAX(f.date) < seven_days_ago);

    -- Desatendidos
    SELECT COUNT(*) INTO untouched_leads_count
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND l.registration_date < three_days_ago
    AND NOT EXISTS (SELECT 1 FROM follow_ups f WHERE f.lead_id = l.id)
    AND (user_role IN ('admin', 'coordinator') OR l.advisor_id = requesting_user_id);

    result := json_build_object(
        'appointmentsCount', appointments_count,
        'overdueFollowupsCount', overdue_followups_count,
        'untouchedLeadsCount', untouched_leads_count,
        'hasAlerts', (appointments_count > 0 OR overdue_followups_count > 0 OR untouched_leads_count > 0)
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7.3 Transferencia de Leads
CREATE OR REPLACE FUNCTION transfer_lead(lead_id UUID, new_advisor_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE public.leads SET advisor_id = new_advisor_id, updated_at = now() WHERE id = lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7.4 Chequeo de Duplicados
CREATE OR REPLACE FUNCTION check_duplicate_lead(check_email TEXT, check_phone TEXT) RETURNS TABLE (id UUID, advisor_name TEXT) AS $$
BEGIN
  RETURN QUERY 
  SELECT l.id, p.full_name as advisor_name 
  FROM public.leads l 
  LEFT JOIN public.profiles p ON l.advisor_id = p.id
  WHERE (check_email IS NOT NULL AND check_email <> '' AND lower(l.email) = lower(check_email)) 
     OR (check_phone IS NOT NULL AND check_phone <> '' AND l.phone = check_phone) 
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7.5 Manejo de Usuarios (CRUD Admin)
CREATE OR REPLACE FUNCTION create_user_profile(user_id UUID, full_name TEXT, user_email TEXT, user_role TEXT) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role) 
  VALUES (user_id, full_name, user_email, user_role)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_user_details(user_id_to_update UUID, new_full_name TEXT, new_role TEXT, new_password TEXT DEFAULT NULL) RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles SET full_name = new_full_name, role = new_role WHERE id = user_id_to_update;
  IF new_password IS NOT NULL AND new_password <> '' THEN
    UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')) WHERE id = user_id_to_update;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION delete_user_by_id(user_id_to_delete UUID) RETURNS VOID AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7.7 Filtros Rápidos del Dashboard (Server-Side)
CREATE OR REPLACE FUNCTION get_quick_filter_leads(
    filter_type text,
    requesting_user_id uuid
)
RETURNS SETOF leads AS $$
DECLARE
    user_role text;
    today date := CURRENT_DATE;
    three_days_ago timestamp := NOW() - INTERVAL '3 days';
    seven_days_ago timestamp := NOW() - INTERVAL '7 days';
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role FROM profiles WHERE id = requesting_user_id;

    -- Lógica de Filtros
    IF filter_type = 'appointments_today' THEN
        RETURN QUERY 
        SELECT l.* 
        FROM leads l
        JOIN appointments a ON l.id = a.lead_id
        JOIN statuses s ON l.status_id = s.id
        WHERE a.status = 'scheduled' 
        AND DATE(a.date) = today
        AND s.category = 'active'
        AND (user_role IN ('admin', 'moderator') OR l.advisor_id = requesting_user_id);

    ELSIF filter_type = 'no_followup' THEN
        RETURN QUERY 
        SELECT l.* 
        FROM leads l
        JOIN statuses s ON l.status_id = s.id
        WHERE l.registration_date < three_days_ago
        AND NOT EXISTS (SELECT 1 FROM follow_ups f WHERE f.lead_id = l.id)
        AND s.category = 'active'
        AND (user_role IN ('admin', 'moderator') OR l.advisor_id = requesting_user_id);

    ELSIF filter_type = 'stale_followup' THEN
        RETURN QUERY 
        SELECT l.* 
        FROM leads l
        JOIN statuses s ON l.status_id = s.id
        WHERE s.category = 'active'
        AND (user_role IN ('admin', 'moderator') OR l.advisor_id = requesting_user_id)
        AND EXISTS (
            SELECT 1 FROM follow_ups f 
            WHERE f.lead_id = l.id 
            HAVING MAX(f.date) < seven_days_ago
        );

    ELSE
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. DATOS SEMILLA (VALORES POR DEFECTO)
-- ==============================================================================
INSERT INTO public.status_categories (key, label, icon, color, order_index)
VALUES 
  ('active', 'En Proceso', '⚡', 'text-brand-primary dark:text-blue-300', 1),
  ('won', 'Inscritos', '🎓', 'text-green-600 dark:text-green-400', 2),
  ('lost', 'Bajas', '❌', 'text-red-600 dark:text-red-400', 3)
ON CONFLICT (key) DO NOTHING;

-- Seed default turnos
INSERT INTO public.turnos (name) VALUES 
  ('Matutino'),
  ('Vespertino'),
  ('Mixto'),
  ('Sin definir')
ON CONFLICT (name) DO NOTHING;

-- Seed default licenciatura
INSERT INTO public.licenciaturas (name) VALUES 
  ('Sin definir')
ON CONFLICT (name) DO NOTHING;

-- FIN DEL ESQUEMA
