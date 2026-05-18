// components/AdminWhatsAppInbox.tsx
// ---------------------------------------------------------------------------
// Bandeja de Distribución de WhatsApp — solo para Administradores.
// Muestra leads "Sin Contactar" asignados al admin (llegaron por el webhook),
// permite reasignarlos a un asesor y los escucha en tiempo real.
// ---------------------------------------------------------------------------
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { useToast } from '../context/ToastContext';
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
  last_message      : string | null;   // último mensaje de whatsapp_messages
  last_message_at   : string | null;
}

interface AdminWhatsAppInboxProps {
  /** UUID del administrador actual */
  currentAdminId  : string;
  /** Callback opcional cuando se asigna un lead con éxito */
  onLeadAssigned ?: (leadId: string, newAdvisorId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const truncate = (str: string | null, max = 60): string => {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
};

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------
const SkeletonRow: React.FC = () => (
  <tr className="animate-pulse">
    {[120, 100, 140, 200, 160].map((w, i) => (
      <td key={i} className="px-4 py-4">
        <div className={`h-3 rounded-full bg-gray-200 dark:bg-slate-700`} style={{ width: w }} />
      </td>
    ))}
    <td className="px-4 py-4">
      <div className="h-8 w-28 rounded-lg bg-gray-200 dark:bg-slate-700" />
    </td>
    <td className="px-4 py-4">
      <div className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-slate-700" />
    </td>
  </tr>
);

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
const AdminWhatsAppInbox: React.FC<AdminWhatsAppInboxProps> = ({
  currentAdminId,
  onLeadAssigned,
}) => {
  const toast = useToast();

  const [leads,    setLeads]    = useState<InboxLead[]>([]);
  const [advisors, setAdvisors] = useState<Profile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  /** advisorId seleccionado por fila: { [leadId]: advisorId } */
  const [selected,  setSelected]  = useState<Record<string, string>>({});
  /** Set de leadIds cuya petición de asignación está en vuelo */
  const [assigning, setAssigning] = useState<Set<string>>(new Set());
  /** Set de leadIds en animación de salida */
  const [removing,  setRemoving]  = useState<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Fetch principal: leads + último mensaje de WhatsApp
  // -------------------------------------------------------------------------
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Traemos leads con join a sources y statuses, filtrando por advisor = admin
    const { data: rawLeads, error: leadsErr } = await supabase
      .from('leads')
      .select(`
        id, first_name, paternal_last_name, phone, registration_date,
        sources  ( name ),
        statuses ( name, category )
      `)
      .eq('advisor_id', currentAdminId)
      .order('registration_date', { ascending: false });

    if (leadsErr) {
      console.error('AdminWhatsAppInbox fetch error:', leadsErr.message);
      setError('No se pudo cargar la bandeja. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    // Filtrar en cliente: fuente WhatsApp + estado activo sin contactar
    const filtered = ((rawLeads ?? []) as any[]).filter((row) => {
      const src  = (row.sources?.name ?? '').toLowerCase();
      const st   = (row.statuses?.name ?? '').toLowerCase();
      const cat  = row.statuses?.category ?? '';
      return src.includes('whatsapp') && cat === 'active' && st.includes('sin contactar');
    });

    if (filtered.length === 0) {
      setLeads([]);
      setLoading(false);
      return;
    }

    // Obtener el último mensaje de WA por lead_id en una sola query
    const leadIds = filtered.map((r: any) => r.id);
    const { data: msgs } = await supabase
      .from('whatsapp_messages')
      .select('lead_id, message_body, created_at')
      .in('lead_id', leadIds)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false });

    // Mapa: lead_id → primer mensaje (el más reciente, ya viene ordenado DESC)
    const lastMsgMap = new Map<string, { body: string; at: string }>();
    for (const m of (msgs ?? []) as any[]) {
      if (!lastMsgMap.has(m.lead_id)) {
        lastMsgMap.set(m.lead_id, { body: m.message_body, at: m.created_at });
      }
    }

    const inboxLeads: InboxLead[] = filtered.map((row: any) => ({
      id                : row.id,
      first_name        : row.first_name,
      paternal_last_name: row.paternal_last_name,
      phone             : row.phone,
      registration_date : row.registration_date,
      source_name       : row.sources?.name ?? null,
      status_name       : row.statuses?.name ?? null,
      last_message      : lastMsgMap.get(row.id)?.body ?? null,
      last_message_at   : lastMsgMap.get(row.id)?.at   ?? null,
    }));

    setLeads(inboxLeads);
    setLoading(false);
  }, [currentAdminId]);

