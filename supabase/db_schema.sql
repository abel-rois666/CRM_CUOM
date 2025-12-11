-- ==============================================================================
-- 🎓 CRM UNIVERSITARIO - ESQUEMA MAESTRO (VERSIÓN CORREGIDA Y ROBUSTA)
-- ==============================================================================

-- 1. CONFIGURACIÓN INICIAL Y EXTENSIONES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. FUNCIONES DE UTILERÍA Y SEGURIDAD
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_role(required_role text) RETURNS boolean AS $$
DECLARE 
  current_user_role text;
BEGIN
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_user_role = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_mod() RETURNS boolean AS $$
DECLARE 
  current_user_role text;
BEGIN
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_user_role IN ('admin', 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREACIÓN DE TABLAS (SI NO EXISTEN)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'advisor', 'moderator')) DEFAULT 'advisor',
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  paternal_last_name TEXT NOT NULL,
  maternal_last_name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  program_id UUID REFERENCES public.licenciaturas(id) ON DELETE SET NULL,
  status_id UUID REFERENCES public.statuses(id) ON DELETE SET NULL,
  advisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  registration_date TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  search_text TEXT
);

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
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Policies for organization_settings
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read Org Settings" ON public.organization_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Update Org Settings" ON public.organization_settings FOR ALL TO authenticated USING ( public.is_role('admin') );

-- 4. TRIGGERS Y AUTOMATIZACIÓN (AQUÍ ESTÁ EL FIX DEL ERROR)
-- ==============================================================================

-- A. Función para search_text
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
$$ LANGUAGE plpgsql;

-- FIX: Borrar triggers existentes antes de crearlos para evitar error 42710
DROP TRIGGER IF EXISTS tr_leads_search_text ON public.leads;
CREATE TRIGGER tr_leads_search_text
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION generate_search_text();

-- B. Función para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- FIX: Borrar triggers de timestamp si existen
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Actualización inicial de search_text para datos existentes
UPDATE public.leads SET updated_at = now() WHERE search_text IS NULL;

-- 5. ÍNDICES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_search_text_gin ON public.leads USING GIN (search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_pagination ON public.leads(registration_date DESC, id);
CREATE INDEX IF NOT EXISTS idx_leads_advisor ON public.leads(advisor_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);

-- 6. SEGURIDAD RLS (POLÍTICAS)
-- ==============================================================================
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
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas antiguas para evitar duplicados
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
    DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admin/Mod: Ver todo" ON public.leads;
    DROP POLICY IF EXISTS "Asesor: Ver asignados" ON public.leads;
    DROP POLICY IF EXISTS "Admin/Mod: Gestionar" ON public.leads;
    DROP POLICY IF EXISTS "Asesor: Gestionar Propios" ON public.leads;
    DROP POLICY IF EXISTS "Accesso Appointments" ON public.appointments;
    DROP POLICY IF EXISTS "Accesso FollowUps" ON public.follow_ups;
    DROP POLICY IF EXISTS "Accesso History" ON public.status_history;
    DROP POLICY IF EXISTS "Lectura General Statuses" ON public.statuses;
    DROP POLICY IF EXISTS "Escritura Admin Statuses" ON public.statuses;
    DROP POLICY IF EXISTS "Lectura General Sources" ON public.sources;
    DROP POLICY IF EXISTS "Escritura Admin Sources" ON public.sources;
    DROP POLICY IF EXISTS "Lectura General Licenciaturas" ON public.licenciaturas;
    DROP POLICY IF EXISTS "Escritura Admin Licenciaturas" ON public.licenciaturas;
    DROP POLICY IF EXISTS "Accesso Plantillas" ON public.whatsapp_templates;
    DROP POLICY IF EXISTS "Accesso Plantillas Email" ON public.email_templates;
    DROP POLICY IF EXISTS "Insertar propio historial" ON public.login_history;
    DROP POLICY IF EXISTS "Admins ven historial" ON public.login_history;
    DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Recreación de Políticas
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL TO authenticated USING ( public.is_role('admin') );

CREATE POLICY "Admin/Mod: Ver todo" ON public.leads FOR SELECT TO authenticated USING ( public.is_admin_or_mod() );
CREATE POLICY "Asesor: Ver asignados" ON public.leads FOR SELECT TO authenticated USING ( advisor_id = auth.uid() );
CREATE POLICY "Admin/Mod: Gestionar" ON public.leads FOR ALL TO authenticated USING ( public.is_admin_or_mod() );
CREATE POLICY "Asesor: Gestionar Propios" ON public.leads FOR ALL TO authenticated USING ( advisor_id = auth.uid() );

CREATE POLICY "Accesso Appointments" ON public.appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "Accesso FollowUps" ON public.follow_ups FOR ALL TO authenticated USING (true);
CREATE POLICY "Accesso History" ON public.status_history FOR ALL TO authenticated USING (true);

CREATE POLICY "Lectura General Statuses" ON public.statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Statuses" ON public.statuses FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Lectura General Sources" ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Sources" ON public.sources FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Lectura General Licenciaturas" ON public.licenciaturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Licenciaturas" ON public.licenciaturas FOR ALL TO authenticated USING ( public.is_role('admin') );

CREATE POLICY "Accesso Plantillas" ON public.whatsapp_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Accesso Plantillas Email" ON public.email_templates FOR ALL TO authenticated USING (true);

CREATE POLICY "Insertar propio historial" ON public.login_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins ven historial" ON public.login_history FOR SELECT TO authenticated USING ( public.is_role('admin') );

CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 7. FUNCIONES RPC (Llamadas desde el Frontend)
-- ==============================================================================

CREATE OR REPLACE FUNCTION create_user_profile(user_id UUID, full_name TEXT, user_email TEXT, user_role TEXT) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role) 
  VALUES (user_id, full_name, user_email, user_role)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_details(user_id_to_update UUID, new_full_name TEXT, new_role TEXT, new_password TEXT DEFAULT NULL) RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles SET full_name = new_full_name, role = new_role WHERE id = user_id_to_update;
  IF new_password IS NOT NULL AND new_password <> '' THEN
    UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')) WHERE id = user_id_to_update;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_user_by_id(user_id_to_delete UUID) RETURNS VOID AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION transfer_lead(lead_id UUID, new_advisor_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE public.leads SET advisor_id = new_advisor_id, updated_at = now() WHERE id = lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNCIÓN RPC PARA MÉTRICAS DEL DASHBOARD
