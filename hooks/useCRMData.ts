import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Lead, Profile, Status, Source, Licenciatura, WhatsAppTemplate, EmailTemplate } from '../types';
import { useToast } from '../context/ToastContext';

// CAMBIO: Ahora aceptamos role y userId para filtrar la consulta desde el origen
export const useCRMData = (session: Session | null, userRole?: 'admin' | 'advisor', userId?: string) => {
  const { error: toastError } = useToast();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [licenciaturas, setLicenciaturas] = useState<Licenciatura[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async () => {
    if (!session) return;
    
    setLoadingData(true);
    try {
      // 1. Construimos la consulta de Leads de forma dinámica
      let leadsQuery = supabase
        .from('leads')
        .select('*, appointments(*), follow_ups(*), status_history(*)');

      // FILTRO DE SEGURIDAD FRONTEND:
      // Si es asesor, forzamos la consulta para traer solo sus registros.
      // Esto actúa como doble verificación junto con el RLS del backend.
      if (userRole === 'advisor' && userId) {
          leadsQuery = leadsQuery.eq('advisor_id', userId);
      }

      // Ejecutamos las peticiones en paralelo
      const results = await Promise.allSettled([
        leadsQuery, // Usamos la consulta filtrada
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
        if (result.status === 'rejected') {
           console.warn(`Error fetching data at index ${index}:`, result.reason);
        } else if (result.status === 'fulfilled' && result.value.error) {
           if (result.value.error.code !== '42P01') {
             console.error(`Supabase error at index ${index}:`, result.value.error);
           }
        }
        return fallback;
      };

      setLeads(getData<Lead>(0));
      setProfiles(getData<Profile>(1));
      setStatuses(getData<Status>(2));
      setSources(getData<Source>(3));
      setLicenciaturas(getData<Licenciatura>(4));
      setWhatsappTemplates(getData<WhatsAppTemplate>(5));
      setEmailTemplates(getData<EmailTemplate>(6));

    } catch (error) {
      console.error('Critical error fetching data:', error);
      toastError('Error crítico al cargar datos.');
    } finally {
      setLoadingData(false);
    }
  }, [session, userRole, userId, toastError]); // Dependencias actualizadas

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateLocalLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
  };

  const addLocalLead = (newLead: Lead) => {
    setLeads(prev => [...prev, newLead]);
  };

  const removeLocalLead = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
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
    refetch: fetchData
  };
};