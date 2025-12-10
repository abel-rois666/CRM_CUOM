-- 1. FUNCIÓN PARA OBTENER MÉTRICAS (Restaura el Dashboard)
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
    result JSON;
    -- Definimos la zona horaria del proyecto (CDMX)
    project_timezone TEXT := 'America/Mexico_City';
    
    -- Calculamos "Hoy" en la zona horaria local, no en UTC
    today DATE := DATE(NOW() AT TIME ZONE project_timezone);
    
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
    -- Contadores Básicos
    SELECT COUNT(*) INTO total_leads FROM leads;
    
    -- Nuevos leads hoy (ajustado a zona horaria)
    SELECT COUNT(*) INTO new_leads_today 
    FROM leads 
    WHERE DATE(registration_date AT TIME ZONE project_timezone) = today;
    
    -- Citas para hoy (Corregido para usar a.id y Zona Horaria)
    SELECT COUNT(a.id) INTO appointments_today
    FROM appointments a
    JOIN leads l ON a.lead_id = l.id
    JOIN statuses s ON l.status_id = s.id
    WHERE a.status = 'scheduled' 
    AND DATE(a.date AT TIME ZONE project_timezone) = today
    AND s.category = 'active';

    -- Sin seguimiento reciente
    SELECT COUNT(*) INTO no_follow_up
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND l.registration_date < three_days_ago
    AND NOT EXISTS (SELECT 1 FROM follow_ups f WHERE f.lead_id = l.id);

    -- Seguimiento vencido
    SELECT COUNT(*) INTO stale_follow_up
    FROM leads l
    JOIN statuses s ON l.status_id = s.id
    WHERE s.category = 'active'
    AND EXISTS (
        SELECT 1 FROM follow_ups f 
        WHERE f.lead_id = l.id 
        HAVING MAX(f.date) < seven_days_ago
    );

    -- Distribución por Estado
    SELECT json_agg(json_build_object('name', s.name, 'value', c.count, 'color', s.color))
    INTO status_stats
    FROM (
        SELECT status_id, COUNT(*) as count 
        FROM leads 
        GROUP BY status_id
    ) c
    JOIN statuses s ON c.status_id = s.id;

    -- Distribución por Asesor
    SELECT json_agg(json_build_object('name', split_part(p.full_name, ' ', 1), 'fullName', p.full_name, 'value', c.count))
    INTO advisor_stats
    FROM (
        SELECT advisor_id, COUNT(*) as count 
        FROM leads 
        GROUP BY advisor_id
    ) c
    JOIN profiles p ON c.advisor_id = p.id;

    -- Construir Resultado
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

-- 2. ÍNDICES DE RENDIMIENTO (Para que no sea lento)
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_status_history_lead_id ON public.status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON public.appointments(status, date);
CREATE INDEX IF NOT EXISTS idx_leads_registration_date ON public.leads(registration_date);
