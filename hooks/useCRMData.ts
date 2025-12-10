// hooks/useCRMData.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Lead, Profile, Status, Source, Licenciatura, WhatsAppTemplate, EmailTemplate, DashboardMetrics } from '../types';
import { useToast } from '../context/ToastContext';

// Interfaz para los filtros que se enviarán a la BD
export interface DataFilters {
  advisorId: string;
  statusId: string;
  programId: string;
  startDate: string;
  endDate: string;
  searchTerm: string;
}

export const useCRMData = (session: Session | null, userRole?: 'admin' | 'advisor' | 'moderator', userId?: string) => {
  const { error: toastError, info: toastInfo } = useToast();

  // --- DATOS PRINCIPALES ---
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0); // Total real en base de datos para paginación

  // --- ESTADOS DE PAGINACIÓN Y FILTROS (SERVER-SIDE) ---
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<DataFilters>({
    advisorId: 'all',
    statusId: 'all',
    programId: 'all',
    startDate: '',
    endDate: '',
    searchTerm: ''
  });

  // --- CATÁLOGOS ---
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

  // --- ESTADOS DE CARGA ---
  const [loadingData, setLoadingData] = useState(true); // Carga inicial de catálogos
  const [loadingLeads, setLoadingLeads] = useState(false); // Carga de tabla/paginación
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  const lastFetchedToken = useRef<string | undefined>(undefined);
  const processedIds = useRef<Set<string>>(new Set());
  const leadsRef = useRef<Lead[]>([]);

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  // Función de utilidad para limpiar texto (cliente)
  const normalizeSearchTerm = (text: string) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  // 1. CARGAR CATÁLOGOS (Estáticos - Se cargan una sola vez)
  const fetchCatalogs = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const results = await Promise.allSettled([
        supabase.from('profiles').select('*'),
        supabase.from('statuses').select('*').order('id'),
        supabase.from('sources').select('*'),
        supabase.from('licenciaturas').select('*'),
        supabase.from('whatsapp_templates').select('*'),
        supabase.from('email_templates').select('*'),
      ]);

      const getData = <T>(index: number, fallback: T[] = []): T[] => {
        const result = results[index];
        return result.status === 'fulfilled' && result.value.data ? (result.value.data as T[]) : fallback;
      };

      setProfiles(getData<Profile>(0));
      setStatuses(getData<Status>(1));
      setSources(getData<Source>(2));
      setLicenciaturas(getData<Licenciatura>(3));
      setWhatsappTemplates(getData<WhatsAppTemplate>(4));
      setEmailTemplates(getData<EmailTemplate>(5));

      setCatalogsLoaded(true);
    } catch (error) {
      console.error('Error fetching catalogs:', error);
      toastError('Error al cargar catálogos.');
    } finally {
      setLoadingData(false);
    }
  }, [session, toastError]);

  // 2. CARGAR LEADS (PAGINACIÓN EN SERVIDOR)
  const fetchLeads = useCallback(async (force = false) => {
    if (!session?.access_token) return;

    setLoadingLeads(true);

    try {
      lastFetchedToken.current = session.access_token;

      // Construcción de Query Dinámica
      let query = supabase
        .from('leads')
        .select(`
  *,
  appointments(*, created_by(full_name)),
  follow_ups(*, created_by(full_name)),
  status_history(*, created_by(full_name))
    `, { count: 'exact' }); // Pedimos el conteo total

      // --- FILTROS DE SEGURIDAD (ROL) ---
      if (userRole === 'advisor' && userId) {
        query = query.eq('advisor_id', userId);
      }

      // --- FILTROS DE UI (Aplicados en BD) ---
      if (filters.advisorId !== 'all') query = query.eq('advisor_id', filters.advisorId);
      if (filters.statusId !== 'all') query = query.eq('status_id', filters.statusId);
      if (filters.programId !== 'all') query = query.eq('program_id', filters.programId);

      // Filtro de Fechas
      if (filters.startDate && filters.endDate) {
        query = query.gte('registration_date', `${filters.startDate}T00:00:00.000Z`)
          .lte('registration_date', `${filters.endDate}T23:59:59.999Z`);
      }

      // Búsqueda de Texto (Usando la nueva columna search_text)
      if (filters.searchTerm) {
        const cleanTerm = normalizeSearchTerm(filters.searchTerm);
        // Usamos ilike sobre la columna search_text optimizada
        query = query.ilike('search_text', `%${cleanTerm}%`);
      }

      // --- PAGINACIÓN ---
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order('registration_date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // @ts-ignore
      setLeads(data || []);
      setTotalLeads(count || 0);

    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toastError(`Error al cargar leads: ${error.message} `);
    } finally {
      setLoadingLeads(false);
    }
  }, [session, userRole, userId, page, pageSize, filters, toastError]);

  // --- DASHBOARD METRICS ---
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const { data, error } = await supabase.rpc('get_dashboard_metrics');
      if (error) throw error;
      setDashboardMetrics(data as unknown as DashboardMetrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, [session]);

  // Efectos de carga inicial
  useEffect(() => {
    if (!catalogsLoaded) fetchCatalogs();
  }, [catalogsLoaded, fetchCatalogs]);

  useEffect(() => {
    fetchLeads();
    fetchMetrics();
  }, [fetchLeads, fetchMetrics]);

  // 3. SUSCRIPCIÓN A REALTIME (Adaptada para Paginación)
  useEffect(() => {
    if (!session?.access_token) return;

    const channel = supabase
      .channel('crm_leads_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        async (payload) => {
          // Refrescar métricas ante cualquier cambio
          fetchMetrics();

          // --- EVENTO INSERT ---
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;

            // Filtros de Rol y Duplicados
            if (userRole === 'advisor' && userId && newLead.advisor_id !== userId) return;
            if (processedIds.current.has(newLead.id)) return;

            // Notificación inteligente
            if (page === 1 && !filters.searchTerm) {
              toastInfo('🔔 Nuevo lead recibido. Actualizando lista...');
              // Recarga suave para mostrarlo
              setTimeout(() => fetchLeads(true), 1000);
            } else {
              toastInfo('🔔 Nuevo lead recibido en el sistema.');
            }
          }
          // --- EVENTO UPDATE ---
          else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Lead;

            // Actualización optimista solo si el lead está visible
            setLeads(prev => {
              const exists = prev.find(l => l.id === updated.id);
              if (exists) {
                return prev.map(l => l.id === updated.id ? {
                  ...l,
                  ...updated,
                  // Mantenemos relaciones (no vienen en el payload de realtime)
                  appointments: l.appointments,
                  follow_ups: l.follow_ups,
                  status_history: l.status_history
                } : l);
              }
              return prev;
            });
          }
          // --- EVENTO DELETE ---
          else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(l => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, userRole, userId, page, filters, fetchLeads, toastInfo, fetchMetrics]);

  // --- HELPERS LOCALES ---

  const updateLocalLead = useCallback((updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    fetchMetrics(); // Actualizar métricas al editar
  }, [fetchMetrics]);

  const addLocalLead = useCallback((newLead: Lead) => {
    if (newLead.id) {
      processedIds.current.add(newLead.id);
      setTimeout(() => processedIds.current.delete(newLead.id), 5000);
    }
    // Forzamos recarga para ver el nuevo lead ordenado correctamente
    fetchLeads(true);
    fetchMetrics();
  }, [fetchLeads, fetchMetrics]);

  const removeLocalLead = useCallback((leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setTotalLeads(prev => Math.max(0, prev - 1));
    fetchMetrics();
  }, [fetchMetrics]);

  const removeManyLocalLeads = useCallback((leadIds: string[]) => {
    const idsSet = new Set(leadIds);
    setLeads(prev => prev.filter(l => !idsSet.has(l.id)));
    setTotalLeads(prev => Math.max(0, prev - idsSet.size));
    fetchMetrics();
  }, [fetchMetrics]);

  // Helper para aplicar filtros y resetear a pág 1
  const handleSetFilters = (newFilters: Partial<DataFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  return {
    loadingData, // Carga inicial
    loadingLeads, // Carga de tabla
    leads,
    totalLeads, // Total para paginación UI
    page,
    pageSize,
    setPage,
    setPageSize,
    filters,
    setFilters: handleSetFilters,

    profiles,
    statuses,
    sources,
    licenciaturas,
    whatsappTemplates,
    emailTemplates,
    setProfiles,
    setStatuses,
    setSources,
    setLicenciaturas,
    setWhatsappTemplates,
    setEmailTemplates,

    dashboardMetrics, // <--- EXPOSED

    updateLocalLead,
    addLocalLead,
    removeLocalLead,
    removeManyLocalLeads,
    refetch: () => { fetchLeads(true); fetchMetrics(); },
    refreshCatalogs: fetchCatalogs
  };
};