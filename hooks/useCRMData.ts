// hooks/useCRMData.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Lead, Profile, Status, Source, Licenciatura, WhatsAppTemplate, EmailTemplate } from '../types';
import { useToast } from '../context/ToastContext';

export const useCRMData = (session: Session | null, userRole?: 'admin' | 'advisor' | 'moderator', userId?: string) => {
  const { error: toastError, info: toastInfo, success: toastSuccess } = useToast();
  
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

  // 2. Cargar Leads (Batching)
  const fetchLeads = useCallback(async (force = false) => {
    if (!session?.access_token) return;

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

          if (userRole === 'advisor' && userId) {
              query = query.eq('advisor_id', userId);
          }
          
          const { data, error } = await query;

          if (error) throw error;

          if (data && data.length > 0) {
              // @ts-ignore
              allLeads = [...allLeads, ...data];
              if (data.length < PAGE_SIZE) hasMore = false;
          } else {
              hasMore = false;
          }
          
          page++;
          if (allLeads.length > 30000) hasMore = false; 
      }

      setLeads(allLeads);

    } catch (error) {
      console.error('Error fetching leads:', error);
      toastError('Error al cargar leads.');
    } finally {
      setLoadingData(false);
      setLoadingLeads(false);
    }
  }, [session, userRole, userId, toastError, leads.length]);

  // 3. Suscripción a Realtime (NUEVO FEATURE)
  useEffect(() => {
    if (!session?.access_token) return;

    // Solo cargamos datos iniciales si no están cargados
    if (!catalogsLoaded) fetchCatalogs();
    fetchLeads();

    // Configuración del canal de Realtime
    const channel = supabase
      .channel('crm_leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar INSERT, UPDATE y DELETE
          schema: 'public',
          table: 'leads',
        },
        async (payload) => {
          // console.log('Cambio detectado en Realtime:', payload);

          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            // Si soy asesor y el lead no es mío, lo ignoro
            if (userRole === 'advisor' && userId && newLead.advisor_id !== userId) return;
            
            // Para tener los datos relacionales (appointments, etc) completos, 
            // a veces es mejor hacer un fetch de esa sola fila o inyectarlo así:
            const leadWithRelations = { 
                ...newLead, 
                appointments: [], 
                follow_ups: [], 
                status_history: [] 
            };
            
            setLeads(prev => [leadWithRelations, ...prev]);
            toastInfo('🔔 Nuevo lead recibido en tiempo real');
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead;
            // Si soy asesor y me quitaron el lead (ya no soy advisor_id), lo remuevo
            if (userRole === 'advisor' && userId && updatedLead.advisor_id !== userId) {
                setLeads(prev => prev.filter(l => l.id !== updatedLead.id));
                toastInfo('🔄 Un lead ha sido reasignado a otro asesor.');
                return;
            }

            // Actualizamos el estado local manteniendo las relaciones existentes (arrays)
            setLeads(prev => prev.map(l => {
                if (l.id === updatedLead.id) {
                    return { ...l, ...updatedLead }; // Merge de datos nuevos con relaciones viejas
                }
                return l;
            }));
          } 
          else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(l => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchCatalogs, fetchLeads, userRole, userId]);

  // --- Helpers Locales ---

  const updateLocalLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const addLocalLead = (newLead: Lead) => {
    setLeads(prev => [newLead, ...prev]);
  };

  const removeLocalLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
  };

  const removeManyLocalLeads = (leadIds: string[]) => {
      const idsSet = new Set(leadIds);
      setLeads(prev => prev.filter(l => !idsSet.has(l.id)));
  };

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