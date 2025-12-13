-- Create status_categories table
CREATE TABLE IF NOT EXISTS public.status_categories (
  key TEXT PRIMARY KEY CHECK (key IN ('active', 'won', 'lost')),
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Read Categories" ON public.status_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Update Categories" ON public.status_categories FOR UPDATE TO authenticated USING ( public.is_role('admin') );

-- Insert default values if they don't exist
INSERT INTO public.status_categories (key, label, icon, color, order_index)
VALUES 
  ('active', 'En Proceso', '⚡', 'text-brand-primary dark:text-blue-300', 1),
  ('won', 'Inscritos', '🎓', 'text-green-600 dark:text-green-400', 2),
  ('lost', 'Bajas', '❌', 'text-red-600 dark:text-red-400', 3)
ON CONFLICT (key) DO NOTHING;
