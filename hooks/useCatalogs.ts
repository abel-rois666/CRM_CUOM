
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Profile, Status, Source, Licenciatura, WhatsAppTemplate } from '../types';

interface CatalogsData {
  profiles: Profile[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
  whatsappTemplates: WhatsAppTemplate[];
}

export const useCatalogs = () => {
  return useQuery<CatalogsData>({
    queryKey: ['catalogs'],
    queryFn: async () => {
      const [
        { data: profiles, error: profilesError },
        { data: statuses, error: statusesError },
        { data: sources, error: sourcesError },
        { data: licenciaturas, error: licenciaturasError },
        { data: whatsappTemplates, error: templatesError },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('statuses').select('*'),
        supabase.from('sources').select('*'),
        supabase.from('licenciaturas').select('*'),
        supabase.from('whatsapp_templates').select('*').catch(() => ({ data: [], error: null })) // Graceful fail for templates
      ]);

      if (profilesError) throw profilesError;
      if (statusesError) throw statusesError;
      if (sourcesError) throw sourcesError;
      if (licenciaturasError) throw licenciaturasError;
      
      // Ignore templates error if table doesn't exist yet (dev env)
      if (templatesError && !templatesError.message.includes("does not exist")) throw templatesError;

      return {
        profiles: profiles || [],
        statuses: statuses || [],
        sources: sources || [],
        licenciaturas: licenciaturas || [],
        whatsappTemplates: whatsappTemplates || [],
      };
    },
    staleTime: Infinity, // Static data rarely changes, keep it fresh indefinitely until manual invalidation
  });
};