-- ==============================================================================
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
    
    status_stats JSON;
    advisor_stats JSON;
BEGIN
    -- 1. Contadores Básicos
    SELECT COUNT(*) INTO total_leads FROM leads;
    
    SELECT COUNT(*) INTO new_leads_today 
    FROM leads 
    WHERE DATE(registration_date) = today;
    
    -- 2. Citas para hoy (Solo leads activos)
    SELECT COUNT(a.id) INTO appointments_today
    FROM appointments a
    JOIN leads l ON a.lead_id = l.id
    JOIN statuses s ON l.status_id = s.id
    WHERE a.status = 'scheduled' 
    AND DATE(a.date) = today
    AND s.category = 'active';

    -- 3. Sin seguimiento reciente (Solo leads activos)
    -- A. Nuevos (>3 días sin notas)
    SELECT COUNT(*) INTO no_follow_up
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND l.registration_date < three_days_ago
    AND NOT EXISTS (SELECT 1 FROM follow_ups f WHERE f.lead_id = l.id);

    -- B. Seguimiento vencido (>7 días desde última nota)
    SELECT COUNT(*) INTO stale_follow_up
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND EXISTS (
        SELECT 1 FROM follow_ups f 
        WHERE f.lead_id = l.id 
        HAVING MAX(f.date) < seven_days_ago
    );

    -- 4. Distribución por Estado
    SELECT json_agg(json_build_object('name', s.name, 'value', c.count, 'color', s.color))
    INTO status_stats
    FROM (
        SELECT status_id, COUNT(*) as count 
        FROM leads 
        GROUP BY status_id
    ) c
    JOIN statuses s ON c.status_id = s.id;

    -- 5. Distribución por Asesor
    SELECT json_agg(json_build_object('name', split_part(p.full_name, ' ', 1), 'fullName', p.full_name, 'value', c.count))
    INTO advisor_stats
    FROM (
        SELECT advisor_id, COUNT(*) as count 
        FROM leads 
        GROUP BY advisor_id
    ) c
    JOIN profiles p ON c.advisor_id = p.id;

    -- Construir Resultado Final
    result := json_build_object(
        'totalLeads', COALESCE(total_leads, 0),
        'newLeadsToday', COALESCE(new_leads_today, 0),
        'appointmentsToday', COALESCE(appointments_today, 0),
        'noFollowUp', COALESCE(no_follow_up, 0),
        'staleFollowUp', COALESCE(stale_follow_up, 0),
        'statusCallback', COALESCE(status_stats, '[]'::json),
        'advisorStats', COALESCE(advisor_stats, '[]'::json)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ÍNDICES (OPTIMIZACIÓN)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_status_history_lead_id ON public.status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON public.appointments(status, date);
CREATE INDEX IF NOT EXISTS idx_leads_registration_date ON public.leads(registration_date);
