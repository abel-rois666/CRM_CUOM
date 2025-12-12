-- ==============================================================================
-- FUNCIÓN PARA FILTROS RÁPIDOS DE DASHBOARD (Server-Side Pagination Support)
-- ==============================================================================

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
        AND s.category = 'active' -- Aseguramos que solo sean leads en proceso
        AND (user_role IN ('admin', 'coordinator') OR l.advisor_id = requesting_user_id);

    ELSIF filter_type = 'no_followup' THEN
        RETURN QUERY 
        SELECT l.* 
        FROM leads l
        JOIN statuses s ON l.status_id = s.id
        WHERE l.registration_date < three_days_ago
        AND NOT EXISTS (SELECT 1 FROM follow_ups f WHERE f.lead_id = l.id)
        AND s.category = 'active'
        AND (user_role IN ('admin', 'coordinator') OR l.advisor_id = requesting_user_id);

    ELSIF filter_type = 'stale_followup' THEN
        RETURN QUERY 
        SELECT l.* 
        FROM leads l
        JOIN statuses s ON l.status_id = s.id
        WHERE s.category = 'active'
        AND (user_role IN ('admin', 'coordinator') OR l.advisor_id = requesting_user_id)
        AND EXISTS (
            SELECT 1 FROM follow_ups f 
            WHERE f.lead_id = l.id 
            HAVING MAX(f.date) < seven_days_ago
        );

    ELSE
        -- Fallback: Retornar nada si el filtro no coincide
        -- (Opcional: Retornar todos los leads si se prefiere)
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
