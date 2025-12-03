-- ==============================================================================
-- 🎓 CRM UNIVERSITARIO - ESQUEMA DE BASE DE DATOS MAESTRO
-- ==============================================================================

-- 1. CONFIGURACIÓN INICIAL Y TABLAS
-- ==============================================================================

-- Tabla de Perfiles (Extensión de auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'advisor', 'moderator')) DEFAULT 'advisor',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Catálogos
CREATE TABLE public.statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  category TEXT CHECK (category IN ('active', 'won', 'lost')) DEFAULT 'active'
);

CREATE TABLE public.sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE public.licenciaturas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

-- Plantillas
CREATE TABLE public.whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla Principal: Leads
CREATE TABLE public.leads (
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
  registration_date TIMESTAMPTZ DEFAULT now()
);

-- Actividades y Seguimiento (Con Auditoría)
CREATE TABLE public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL, -- Fecha del evento
  duration INTEGER DEFAULT 60,
  details TEXT,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'canceled')) DEFAULT 'scheduled',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL, -- Fecha reportada del contacto
  notes TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() -- Fecha real de registro
);

CREATE TABLE public.status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  old_status_id UUID REFERENCES public.statuses(id),
  new_status_id UUID REFERENCES public.statuses(id),
  date TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE public.login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ DEFAULT now(),
  user_agent TEXT
);

-- 2. FUNCIONES Y TRIGGERS
-- ==============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función RPC para crear usuarios desde el panel administrativo
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  full_name TEXT,
  user_email TEXT,
  user_role TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (user_id, full_name, user_email, user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para transferir leads
CREATE OR REPLACE FUNCTION transfer_lead(
  lead_id UUID, 
  new_advisor_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.leads
  SET advisor_id = new_advisor_id
  WHERE id = lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para actualizar detalles de usuario
CREATE OR REPLACE FUNCTION update_user_details(
  user_id_to_update UUID,
  new_full_name TEXT,
  new_role TEXT,
  new_password TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET full_name = new_full_name, role = new_role
  WHERE id = user_id_to_update;

  IF new_password IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE id = user_id_to_update;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función RPC para eliminar usuario
CREATE OR REPLACE FUNCTION delete_user_by_id(user_id_to_delete UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SEGURIDAD RLS (Row Level Security)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- >>> POLÍTICAS DE PERFILES
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- >>> POLÍTICAS DE LEADS
-- Admin y Moderador: Ver todo
CREATE POLICY "Admin/Mod: Ver todo" ON public.leads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
-- Admin y Moderador: Editar todo
CREATE POLICY "Admin/Mod: Editar todo" ON public.leads FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
-- Admin y Moderador: Insertar
CREATE POLICY "Admin/Mod: Crear" ON public.leads FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
-- Admin: Eliminar (Exclusivo)
CREATE POLICY "Admin: Eliminar" ON public.leads FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Asesor: Ver lo suyo
CREATE POLICY "Asesor: Ver asignados" ON public.leads FOR SELECT TO authenticated USING (
  advisor_id = auth.uid()
);
-- Asesor: Crear
CREATE POLICY "Asesor: Crear" ON public.leads FOR INSERT TO authenticated WITH CHECK (
  advisor_id = auth.uid()
);
-- Asesor: Editar lo suyo
CREATE POLICY "Asesor: Editar asignados" ON public.leads FOR UPDATE TO authenticated USING (
  advisor_id = auth.uid()
);

-- >>> POLÍTICAS DE CITAS
CREATE POLICY "Citas: Acceso jerárquico" ON public.appointments FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = appointments.lead_id
    AND (
        leads.advisor_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    )
  )
);

-- >>> POLÍTICAS DE BITÁCORA (FOLLOW UPS)
CREATE POLICY "Bitácora: Lectura jerárquica" ON public.follow_ups FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = follow_ups.lead_id
    AND (
        leads.advisor_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    )
  )
);

CREATE POLICY "Bitácora: Insertar todos" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Bitácora: Eliminar solo Admin" ON public.follow_ups FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- >>> POLÍTICAS DE PLANTILLAS Y CATÁLOGOS
-- Lectura para todos, Modificación solo Admin/Mod (y Asesor para plantillas)
CREATE POLICY "Plantillas: Ver todos" ON public.whatsapp_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Plantillas: Gestión" ON public.whatsapp_templates FOR ALL TO authenticated USING (true); -- Simplificado para permitir gestión a auth users, o restringir si se desea.

CREATE POLICY "Plantillas Email: Ver todos" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Plantillas Email: Gestión" ON public.email_templates FOR ALL TO authenticated USING (true);

-- Catálogos (Solo lectura general, escritura admin)
CREATE POLICY "Catalogos: Lectura" ON public.statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Catalogos: Admin" ON public.statuses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
-- (Repetir lógica para sources y licenciaturas si se desea estricto, o dejar abierto para select)
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sources read" ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sources write" ON public.sources FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

ALTER TABLE public.licenciaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Licenciaturas read" ON public.licenciaturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Licenciaturas write" ON public.licenciaturas FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. INSERTAR DATOS INICIALES (SEEDING)
-- ==============================================================================
-- Crear primer usuario admin manualmente en Supabase Auth y luego:
-- INSERT INTO public.profiles (id, full_name, email, role) VALUES ('ID_DEL_USUARIO_AUTH', 'Super Admin', 'admin@cuom.edu.mx', 'admin');