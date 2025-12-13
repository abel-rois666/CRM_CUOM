-- Create a table for general system settings (key-value store)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access for authenticated users" ON public.system_settings
    FOR SELECT TO authenticated USING (true);

-- Allow write access only to admins
CREATE POLICY "Allow write access for admins" ON public.system_settings
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Insert default settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('timezone', '"America/Mexico_City"', 'Zona horaria del sistema'),
    ('notifications_enabled', 'true', 'Activar notificaciones de recordatorios')
ON CONFLICT (key) DO NOTHING;
