// hooks/useCRMData.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Lead, Profile, Status, Source, Licenciatura, WhatsAppTemplate, EmailTemplate } from '../types';
import { useToast } from '../context/ToastContext';

export const useCRMData = (session: Session | null, userRole?: 'admin' | 'advisor' | 'moderator', userId?: string) => {
  const { error: toastError } = useToast();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  
  // Referencia para evitar re-fetch innecesario
  const lastFetchedToken = useRef<string | undefined>(undefined);

  const fetchData = useCallback(async (force = false) => {
    if (!session?.access_token) {
        setLoadingData(false); 
        return;
    }

    // Cache: Si ya tenemos datos y es el mismo token, no recargar a menos que sea forzado
    if (!force && session.access_token === lastFetchedToken.current && leads.length > 0) {
        setLoadingData(false);
        return;
    }

    // Solo mostrar loading visual si es la primera carga o no hay datos
    if (leads.length === 0) {
        setLoadingData(true);
    }

    try {
      lastFetchedToken.current = session.access_token;

      // --- LÓGICA DE CARGA RECURSIVA (BATCHING) ---
      // Supabase limita a 1000 filas por defecto. Hacemos un bucle para traer todo.
      let allLeads: Lead[] = [];
      let hasMore = true;
      let page = 0;
      const PAGE_SIZE = 1000; // Tamaño del lote seguro

      // Consultas auxiliares (estas son pequeñas, no necesitan batching usualmente)
      const results = await Promise.allSettled([
        supabase.from('profiles').select('*'),
        supabase.from('statuses').select('*'),
        supabase.from('sources').select('*'),
        supabase.from('licenciaturas').select('*'),
        supabase.from('whatsapp_templates').select('*'),
        supabase.from('email_templates').select('*'),
      ]);

      const getData = <T>(index: number, fallback: T[] = []): T[] => {
        const result = results[index];
        if (result.status === 'fulfilled' && result.value.data) {
          return result.value.data as T[];
        }
        return fallback;
      };

      // BUCLE DE CARGA DE LEADS
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
            .range(from, to); // Pedimos el rango específico

          if (userRole === 'advisor' && userId) {
              query = query.eq('advisor_id', userId);
          }
          
          // Ejecutamos la consulta del lote actual
          const { data, error } = await query;

          if (error) throw error;

          if (data && data.length > 0) {
              // @ts-ignore - Supabase types pueden ser estrictos, forzamos la unión
              allLeads = [...allLeads, ...data];
              
              // Si el lote trajo MENOS del límite, significa que ya no hay más
              if (data.length < PAGE_SIZE) {
                  hasMore = false;
              }
          } else {
              // Si no trajo nada, terminamos
              hasMore = false;
          }
          
          page++;
          
          // Freno de emergencia: Si llegamos a 30k leads, paramos para no colgar el navegador
          if (allLeads.length > 30000) hasMore = false; 
      }

      // Asignamos TODOS los leads acumulados
      setLeads(allLeads);
      
      // Asignamos el resto de datos
      setProfiles(getData<Profile>(0));
      setStatuses(getData<Status>(1));
      setSources(getData<Source>(2));
      setLicenciaturas(getData<Licenciatura>(3));
      setWhatsappTemplates(getData<WhatsAppTemplate>(4));
      setEmailTemplates(getData<EmailTemplate>(5));

    } catch (error) {
      console.error('Critical error fetching data:', error);
      toastError('Error crítico al cargar datos.');
    } finally {
      setLoadingData(false);
    }
  }, [session, userRole, userId, toastError]); 

  useEffect(() => {
    if (session) {
        fetchData();
    }
  }, [session, fetchData]);

  // --- FUNCIONES DE MUTACIÓN LOCAL (OPTIMISTIC UI) ---

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
    loadingData,
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
    refetch: () => fetchData(true)
  };
};