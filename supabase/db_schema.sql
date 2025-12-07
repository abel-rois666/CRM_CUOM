-- ==============================================================================
-- 🎓 CRM UNIVERSITARIO - ESQUEMA 
-- ==============================================================================

-- 1. EXTENSIONES (CRUCIALES PARA BÚSQUEDA)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- Permite ignorar acentos
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Acelera búsquedas parciales

-- 2. FUNCIONES DE SEGURIDAD (ANTI-RECURSIÓN)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_role(required_role text) RETURNS boolean AS $$
DECLARE current_user_role text;
BEGIN
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_user_role = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_mod() RETURNS boolean AS $$
DECLARE current_user_role text;
BEGIN
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_user_role IN ('admin', 'moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TABLAS PRINCIPALES
-- ==============================================================================

-- Perfiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'advisor', 'moderator')) DEFAULT 'advisor',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Catálogos
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

-- Plantillas
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

-- Leads (Tabla Central)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  paternal_last_name TEXT NOT NULL,
  maternal_last_name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  program_id UUID REFERENCES public.licenciaturas(id),
  status_id UUID REFERENCES public.statuses(id),
  advisor_id UUID REFERENCES public.profiles(id),
  source_id UUID REFERENCES public.sources(id),
  registration_date TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
  -- La columna search_text se asegura en el paso siguiente
);

-- ⚠️ FIX CRÍTICO: Asegurar que la columna search_text exista
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Actividades
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  duration INTEGER DEFAULT 60,
  details TEXT,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'canceled')) DEFAULT 'scheduled',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status_id UUID REFERENCES public.statuses(id),
  new_status_id UUID REFERENCES public.statuses(id),
  date TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, 
  login_at TIMESTAMPTZ DEFAULT now(),
  user_agent TEXT
);

DO $$ BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'login_history_user_id_fkey') THEN 
    ALTER TABLE public.login_history ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE; 
  END IF; 
END $$;

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

-- 4. SEGURIDAD (RLS) - LIMPIEZA Y RECREACIÓN
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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
    DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Admin/Mod: Ver todo" ON public.leads;
    DROP POLICY IF EXISTS "Asesor: Ver asignados" ON public.leads;
    DROP POLICY IF EXISTS "Admin/Mod: Gestionar" ON public.leads;
    DROP POLICY IF EXISTS "Asesor: Gestionar Propios" ON public.leads;
    DROP POLICY IF EXISTS "Insertar propio historial" ON public.login_history;
    DROP POLICY IF EXISTS "Admins ven historial" ON public.login_history;
    DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Lectura General Statuses" ON public.statuses;
    DROP POLICY IF EXISTS "Escritura Admin Statuses" ON public.statuses;
    DROP POLICY IF EXISTS "Lectura General Sources" ON public.sources;
    DROP POLICY IF EXISTS "Escritura Admin Sources" ON public.sources;
    DROP POLICY IF EXISTS "Lectura General Licenciaturas" ON public.licenciaturas;
    DROP POLICY IF EXISTS "Escritura Admin Licenciaturas" ON public.licenciaturas;
    DROP POLICY IF EXISTS "Accesso Plantillas" ON public.whatsapp_templates;
    DROP POLICY IF EXISTS "Accesso Plantillas Email" ON public.email_templates;
    DROP POLICY IF EXISTS "Accesso Appointments" ON public.appointments;
    DROP POLICY IF EXISTS "Accesso FollowUps" ON public.follow_ups;
    DROP POLICY IF EXISTS "Accesso History" ON public.status_history;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Policies
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Admin/Mod: Ver todo" ON public.leads FOR SELECT TO authenticated USING ( public.is_admin_or_mod() );
CREATE POLICY "Asesor: Ver asignados" ON public.leads FOR SELECT TO authenticated USING ( advisor_id = auth.uid() );
CREATE POLICY "Admin/Mod: Gestionar" ON public.leads FOR ALL TO authenticated USING ( public.is_admin_or_mod() );
CREATE POLICY "Asesor: Gestionar Propios" ON public.leads FOR ALL TO authenticated USING ( advisor_id = auth.uid() );
CREATE POLICY "Insertar propio historial" ON public.login_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins ven historial" ON public.login_history FOR SELECT TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Lectura General Statuses" ON public.statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Statuses" ON public.statuses FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Lectura General Sources" ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Sources" ON public.sources FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Lectura General Licenciaturas" ON public.licenciaturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura Admin Licenciaturas" ON public.licenciaturas FOR ALL TO authenticated USING ( public.is_role('admin') );
CREATE POLICY "Accesso Plantillas" ON public.whatsapp_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Accesso Plantillas Email" ON public.email_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "Accesso Appointments" ON public.appointments FOR ALL TO authenticated USING (true);
CREATE POLICY "Accesso FollowUps" ON public.follow_ups FOR ALL TO authenticated USING (true);
CREATE POLICY "Accesso History" ON public.status_history FOR ALL TO authenticated USING (true);

-- 5. FUNCIONES Y TRIGGERS DE BÚSQUEDA
-- ==============================================================================

-- Función para llenar la columna search_text automáticamente
CREATE OR REPLACE FUNCTION generate_search_text() RETURNS TRIGGER AS $$
BEGIN
  -- Concatena y limpia acentos
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

-- Trigger
DROP TRIGGER IF EXISTS tr_leads_search_text ON public.leads;
CREATE TRIGGER tr_leads_search_text
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION generate_search_text();

-- Triggers de timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPCs
CREATE OR REPLACE FUNCTION create_user_profile(user_id UUID, full_name TEXT, user_email TEXT, user_role TEXT) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role) VALUES (user_id, full_name, user_email, user_role)
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
  UPDATE public.leads SET advisor_id = new_advisor_id WHERE id = lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_duplicate_lead(check_email TEXT, check_phone TEXT) RETURNS TABLE (id UUID, advisor_name TEXT) AS $$
BEGIN
  RETURN QUERY SELECT l.id, p.full_name as advisor_name FROM public.leads l LEFT JOIN public.profiles p ON l.advisor_id = p.id
  WHERE (check_email IS NOT NULL AND check_email <> '' AND lower(l.email) = lower(check_email)) OR (check_phone IS NOT NULL AND check_phone <> '' AND l.phone = check_phone) LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. MANTENIMIENTO E ÍNDICES
-- ==============================================================================

-- Actualizar datos existentes para generar el search_text (Corrige el error del UPDATE)
-- El trigger se dispara al hacer este UPDATE "dummy"
UPDATE public.leads SET updated_at = now() WHERE search_text IS NULL;

-- Índices B-Tree
CREATE INDEX IF NOT EXISTS idx_leads_pagination ON public.leads(registration_date DESC, id);
CREATE INDEX IF NOT EXISTS idx_leads_advisor_pagination ON public.leads(advisor_id, registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status_board ON public.leads(status_id, registration_date DESC);

-- Índice GIN para búsqueda de texto parcial ULTRA-RÁPIDA
CREATE INDEX IF NOT EXISTS idx_leads_search_text_gin ON public.leads USING GIN (search_text gin_trgm_ops);