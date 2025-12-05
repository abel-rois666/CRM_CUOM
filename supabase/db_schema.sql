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
CREATE POLICY "Plantillas: Gestión" ON public.whatsapp_templates FOR ALL TO authenticated USING (true);

CREATE POLICY "Plantillas Email: Ver todos" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Plantillas Email: Gestión" ON public.email_templates FOR ALL TO authenticated USING (true);

-- Catálogos (Solo lectura general, escritura admin)
CREATE POLICY "Catalogos: Lectura" ON public.statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Catalogos: Admin" ON public.statuses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

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

-- 5. ÍNDICES DE RENDIMIENTO (OPTIMIZACIÓN)
-- ==============================================================================

-- Índices para búsquedas frecuentes y claves foráneas
CREATE INDEX IF NOT EXISTS idx_leads_advisor ON public.leads(advisor_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status_id);
CREATE INDEX IF NOT EXISTS idx_leads_program ON public.leads(program_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);

-- Índice compuesto para reportes (filtro por fechas)
CREATE INDEX IF NOT EXISTS idx_leads_registration_date ON public.leads(registration_date);

-- Índices para actividades
CREATE INDEX IF NOT EXISTS idx_appointments_lead ON public.appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_followups_lead ON public.follow_ups(lead_id);

-- 6. DATOS PRECARGADOS (OPCIONAL - SEEDING)
-- ==============================================================================

-- Insertar estados predefinidos con sus categorías correctas
INSERT INTO public.statuses (name, color, category) VALUES
    ('Sin Contactar', 'bg-gray-500', 'active'),
    ('Primer Contacto (Respuesta Pendiente)', 'bg-yellow-500', 'active'),
    ('En Seguimiento', 'bg-sky-500', 'active'),
    ('Cita en Negociación', 'bg-cyan-500', 'active'),
    ('Con Cita', 'bg-blue-500', 'active'),
    ('Siguiente ciclo', 'bg-violet-500', 'active'),
    ('Fase de Cierre/Solo Solicitud', 'bg-lime-500', 'active'),
    ('Fase de Cierre/Solo Pago Parcial', 'bg-lime-500', 'active'),
    ('Fase de Cierre/Solicitud y Documentos', 'bg-lime-500', 'active'),
    ('Fase de Cierre/Solicitud y Pago Parcial', 'bg-emerald-500', 'active'),
    ('Fase de Cierre/Solicitud, Pago Parcial y Documentos', 'bg-emerald-500', 'active'),
    ('Contactar después', 'bg-purple-500', 'active'),
    ('Inscrito (a)', 'bg-green-500', 'won'),
    ('Sin Respuesta (No hay interacción)', 'bg-orange-500', 'lost'),
    ('Sin Interés', 'bg-red-500', 'lost'),
    ('Número Equivocado/Inexistente', 'bg-stone-500', 'lost')
ON CONFLICT DO NOTHING; -- Evita errores si ya existen


-- ==============================================================================
-- 7. OPTIMIZACIONES Y VALIDACIONES (Agregado para validación de duplicados)
-- ==============================================================================

-- Trigger para mantener actualizada la fecha de modificación
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices para acelerar el Dashboard y búsquedas
CREATE INDEX IF NOT EXISTS idx_leads_status_date ON public.leads(status_id, registration_date);
CREATE INDEX IF NOT EXISTS idx_leads_advisor_status ON public.leads(advisor_id, status_id);
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads (lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_phone_clean ON public.leads (phone);
CREATE INDEX IF NOT EXISTS idx_status_history_lead_date ON public.status_history(lead_id, date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_date ON public.follow_ups(lead_id, date);

-- Función RPC segura para detectar duplicados desde el frontend
CREATE OR REPLACE FUNCTION check_duplicate_lead(
  check_email TEXT,
  check_phone TEXT
)
RETURNS TABLE (id UUID, advisor_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id, 
    p.full_name as advisor_name
  FROM public.leads l
  LEFT JOIN public.profiles p ON l.advisor_id = p.id
  WHERE 
    (check_email IS NOT NULL AND check_email <> '' AND lower(l.email) = lower(check_email)) 
    OR 
    (check_phone IS NOT NULL AND check_phone <> '' AND l.phone = check_phone)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 8. ÍNDICES DE ALTO RENDIMIENTO (OPTIMIZACIÓN PARA VOLUMEN +10K)
-- Agregado para garantizar velocidad en paginación y filtros complejos
-- ==============================================================================

-- Índice compuesto vital para el hook useCRMData (Paginación estable)
-- Permite saltar miles de registros instantáneamente sin 'scan' secuencial
CREATE INDEX IF NOT EXISTS idx_leads_pagination 
ON public.leads(registration_date DESC, id);

-- Índice para la vista principal del Asesor ('Mis Leads')
CREATE INDEX IF NOT EXISTS idx_leads_advisor_pagination 
ON public.leads(advisor_id, registration_date DESC);

-- Búsquedas de texto insensibles a mayúsculas (Email)
CREATE INDEX IF NOT EXISTS idx_leads_email_search 
ON public.leads (lower(email));

-- Filtrado rápido para el Tablero Kanban (Estado + Fecha)
CREATE INDEX IF NOT EXISTS idx_leads_status_board 
ON public.leads(status_id, registration_date DESC);

-- Optimización de la vista de detalle (Historial cronológico inverso)
CREATE INDEX IF NOT EXISTS idx_followups_lead_date 
ON public.follow_ups(lead_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_lead_date 
ON public.appointments(lead_id, date DESC);