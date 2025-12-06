// hooks/useCRMData.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Lead, Profile, Status, Source, Licenciatura, WhatsAppTemplate, EmailTemplate } from '../types';
import { useToast } from '../context/ToastContext';

export const useCRMData = (session: Session | null, userRole?: 'admin' | 'advisor' | 'moderator', userId?: string) => {
  const { error: toastError, info: toastInfo } = useToast();
  
  // Datos principales
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // Catálogos
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  
  const lastFetchedToken = useRef<string | undefined>(undefined);

  // --- SOLUCIÓN: Cache de IDs procesados ---
  // Almacena IDs de leads que acabamos de crear o recibir para evitar duplicados inmediatos.
  const processedIds = useRef<Set<string>>(new Set());

  // Referencia para mantener el estado actualizado sin recargas
  const leadsRef = useRef<Lead[]>([]);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  // 1. Cargar Catálogos (Estáticos)
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
    }
  }, [session, toastError]);

  // 2. Cargar Leads (Batching Optimizado)
  // NOTA: Esto descarga TODOS los leads al cliente. 
  // Para >10,000 registros, se recomienda migrar a paginación de servidor.
  const fetchLeads = useCallback(async (force = false) => {
    if (!session?.access_token) return;

    // Evitar recargas si el token no ha cambiado y ya tenemos datos, a menos que sea forzado
    if (!force && session.access_token === lastFetchedToken.current && leads.length > 0) {
        setLoadingData(false);
        return;
    }

    setLoadingLeads(true);
    if (leads.length === 0) setLoadingData(true);

    try {
      lastFetchedToken.current = session.access_token;
      let allLeads: Lead[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000;
      const MAX_LIMIT = 20000; // Límite de seguridad para no congelar el navegador

      while (hasMore) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          let query = supabase
            .from('leads')
            .select(`
                *, 
                appointments(*, created_by(full_name)), 
                follow_ups(*, created_by(full_name)), 
                status_history(*, created_by(full_name))
            `)
            .order('registration_date', { ascending: false })
            .range(from, to);

          // Si es asesor, Supabase RLS ya filtra, pero agregar el filtro aquí reduce carga de red
          if (userRole === 'advisor' && userId) {
              query = query.eq('advisor_id', userId);
          }
          
          const { data, error } = await query;

          if (error) throw error;

          if (data && data.length > 0) {
              // @ts-ignore
              allLeads = [...allLeads, ...data];
              
              // Detener si recibimos menos registros de los solicitados (fin de tabla)
              if (data.length < PAGE_SIZE) {
                  hasMore = false;
              }
          } else {
              hasMore = false;
          }
          
          page++;
          
          // Protección contra desbordamiento de memoria
          if (allLeads.length >= MAX_LIMIT) {
              hasMore = false;
              console.warn(`Límite de seguridad alcanzado: ${MAX_LIMIT} leads cargados.`);
              toastInfo(`Se cargaron los ${MAX_LIMIT} leads más recientes.`);
          }
      }

      setLeads(allLeads);

    } catch (error) {
      console.error('Error fetching leads:', error);
      toastError('Error al cargar leads.');
    } finally {
      setLoadingData(false);
      setLoadingLeads(false);
    }
  }, [session, userRole, userId, toastError, leads.length, toastInfo]);

  // 3. Suscripción a Realtime (OPTIMIZADA)
  useEffect(() => {
    if (!session?.access_token) return;

    // Carga inicial
    if (!catalogsLoaded) fetchCatalogs();
    fetchLeads();

    const channel = supabase
      .channel('crm_leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'leads',
        },
        async (payload) => {
          // --- EVENTO INSERT ---
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            
            // 1. BLOQUEO DE DUPLICADOS (La corrección clave)
            // Si el ID ya fue procesado recientemente (por duplicación de evento o insert manual), paramos aquí.
            if (processedIds.current.has(newLead.id)) {
                return;
            }

            // 2. Filtro de Rol
            if (userRole === 'advisor' && userId && newLead.advisor_id !== userId) return;

            // 3. Registrar ID como procesado y programar limpieza
            processedIds.current.add(newLead.id);
            setTimeout(() => processedIds.current.delete(newLead.id), 5000);

            const leadWithRelations = { 
                ...newLead, 
                appointments: [], 
                follow_ups: [], 
                status_history: [] 
            };
            
            // 4. Actualizar Estado
            setLeads(prev => {
                // Doble seguridad: verificamos si existe en la lista actual
                if (prev.some(l => l.id === newLead.id)) return prev;
                return [leadWithRelations, ...prev];
            });

            // Solo mostramos notificación si pasó los filtros anteriores
            toastInfo('🔔 Nuevo lead recibido en tiempo real');
          } 
          // --- EVENTO UPDATE ---
          else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead;
            
            // Caso: Asesor pierde acceso al lead (reasignación)
            if (userRole === 'advisor' && userId && updatedLead.advisor_id !== userId) {
                setLeads(prev => prev.filter(l => l.id !== updatedLead.id));
                toastInfo('🔄 Un lead ha sido reasignado a otro asesor.');
                return;
            }

            setLeads(prev => prev.map(l => {
                if (l.id === updatedLead.id) {
                    // Merge profundo cuidadoso: mantenemos relaciones existentes
                    // ya que el evento UPDATE de realtime no trae joins
                    return { 
                        ...l, 
                        ...updatedLead,
                        appointments: l.appointments,
                        follow_ups: l.follow_ups,
                        status_history: l.status_history
                    }; 
                }
                return l;
            }));
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
    // Quitamos fetchCatalogs y fetchLeads de dependencias para evitar reinicios de suscripción
  }, [session, userRole, userId]); 

  // --- Helpers Locales ---

  const updateLocalLead = useCallback((updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  }, []);

  const addLocalLead = useCallback((newLead: Lead) => {
    // IMPORTANTE: Al agregar localmente, marcamos el ID como procesado.
    // Así, cuando llegue el evento de Realtime segundos después, será ignorado
    // y no verás ni duplicados ni doble notificación.
    if (newLead.id) {
        processedIds.current.add(newLead.id);
        setTimeout(() => processedIds.current.delete(newLead.id), 5000);
    }
    
    setLeads(prev => {
        if (prev.some(l => l.id === newLead.id)) return prev;
        return [newLead, ...prev];
    });
  }, []);

  const removeLocalLead = useCallback((leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
  }, []);

  const removeManyLocalLeads = useCallback((leadIds: string[]) => {
      const idsSet = new Set(leadIds);
      setLeads(prev => prev.filter(l => !idsSet.has(l.id)));
  }, []);

  return {
    loadingData: loadingData || loadingLeads,
    leads,
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
    updateLocalLead,
    addLocalLead,
    removeLocalLead,
    removeManyLocalLeads, 
    refetch: () => fetchLeads(true),
    refreshCatalogs: fetchCatalogs
  };
};