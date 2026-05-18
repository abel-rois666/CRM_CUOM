// components/WhatsAppInbox.tsx
// ---------------------------------------------------------------------------
// Bandeja de Distribución de WhatsApp — exclusiva para Administradores.
// Muestra leads nuevos (sin contactar) llegados vía WhatsApp y permite
// reasignarlos a cualquier asesor en tiempo real.
// ---------------------------------------------------------------------------
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import Button from './common/Button';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------
interface InboxLead {
  id                : string;
  first_name        : string;
  paternal_last_name: string;
  phone             : string;
  registration_date : string;
  source_name       : string | null;
  status_name       : string | null;
}

interface WhatsAppInboxProps {
  /** ID del administrador actual — se usa para filtrar leads asignados a él */
  currentAdminId: string;
  /** Callback opcional al asignar un lead (ej. para actualizar el estado global) */
  onLeadAssigned?: (leadId: string, advisorId: string) => void;
}

// ---------------------------------------------------------------------------
// Utilidad de formato de fecha
// ---------------------------------------------------------------------------
const fmtDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
const WhatsAppInbox: React.FC<WhatsAppInboxProps> = ({ currentAdminId, onLeadAssigned }) => {
  const [leads,    setLeads]    = useState<InboxLead[]>([]);
  const [advisors, setAdvisors] = useState<Profile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  /** advisorId seleccionado por lead: { [leadId]: advisorId } */
  const [selectedAdvisor, setSelectedAdvisor] = useState<Record<string, string>>({});
  /** leadIds cuya asignación está en proceso */
  const [assigning, setAssigning] = useState<Set<string>>(new Set());
  /** leadId recién asignado (para animación de salida) */
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Fetch: leads nuevos de WhatsApp asignados al admin
  // Criterios:
  //   - advisor_id = currentAdminId  (caen aquí por el webhook automático)
  //   - source con nombre 'WhatsApp' (vía join)
  //   - status con category = 'active' y nombre ILIKE '%sin contactar%'
  // -------------------------------------------------------------------------
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        paternal_last_name,
        phone,
        registration_date,
        sources   ( name ),
        statuses  ( name, category )
      `)
      .eq('advisor_id', currentAdminId)
      .order('registration_date', { ascending: false });

    if (fetchError) {
      console.error('WhatsAppInbox fetch error:', fetchError.message);
      setError('No se pudo cargar la bandeja. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    // Filtrar en cliente: solo fuente WhatsApp + estado activo sin contactar
    const filtered: InboxLead[] = (data ?? [])
      .filter((row: any) => {
        const sourceName = row.sources?.name?.toLowerCase() ?? '';
        const statusName = row.statuses?.name?.toLowerCase() ?? '';
        const category   = row.statuses?.category ?? '';
        return (
          sourceName.includes('whatsapp') &&
          category === 'active' &&
          statusName.includes('sin contactar')
        );
      })
      .map((row: any) => ({
        id                : row.id,
        first_name        : row.first_name,
        paternal_last_name: row.paternal_last_name,
        phone             : row.phone,
        registration_date : row.registration_date,
        source_name       : row.sources?.name ?? null,
        status_name       : row.statuses?.name ?? null,
      }));

    setLeads(filtered);
    setLoading(false);
  }, [currentAdminId]);

  // -------------------------------------------------------------------------
  // Fetch: asesores disponibles
  // -------------------------------------------------------------------------
  const fetchAdvisors = useCallback(async () => {
    const { data, error: advisorError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['advisor', 'moderator'])
      .order('full_name', { ascending: true });

    if (advisorError) {
      console.error('Error fetching advisors:', advisorError.message);
      return;
    }

    setAdvisors((data ?? []) as Profile[]);
  }, []);

  // -------------------------------------------------------------------------
  // Montaje inicial
  // -------------------------------------------------------------------------
  useEffect(() => {
    fetchLeads();
    fetchAdvisors();
  }, [fetchLeads, fetchAdvisors]);

  // -------------------------------------------------------------------------
  // Realtime: escuchar INSERTs en leads donde advisor_id = admin
  // -------------------------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp_inbox_realtime')
      .on(
        'postgres_changes',
        {
          event : 'INSERT',
          schema: 'public',
          table : 'leads',
          filter: `advisor_id=eq.${currentAdminId}`,
        },
        (payload) => {
          console.log('WhatsAppInbox: new lead arrived via Realtime', payload.new);
          // Re-fetch para obtener los joins (sources, statuses)
          fetchLeads();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentAdminId, fetchLeads]);

  // -------------------------------------------------------------------------
  // Asignar lead a asesor seleccionado
  // -------------------------------------------------------------------------
  const handleAssign = async (leadId: string) => {
    const advisorId = selectedAdvisor[leadId];
    if (!advisorId) return;

    setAssigning((prev) => new Set(prev).add(leadId));

    const { error: updateError } = await supabase
      .from('leads')
      .update({ advisor_id: advisorId })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error assigning lead:', updateError.message);
      alert(`Error al asignar: ${updateError.message}`);
      setAssigning((prev) => { const s = new Set(prev); s.delete(leadId); return s; });
      return;
    }

    // Animación de salida antes de remover
    setRemoving((prev) => new Set(prev).add(leadId));
    setTimeout(() => {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setRemoving((prev) => { const s = new Set(prev); s.delete(leadId); return s; });
      setAssigning((prev) => { const s = new Set(prev); s.delete(leadId); return s; });
      setSelectedAdvisor((prev) => { const c = { ...prev }; delete c[leadId]; return c; });
      onLeadAssigned?.(leadId, advisorId);
    }, 350);
  };

  // -------------------------------------------------------------------------
  // Render — Estado de carga
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
        <ArrowPathIcon className="w-7 h-7 animate-spin text-green-500" />
        <p className="text-sm">Cargando bandeja de WhatsApp...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-3">
        <p className="text-sm font-medium">{error}</p>
        <Button variant="secondary" onClick={fetchLeads}>Reintentar</Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render — Bandeja vacía
  // -------------------------------------------------------------------------
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center shadow-inner">
          <ChatBubbleLeftRightIcon className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-800 dark:text-gray-100">
            Bandeja vacía
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            No hay leads nuevos de WhatsApp por asignar.
          </p>
        </div>
        <button
          onClick={fetchLeads}
          className="text-xs text-green-600 dark:text-green-400 underline hover:opacity-80 transition-opacity flex items-center gap-1"
        >
          <ArrowPathIcon className="w-3 h-3" />
          Actualizar
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render — Tabla de leads
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">

      {/* Header de la sección */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold shadow">
            {leads.length}
          </span>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Leads sin asignar de WhatsApp
          </p>
        </div>
        <button
          onClick={fetchLeads}
          title="Actualizar bandeja"
          className="text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Tabla responsive */}
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              {['Lead', 'Teléfono', 'Recibido', 'Asignar a'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
              <th className="px-4 py-3 w-24">
                <span className="sr-only">Acción</span>
              </th>
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700/50">
            {leads.map((lead) => {
              const isAssigning   = assigning.has(lead.id);
              const isRemoving    = removing.has(lead.id);
              const advisorChosen = selectedAdvisor[lead.id];

              return (
                <tr
                  key={lead.id}
                  className={`
                    transition-all duration-300
                    ${isRemoving
                      ? 'opacity-0 scale-y-0 h-0 overflow-hidden'
                      : 'opacity-100 hover:bg-green-50/40 dark:hover:bg-slate-700/40'
                    }
                  `}
                >
                  {/* Nombre */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm flex-shrink-0">
                        {lead.first_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {lead.first_name} {lead.paternal_last_name}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                          <span>📱</span>
                          {lead.source_name ?? 'WhatsApp'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Teléfono */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                      {lead.phone}
                    </span>
                  </td>

                  {/* Fecha */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {fmtDate(lead.registration_date)}
                    </span>
                  </td>

                  {/* Select de asesor */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      id={`assign-advisor-${lead.id}`}
                      name={`assign-advisor-${lead.id}`}
                      value={advisorChosen ?? ''}
                      onChange={(e) =>
                        setSelectedAdvisor((prev) => ({ ...prev, [lead.id]: e.target.value }))
                      }
                      disabled={isAssigning}
                      aria-label={`Seleccionar asesor para ${lead.first_name}`}
                      className="
                        text-sm rounded-lg border border-gray-200 dark:border-slate-600
                        bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200
                        px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-green-400
                        disabled:opacity-50 transition-all cursor-pointer
                        appearance-none
                      "
                    >
                      <option value="" disabled>-- Asesor --</option>
                      {advisors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Botón Asignar */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleAssign(lead.id)}
                      disabled={!advisorChosen || isAssigning}
                      aria-label={`Asignar ${lead.first_name} a asesor`}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                        transition-all duration-150 active:scale-95
                        ${!advisorChosen || isAssigning
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                          : 'bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200 dark:shadow-none'
                        }
                      `}
                    >
                      {isAssigning ? (
                        <>
                          <ArrowPathIcon className="w-3 h-3 animate-spin" />
                          Asignando...
                        </>
                      ) : (
                        <>
                          ✓ Asignar
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Nota informativa */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Estos leads llegaron automáticamente desde WhatsApp y fueron asignados a tu cuenta como bandeja de entrada central.
      </p>
    </div>
  );
};

export default WhatsAppInbox;
