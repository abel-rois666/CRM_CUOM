// hooks/useCRMData.ts
import { useState, useEffect, useCallback } from 'react';
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
  
  // Iniciamos true solo para la primera carga
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    if (!session) return;
    
    // CAMBIO CLAVE: Solo ponemos loading en true si NO es una actualización de fondo
    // y si no tenemos datos aún. Esto evita el "parpadeo" al cambiar de pestaña.
    if (!isBackgroundRefresh && leads.length === 0) {
        setLoadingData(true);
    }

    try {
      // 1. Construimos la consulta de Leads
      let leadsQuery = supabase
        .from('leads')
        .select(`
            *, 
            appointments(*, created_by(full_name)), 
            follow_ups(*, created_by(full_name)), 
            status_history(*, created_by(full_name))
        `);

      // Filtro de seguridad (aunque RLS ya protege, esto optimiza la query)
      if (userRole === 'advisor' && userId) {
          leadsQuery = leadsQuery.eq('advisor_id', userId);
      }

      // Ejecutamos peticiones
      const results = await Promise.allSettled([
        leadsQuery,
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

      // Actualizamos estado (React solo re-renderizará si los datos son diferentes)
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
  }, [session, userRole, userId, toastError]); // Dependencias

  useEffect(() => {
    // Al montar o cambiar sesión, verificamos si ya tenemos datos para decidir el tipo de carga
    const hasData = leads.length > 0;
    fetchData(hasData); 
  }, [fetchData]); // Quitamos leads.length de dependencias para evitar loop, fetchData ya lo maneja

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
    refetch: () => fetchData(true) // Refetch manual siempre en background
  };
};