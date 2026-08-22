-- ==============================================================================
-- MIGRACIÓN: Agregar análisis IA a resultados CHASIDE
-- Fecha: 2026-08-22
-- Descripción: Agrega la columna ai_analysis a la tabla vocational_tests
-- ==============================================================================

ALTER TABLE public.vocational_tests ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
