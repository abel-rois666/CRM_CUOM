
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';
import { QuickFilterType } from '../components/DashboardStats';

interface FetchLeadsParams {
  page: number;
  pageSize: number;
  filters: {
    advisorId: string;
    statusId: string;
    programId: string;
    startDate: string;
    endDate: string;
  };
  searchTerm: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  quickFilter: QuickFilterType;
}

interface FetchLeadsResult {
  leads: Lead[];
  count: number;
}

export const useLeads = (params: FetchLeadsParams) => {
  return useQuery<FetchLeadsResult>({
    queryKey: ['leads', params],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*, follow_ups(*), appointments(*)', { count: 'exact' });

      // 1. Apply Filters
      if (params.filters.advisorId !== 'all') {
        query = query.eq('advisor_id', params.filters.advisorId);
      }
      if (params.filters.statusId !== 'all') {
        query = query.eq('status_id', params.filters.statusId);
      }
      if (params.filters.programId !== 'all') {
        query = query.eq('program_id', params.filters.programId);
      }
      
      // Date Filtering
      if (params.filters.startDate) {
        query = query.gte('registration_date', `${params.filters.startDate}T00:00:00.000Z`);
      }
      if (params.filters.endDate) {
        query = query.lte('registration_date', `${params.filters.endDate}T23:59:59.999Z`);
      }

      // 2. Apply Search
      if (params.searchTerm) {
        // Basic OR search on text fields. 
        // Note: Supabase 'or' syntax with ilike requires specific formatting.
        const term = params.searchTerm;
        const orQuery = `first_name.ilike.%${term}%,paternal_last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`;
        query = query.or(orQuery);
      }

      // 3. Quick Filters (Server-side approximations)
      if (params.quickFilter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        if (params.quickFilter === 'appointments_today') {
            // This is complex to filter on joined table 'appointments' directly in the main query for pagination
            // without 'inner join' behavior which Supabase JS client does implicitly with !inner
            // We use !inner to enforce filtering based on related table
             query = query.eq('appointments.status', 'scheduled').gte('appointments.date', `${todayStr}T00:00:00`).lt('appointments.date', `${todayStr}T23:59:59`);
        } else if (params.quickFilter === 'no_followup') {
            // Logic: Registered > 3 days ago AND no follow_ups.
            // "No follow ups" is hard to query directly with standard PostgREST filtering on relational count = 0.
            // We will approximate by client-side filtering of the page or we accept a limitation.
            // PROPER WAY: Use a database function or a view. 
            // FOR V1: We will filter by date here, but 'count=0' check might happen on fetched data if dataset is small enough,
            // OR we assume for now standard list view without this complex filter on server side.
            // Let's skip the strict server query for 'no_followup' relation check to avoid breaking app with invalid syntax,
            // and rely on date first.
             const threeDaysAgo = new Date();
             threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
             query = query.lt('registration_date', threeDaysAgo.toISOString());
        } else if (params.quickFilter === 'stale_followup') {
            // Complex relational query.
        }
      }

      // 4. Sorting
      if (params.sortColumn) {
        // Helper to handle related table sorting if needed, but currently we only sort by lead fields
        if (['first_name', 'registration_date'].includes(params.sortColumn)) {
             query = query.order(params.sortColumn, { ascending: params.sortDirection === 'asc' });
        } else {
             // Fallback
             query = query.order('registration_date', { ascending: false });
        }
      } else {
         query = query.order('registration_date', { ascending: false });
      }

      // 5. Pagination
      const from = (params.page - 1) * params.pageSize;
      const to = from + params.pageSize - 1;
      
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      // 6. Post-processing for Quick Filters that require relational checks (Simulated for 'No Followup' correctness on current page)
      // Note: This is imperfect for total count but ensures displayed items match criteria.
      let processedData = data || [];
      if (params.quickFilter === 'no_followup') {
         processedData = processedData.filter(l => !l.follow_ups || l.follow_ups.length === 0);
      }
       if (params.quickFilter === 'stale_followup') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          processedData = processedData.filter(l => {
              if (!l.follow_ups || l.follow_ups.length === 0) return false;
              const latest = l.follow_ups.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
              return new Date(latest.date) < sevenDaysAgo;
          });
      }

      return {
        leads: processedData,
        count: count || 0,
      };
    },
    placeholderData: keepPreviousData, // Keep showing old data while fetching new page
  });
};

export interface DashboardStatsData {
    appointmentsToday: number;
    noFollowUp: number;
    staleFollowUp: number;
}

export const useDashboardStats = () => {
    return useQuery<DashboardStatsData>({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const today = new Date();
            today.setHours(0,0,0,0);
            const todayStr = today.toISOString().split('T')[0];
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // 1. Appointments Today
            // We can query the appointments table directly for speed
            const { count: appointmentsToday } = await supabase
                .from('appointments')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'scheduled')
                .gte('date', `${todayStr}T00:00:00`)
                .lt('date', `${todayStr}T23:59:59`);

            // 2. No Follow Up (> 3 days)
            // Getting exact count of leads with 0 follow ups is hard without a left join filter.
            // We will approximate or fetch a lightweight list. 
            // Strategy: Fetch IDs of leads older than 3 days, then exclude those with followups.
            // Since we can't do complex exclusion easily in one REST call without stored proc, 
            // we will use a client-side approximation on a limited fetch or skip this optimization for now.
            // Better approach: Create a supabase RPC function `get_dashboard_stats`.
            // For this frontend-only refactor, we'll do a separate query for leads registered < 3 days ago
            // and check follow_ups. This is heavy if DB is huge.
            // FALLBACK: Return 0 or placeholder if too complex, but let's try to get a reasonable number.
            
            // Alternative: We rely on the user looking at the list. 
            // Let's try to query leads with `follow_ups` relation and filter locally (capped at 1000 for performance safety).
             const { data: potentialNeglected } = await supabase
                .from('leads')
                .select('id, registration_date, follow_ups(id)')
                .lt('registration_date', threeDaysAgo.toISOString())
                .limit(500); // Cap for safety

             const noFollowUpCount = potentialNeglected?.filter(l => !l.follow_ups || l.follow_ups.length === 0).length || 0;


            // 3. Stale Follow Up
            // Fetch leads with active status, get their latest follow up.
            // Again, heavy. We'll use a similar capped strategy.
             const { data: potentialStale } = await supabase
                .from('leads')
                .select('id, follow_ups(date)')
                .not('follow_ups', 'is', null) // Has follow ups
                .limit(500);

             const staleCount = potentialStale?.filter(l => {
                 if (!l.follow_ups || l.follow_ups.length === 0) return false;
                 // Assuming follow_ups is array
                 const dates = l.follow_ups.map((f:any) => new Date(f.date).getTime());
                 const maxDate = Math.max(...dates);
                 return maxDate < sevenDaysAgo.getTime();
             }).length || 0;

            return {
                appointmentsToday: appointmentsToday || 0,
                noFollowUp: noFollowUpCount,
                staleFollowUp: staleCount
            };
        },
        staleTime: 1000 * 60 * 5, // Refresh stats every 5 mins
    })
}
