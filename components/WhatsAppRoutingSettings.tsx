// components/WhatsAppRoutingSettings.tsx
// ---------------------------------------------------------------------------
// Panel de configuración del Motor de Enrutamiento de WhatsApp.
// Permite al admin controlar cómo se asignan automáticamente los leads
// que llegan por WhatsApp. Lee/escribe en system_settings WHERE key='whatsapp_routing'.
// ---------------------------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import ArrowPathIcon from './icons/ArrowPathIcon';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Strategy = 'round_robin' | 'least_leads';

interface RoutingConfig {
  auto_assign: boolean;
  strategy   : Strategy;
}

const SETTING_KEY = 'whatsapp_routing';

const STRATEGY_OPTIONS: { value: Strategy; label: string; description: string; icon: string }[] = [
  {
    value      : 'round_robin',
    label      : 'Reparto Secuencial',
    description: 'Cada lead se asigna al siguiente asesor en turno, de forma rotativa.',
    icon       : '🔄',
  },
  {
    value      : 'least_leads',
    label      : 'Asesor Menos Ocupado',
    description: 'El lead se asigna al asesor que tenga actualmente menos prospectos.',
    icon       : '⚖️',
  },
];

// ---------------------------------------------------------------------------
// Sub-componente: Toggle Switch
// ---------------------------------------------------------------------------
interface ToggleProps {
  enabled  : boolean;
  onChange : (val: boolean) => void;
  disabled ?: boolean;
  id       : string;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, disabled, id }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={enabled}
    disabled={disabled}
    onClick={() => onChange(!enabled)}
    className={`
      relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
      transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
      ${enabled
        ? 'bg-green-500 dark:bg-green-600'
        : 'bg-gray-200 dark:bg-slate-600'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <span
      aria-hidden="true"
      className={`
        pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0
        transition-transform duration-200 ease-in-out
        ${enabled ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
const WhatsAppRoutingSettings: React.FC = () => {
  const toast = useToast();

  const [isAutoAssign,      setIsAutoAssign]      = useState(false);
  const [selectedStrategy,  setSelectedStrategy]  = useState<Strategy>('round_robin');
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [isDirty,           setIsDirty]           = useState(false);

  // Snapshot de valores guardados en BD (para detectar cambios sin guardar)
  const [savedConfig, setSavedConfig] = useState<RoutingConfig>({
    auto_assign: false,
    strategy   : 'round_robin',
  });

  // -------------------------------------------------------------------------
  // Fetch inicial — leer configuración desde system_settings
  // -------------------------------------------------------------------------
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      if (error) {
        console.error('Error loading routing config:', error.message);
        toast.error('No se pudo cargar la configuración de enrutamiento.');
      } else if (data?.value) {
        const cfg = data.value as RoutingConfig;
        const autoAssign = cfg.auto_assign === true;
        const strategy   = cfg.strategy === 'least_leads' ? 'least_leads' : 'round_robin';

        setIsAutoAssign(autoAssign);
        setSelectedStrategy(strategy);
        setSavedConfig({ auto_assign: autoAssign, strategy });
      }
      // Si no existe el registro → los defaults (false + round_robin) ya están en el estado

      setLoading(false);
    };

    fetchConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Detectar cambios sin guardar
  // -------------------------------------------------------------------------
  useEffect(() => {
    const hasChanges =
      isAutoAssign !== savedConfig.auto_assign ||
      selectedStrategy !== savedConfig.strategy;
    setIsDirty(hasChanges);
  }, [isAutoAssign, selectedStrategy, savedConfig]);

  // -------------------------------------------------------------------------
  // Guardar — UPSERT en system_settings
  // -------------------------------------------------------------------------
  const handleSave = async () => {
    setSaving(true);

    const payload: RoutingConfig = {
      auto_assign: isAutoAssign,
      strategy   : selectedStrategy,
    };

    const { error } = await supabase
      .from('system_settings')
      .upsert(
        { key: SETTING_KEY, value: payload },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Error saving routing config:', error.message);
      toast.error(`Error al guardar: ${error.message}`);
    } else {
      setSavedConfig(payload);
      setIsDirty(false);
      toast.success('Configuración de enrutamiento guardada correctamente.');
    }

    setSaving(false);
  };

  // -------------------------------------------------------------------------
  // Descartar cambios
  // -------------------------------------------------------------------------
  const handleDiscard = () => {
    setIsAutoAssign(savedConfig.auto_assign);
    setSelectedStrategy(savedConfig.strategy);
  };

  // -------------------------------------------------------------------------
  // Render — skeleton de carga
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5 animate-pulse">
        <div className="h-5 w-56 bg-gray-200 dark:bg-slate-700 rounded-full" />
        <div className="h-3 w-80 bg-gray-100 dark:bg-slate-700/60 rounded-full" />
        <div className="h-px bg-gray-100 dark:bg-slate-700" />
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-48 bg-gray-200 dark:bg-slate-700 rounded-full" />
            <div className="h-3 w-72 bg-gray-100 dark:bg-slate-700/60 rounded-full" />
          </div>
          <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-slate-700" />
        </div>
        <div className="h-24 rounded-xl bg-gray-100 dark:bg-slate-700/60" />
        <div className="h-9 w-36 rounded-xl bg-gray-200 dark:bg-slate-700" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render — formulario
  // -------------------------------------------------------------------------
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-lg">
            📡
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Enrutamiento de WhatsApp
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Define cómo se asignan automáticamente los leads entrantes de WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* ── Cuerpo ────────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 space-y-6">

        {/* Control 1: Toggle Asignación Automática */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label
              htmlFor="toggle-auto-assign"
              className="text-sm font-semibold text-gray-800 dark:text-gray-100 cursor-pointer"
            >
              Asignación Automática de Leads
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {isAutoAssign
                ? 'Los leads nuevos se distribuyen automáticamente a los asesores.'
                : 'Los leads se asignan a tu cuenta (Admin) para distribución manual.'
              }
            </p>
          </div>
          <Toggle
            id="toggle-auto-assign"
            enabled={isAutoAssign}
            onChange={setIsAutoAssign}
            disabled={saving}
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 dark:bg-slate-700" />

        {/* Control 2: Estrategia de Asignación */}
        <div
          className={`space-y-3 transition-all duration-300 ${
            isAutoAssign ? 'opacity-100' : 'opacity-40 pointer-events-none select-none'
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Estrategia de Asignación
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Criterio usado para elegir al asesor cuando llega un nuevo lead.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Estrategia de asignación">
            {STRATEGY_OPTIONS.map((opt) => {
              const isSelected = selectedStrategy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={saving || !isAutoAssign}
                  onClick={() => setSelectedStrategy(opt.value)}
                  className={`
                    relative text-left rounded-xl border-2 px-4 py-3 transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-1
                    ${isSelected
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-500'
                      : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/40 hover:border-green-300 dark:hover:border-green-700'
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  {/* Check indicador */}
                  {isSelected && (
                    <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M1.5 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5" aria-hidden="true">{opt.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${
                        isSelected
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aviso cuando está apagado */}
        {!isAutoAssign && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-4 py-3">
            <span className="text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Con la asignación automática <strong>desactivada</strong>, todos los leads nuevos de WhatsApp
              llegarán a tu bandeja de administrador para que los distribuyas manualmente.
            </p>
          </div>
        )}

        {/* Indicador de cambios sin guardar */}
        {isDirty && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Tienes cambios sin guardar
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`
              inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold
              transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2
              ${saving || !isDirty
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200/50 dark:shadow-none'
              }
            `}
          >
            {saving ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <span aria-hidden="true">💾</span>
                Guardar Configuración
              </>
            )}
          </button>

          {isDirty && !saving && (
            <button
              type="button"
              onClick={handleDiscard}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline transition-colors"
            >
              Descartar cambios
            </button>
          )}
        </div>

        {/* Estado actual guardado (info pill) */}
        {!isDirty && !loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Configuración activa:&nbsp;
            <span className="font-semibold text-gray-600 dark:text-gray-300">
              {savedConfig.auto_assign
                ? `Auto-asignación ON · ${
                    savedConfig.strategy === 'round_robin' ? 'Round Robin' : 'Menos Ocupado'
                  }`
                : 'Asignación manual (Admin)'
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppRoutingSettings;
