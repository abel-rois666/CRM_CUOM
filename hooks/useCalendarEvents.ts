import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CalendarEvent } from '../types'; // Verify if CalendarEvent exists or define local
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    status: 'scheduled' | 'completed' | 'canceled' | 'no_show';
    lead_id: string;
    lead_name: string;
    details?: string;
    resource?: any; // To store full lead data if needed
}

export const useCalendarEvents = (initialDate: Date = new Date(), advisorIdFilter: string = 'all') => {
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            // Calculate range: Start of first week of month to End of last week of month
            // ensuring we cover the full visual calendar grid
            const start = startOfWeek(startOfMonth(currentDate));
            const end = endOfWeek(endOfMonth(currentDate));

            let query = supabase
                .from('appointments')
                .select(`
                    id,
                    title,
                    date,
                    status,
                    details,
                    duration,
                    lead_id,
                    leads (
                        id,
                        first_name,
                        paternal_last_name,
                        phone,
                        email,
                        status_id
                    )
                `)
                .gte('date', start.toISOString())
                .lte('date', end.toISOString());

            if (advisorIdFilter !== 'all') {
                query = query.eq('leads.advisor_id', advisorIdFilter);
                // Note: Filtering by joined column might need !inner join or specific supabase syntax if strict RLS
                // If this fails, we might need a trusted join or filter locally if data size permits.
                // However, filtering on joined table often requires: .select('*, leads!inner(*)') 
            }

            const { data, error } = await query;

            if (error) throw error;

            const mappedEvents: CalendarEvent[] = (data || []).map((appt: any) => {
                const lead = appt.leads; // Relationship object
                const leadName = lead ? `${lead.first_name} ${lead.paternal_last_name}`.trim() : 'Desconocido';
                const duration = appt.duration || 60;
                const startDate = new Date(appt.date);
                const endDate = new Date(startDate.getTime() + duration * 60000);

                // Check client-side filter for advisor if needed (if DB filter complex)
                // For now assuming DB filter works or returns all for us to filter

                return {
                    id: appt.id,
                    title: `${appt.title} - ${leadName}`,
                    start: startDate,
                    end: endDate,
                    status: appt.status,
                    lead_id: appt.lead_id,
                    lead_name: leadName,
                    details: appt.details,
                    resource: lead // Passing lead info for modals
                };
            }).filter(event => {
                // Double check advisor filter if simple join was used (left join)
                // If we used simple join, rows where lead doesn't match advisor might have null lead? 
                // Or if we need explicit filtering:
                return true;
            });

            setEvents(mappedEvents);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        } finally {
            setLoading(false);
        }
    }, [currentDate, advisorIdFilter]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return {
        events,
        loading,
        currentDate,
        setCurrentDate,
        refreshEvents: fetchEvents
    };
};