  // -------------------------------------------------------------------------
  // Fetch asesores
  // -------------------------------------------------------------------------
  const fetchAdvisors = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['advisor', 'moderator'])
      .order('full_name', { ascending: true });

    if (err) {
      console.error('Error fetching advisors:', err.message);
      return;
    }
    setAdvisors((data ?? []) as Profile[]);
  }, []);

  // -------------------------------------------------------------------------
  // Carga inicial
  // -------------------------------------------------------------------------
  useEffect(() => {
    fetchLeads();
    fetchAdvisors();
  }, [fetchLeads, fetchAdvisors]);

  // -------------------------------------------------------------------------
  // Realtime — INSERT y UPDATE en leads asignados al admin
  // -------------------------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel('admin_wa_inbox_rt')
      .on(
        'postgres_changes',
        {
          event : 'INSERT',
          schema: 'public',
          table : 'leads',
          filter: `advisor_id=eq.${currentAdminId}`,
        },
        (payload) => {
          console.log('AdminWhatsAppInbox: new lead INSERT', payload.new?.id);
          // Re-fetch para obtener los joins de statuses y sources
          fetchLeads();
        }
      )
      .on(
        'postgres_changes',
        {
          event : 'UPDATE',
          schema: 'public',
          table : 'leads',
          filter: `advisor_id=eq.${currentAdminId}`,
        },
        (payload) => {
          // Si un lead actualizado ya no cumple el filtro (reasignado externamente)
          // lo eliminamos del estado local
          const updatedId = payload.new?.id as string | undefined;
          if (updatedId) {
            setLeads((prev) => prev.filter((l) => l.id !== updatedId));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentAdminId, fetchLeads]);

  // -------------------------------------------------------------------------
  // Asignar lead al asesor seleccionado
  // -------------------------------------------------------------------------
  const handleAssign = async (leadId: string) => {
    const advisorId = selected[leadId];
    if (!advisorId) return;

    const advisorName = advisors.find((a) => a.id === advisorId)?.full_name ?? 'el asesor';

    setAssigning((prev) => new Set(prev).add(leadId));

    const { error: updateErr } = await supabase
      .from('leads')
      .update({ advisor_id: advisorId } as never)
      .eq('id', leadId);

    if (updateErr) {
      console.error('Error assigning lead:', updateErr.message);
      toast.error(`Error al asignar: ${updateErr.message}`);
      setAssigning((prev) => { const s = new Set(prev); s.delete(leadId); return s; });
      return;
    }

    toast.success(`Lead asignado a ${advisorName} correctamente.`);
    onLeadAssigned?.(leadId, advisorId);

    // Animación de salida → remover del estado
    setRemoving((prev) => new Set(prev).add(leadId));
    setTimeout(() => {
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setSelected((prev)  => { const c = { ...prev }; delete c[leadId]; return c; });
      setAssigning((prev) => { const s = new Set(prev); s.delete(leadId); return s; });
      setRemoving((prev)  => { const s = new Set(prev); s.delete(leadId); return s; });
    }, 400);
  };

  // -------------------------------------------------------------------------
  // Render — estado de carga (skeleton)
  // -------------------------------------------------------------------------
  const renderSkeleton = () => (
    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-slate-700/50">
          <tr>
            {['Lead', 'Teléfono', 'Recibido', 'Último mensaje', 'Recibido a las', 'Asignar a', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700/50">
          {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </tbody>
      </table>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render — error
  // -------------------------------------------------------------------------
  if (!loading && error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{error}</p>
        </div>
        <Button variant="secondary" onClick={fetchLeads}>Reintentar</Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render — estado vacío
  // -------------------------------------------------------------------------
  if (!loading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center shadow-inner">
          <ChatBubbleLeftRightIcon className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <p className="text-base font-bold text-gray-800 dark:text-gray-100">
            Bandeja vacía
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
            No hay mensajes nuevos de WhatsApp por distribuir en este momento.
          </p>
        </div>
        <button
          onClick={fetchLeads}
          className="text-xs text-green-600 dark:text-green-400 underline hover:opacity-80 flex items-center gap-1 transition-opacity"
        >
          <ArrowPathIcon className="w-3 h-3" />
          Actualizar
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render — tabla
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-green-500 text-white text-xs font-bold shadow">
            {leads.length}
          </span>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Leads de WhatsApp por asignar
          </p>
        </div>
        <button
          onClick={fetchLeads}
          title="Actualizar bandeja"
          className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Tabla */}
      {loading ? renderSkeleton() : (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  {['Lead', 'Teléfono', 'Registrado', 'Último mensaje', 'Hora msg.', 'Asignar a', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700/50">
                {leads.map((lead) => {
                  const isAssigning = assigning.has(lead.id);
                  const isRemoving  = removing.has(lead.id);
                  const chosen      = selected[lead.id] ?? '';

                  return (
                    <tr
                      key={lead.id}
                      style={{ transition: 'opacity 0.35s ease, transform 0.35s ease' }}
                      className={`
                        group
                        ${isRemoving
                          ? 'opacity-0 scale-y-0 pointer-events-none'
                          : 'opacity-100 hover:bg-green-50/30 dark:hover:bg-slate-700/30'
                        }
                      `}
                    >
                      {/* Nombre */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 flex-shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center font-bold text-sm text-green-700 dark:text-green-400">
                            {lead.first_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                              {lead.first_name} {lead.paternal_last_name}
                            </p>
                            <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5">
                              📱 {lead.source_name ?? 'WhatsApp'}
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

                      {/* Fecha de registro */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {fmtDateTime(lead.registration_date)}
                        </span>
                      </td>

                      {/* Último mensaje */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <p
                          className="text-xs text-gray-600 dark:text-gray-300 truncate"
                          title={lead.last_message ?? undefined}
                        >
                          {lead.last_message
                            ? `"${truncate(lead.last_message)}"`
                            : <span className="italic text-gray-400">Sin mensajes</span>
                          }
                        </p>
                      </td>

                      {/* Hora del último mensaje */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {fmtDateTime(lead.last_message_at)}
                        </span>
                      </td>

                      {/* Select de asesor */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="relative">
                          <select
                            id={`advisor-select-${lead.id}`}
                            name={`advisor-select-${lead.id}`}
                            value={chosen}
                            onChange={(e) =>
                              setSelected((prev) => ({ ...prev, [lead.id]: e.target.value }))
                            }
                            disabled={isAssigning}
                            aria-label={`Seleccionar asesor para ${lead.first_name}`}
                            className="
                              text-sm rounded-xl border border-gray-200 dark:border-slate-600
                              bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200
                              px-3 py-1.5 pr-8
                              focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent
                              disabled:opacity-50 disabled:cursor-not-allowed
                              appearance-none cursor-pointer transition-all
                              min-w-[170px]
                            "
                          >
                            <option value="" disabled>— Elegir asesor —</option>
                            {advisors.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.full_name}
                                {a.role === 'moderator' ? ' (mod)' : ''}
                              </option>
                            ))}
                          </select>
                          {/* Ícono chevron decorativo */}
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                            ▾
                          </span>
                        </div>
                      </td>

                      {/* Botón Asignar */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleAssign(lead.id)}
                          disabled={!chosen || isAssigning}
                          aria-label={`Asignar ${lead.first_name} al asesor seleccionado`}
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                            text-xs font-bold transition-all duration-150 active:scale-95
                            ${!chosen || isAssigning
                              ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                              : 'bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200/50 dark:shadow-none'
                            }
                          `}
                        >
                          {isAssigning ? (
                            <>
                              <ArrowPathIcon className="w-3 h-3 animate-spin" />
                              Asignando…
                            </>
                          ) : (
                            <>
                              <span aria-hidden="true">✓</span>
                              Asignar
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
        </div>
      )}

      {/* Nota informativa */}
      {!loading && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Leads capturados automáticamente desde WhatsApp y asignados a tu cuenta como bandeja central.
          La bandeja se actualiza en tiempo real.
        </p>
      )}
    </div>
  );
};

export default AdminWhatsAppInbox;
