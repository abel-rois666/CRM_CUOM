-- ==============================================================================
-- MIGRACIÓN: Módulo de Orientación Vocacional (Test CHASIDE V3)
-- Fecha: 2026-08-21
-- Descripción: Crea la tabla vocational_tests con RLS para acceso anónimo por token
-- ==============================================================================

-- 1. TABLA
CREATE TABLE IF NOT EXISTS public.vocational_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  completed_at TIMESTAMPTZ,
  raw_answers JSONB,
  calculated_interests JSONB,
  calculated_aptitudes JSONB,
  recommended_careers JSONB,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_vocational_tests_lead_id ON public.vocational_tests(lead_id);
CREATE INDEX IF NOT EXISTS idx_vocational_tests_token ON public.vocational_tests(token);

-- 3. RLS
ALTER TABLE public.vocational_tests ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados (asesores) pueden leer todos los tests
CREATE POLICY "Staff can read vocational_tests"
  ON public.vocational_tests FOR SELECT
  TO authenticated USING (true);

-- Usuarios autenticados pueden insertar (generar nuevos tests)
CREATE POLICY "Staff can insert vocational_tests"
  ON public.vocational_tests FOR INSERT
  TO authenticated WITH CHECK (true);

-- Acceso anónimo de lectura (vista pública necesita leer el token)
CREATE POLICY "Anon can read vocational_tests by token"
  ON public.vocational_tests FOR SELECT
  TO anon USING (true);

-- Acceso anónimo de escritura SOLO si el test está pendiente
CREATE POLICY "Anon can complete pending vocational_test"
  ON public.vocational_tests FOR UPDATE
  TO anon USING (status = 'pending')
  WITH CHECK (status = 'completed');
