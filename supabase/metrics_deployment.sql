-- ==============================================================================
-- DESPLIEGUE FINAL - VERSIÓN DEFINITIVA
-- ==============================================================================

-- 1. ASEGURAR ESTRUCTURA DE LA TABLA (Columns & Indexes)
DO $$
BEGIN
    -- A. Si la tabla no existe, la creamos con el esquema "ideal"
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'status_history') THEN
        CREATE TABLE public.status_history (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
            status_id UUID REFERENCES public.statuses(id),
            previous_status_id UUID REFERENCES public.statuses(id),
            changed_by UUID REFERENCES public.profiles(id),
            changed_at TIMESTAMPTZ DEFAULT NOW(),
            comment TEXT
        );
    ELSE
        -- B. Si la tabla YA existe, verificamos y reparamos columnas faltantes
        
        -- Reparar 'status_id'
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_history' AND column_name = 'status_id') THEN
            -- Checar si existe 'new_status_id' (legacy) para migrar datos
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_history' AND column_name = 'new_status_id') THEN
                ALTER TABLE public.status_history ADD COLUMN status_id UUID;
                UPDATE public.status_history SET status_id = new_status_id;
            ELSE
                 -- Si no existe ninguna, solo crear la columna
                ALTER TABLE public.status_history ADD COLUMN status_id UUID REFERENCES public.statuses(id);
            END IF;
        END IF;

        -- Reparar 'changed_at'
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_history' AND column_name = 'changed_at') THEN
            -- Checar si existe 'date' (legacy) para migrar datos
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'status_history' AND column_name = 'date') THEN
                ALTER TABLE public.status_history ADD COLUMN changed_at TIMESTAMPTZ;
                UPDATE public.status_history SET changed_at = date;
            ELSE
                ALTER TABLE public.status_history ADD COLUMN changed_at TIMESTAMPTZ DEFAULT NOW();
            END IF;
        END IF;

    END IF;
END $$;

-- 2. CREAR ÍNDICES (Ahora es seguro porque las columnas existen)
CREATE INDEX IF NOT EXISTS idx_status_history_date ON public.status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_status_history_status ON public.status_history(status_id);

-- 3. ACTUALIZAR FUNCIÓN DE MÉTRICAS (Usa las columnas estándar status_id y changed_at)
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
    result JSON;
    today DATE := CURRENT_DATE;
    three_days_ago TIMESTAMPTZ := NOW() - INTERVAL '3 days';
    seven_days_ago TIMESTAMPTZ := NOW() - INTERVAL '7 days';
    
    total_leads INTEGER;
    new_leads_today INTEGER;
    enrolled_today INTEGER;
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

    -- 3. Inscritos Hoy (Status 'won' hoy)
    SELECT COUNT(*) INTO enrolled_today
    FROM status_history h
    JOIN statuses s ON h.status_id = s.id
    WHERE s.category = 'won'
    AND DATE(h.changed_at) = today;

    -- 4. Sin seguimiento reciente (Solo leads activos)
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

    -- 5. Distribución por Estado
    SELECT json_agg(json_build_object('name', s.name, 'value', c.count, 'color', s.color))
    INTO status_stats
    FROM (
        SELECT status_id, COUNT(*) as count 
        FROM leads 
        GROUP BY status_id
    ) c
    JOIN statuses s ON c.status_id = s.id;

    -- 6. Distribución por Asesor
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
        'enrolledToday', COALESCE(enrolled_today, 0),
        'appointmentsToday', COALESCE(appointments_today, 0),
        'noFollowUp', COALESCE(no_follow_up, 0),
        'staleFollowUp', COALESCE(stale_follow_up, 0),
        'statusCallback', COALESCE(status_stats, '[]'::json),
        'advisorStats', COALESCE(advisor_stats, '[]'::json)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Nueva función para Alertas Diarias (Popup Login)
CREATE OR REPLACE FUNCTION check_pending_alerts(requesting_user_id uuid)
RETURNS json AS $$
DECLARE
    user_role text;
    result json;
    
    -- Contadores
    appointments_count int;
    overdue_followups_count int;
    untouched_leads_count int;
    
    -- Fechas
    today date := CURRENT_DATE;
    three_days_ago timestamp := NOW() - INTERVAL '3 days';
    seven_days_ago timestamp := NOW() - INTERVAL '7 days';
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO user_role FROM profiles WHERE id = requesting_user_id;

    -- 1. Citas de Hoy
    SELECT COUNT(*) INTO appointments_count
    FROM appointments a
    JOIN leads l ON a.lead_id = l.id
    WHERE DATE(a.date) = today
    AND a.status = 'scheduled'
    AND (user_role IN ('admin', 'coordinator') OR l.advisor_id = requesting_user_id);

    -- 2. Seguimientos Vencidos (>7 días sin nota, lead activo)
    SELECT COUNT(*) INTO overdue_followups_count
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND (user_role IN ('admin', 'coordinator') OR l.advisor_id = requesting_user_id)
    AND EXISTS (
        SELECT 1 FROM follow_ups f 
        WHERE f.lead_id = l.id 
        HAVING MAX(f.date) < seven_days_ago
    );

    -- 3. Leads Desatendidos (Nuevos > 3 días sin nota, lead activo)
    SELECT COUNT(*) INTO untouched_leads_count
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND l.registration_date < three_days_ago
    AND NOT EXISTS (SELECT 1 FROM follow_ups f WHERE f.lead_id = l.id)
    AND (user_role IN ('admin', 'coordinator') OR l.advisor_id = requesting_user_id);

    -- Construir JSON
    result := json_build_object(
        'appointmentsCount', appointments_count,
        'overdueFollowupsCount', overdue_followups_count,
        'untouchedLeadsCount', untouched_leads_count,
        'hasAlerts', (appointments_count > 0 OR overdue_followups_count > 0 OR untouched_leads_count > 0)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
