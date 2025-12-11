import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';

export const useKanbanData = (filters: { advisorId: string; programId: string; searchTerm: string }, enabled: boolean = true) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLeads = useCallback(async () => {
        if (!enabled) return;

        setLoading(true);
        try {
            let query = supabase
                .from('leads')
                .select(`
                    id,
                    first_name,
                    paternal_last_name,
                    maternal_last_name,
                    email,
                    phone,
                    status_id,
                    advisor_id,
                    program_id,
                    registration_date,
                    appointments (
                        id,
                        date,
                        status,
                        title
                    ),
                    follow_ups (
                        id,
                        date,
                        notes
                    )
                `);

            // Apply Filters
            if (filters.advisorId !== 'all') {
                query = query.eq('advisor_id', filters.advisorId);
            }

            if (filters.programId !== 'all') {
                query = query.eq('program_id', filters.programId);
            }

            if (filters.searchTerm) {
                query = query.or(`first_name.ilike.%${filters.searchTerm}%,paternal_last_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%,phone.ilike.%${filters.searchTerm}%`);
            }

            // We do NOT apply pagination (range) here, as Kanban needs all relevant leads
            // But we might want to put a safe hard limit if the DB is huge, e.g., 1000
            query = query.limit(1000);

            const { data, error } = await query;

            if (error) throw error;

            setLeads(data as any[] || []);
        } catch (error) {
            console.error('Error fetching kanban leads:', error);
        } finally {
            setLoading(false);
        }
    }, [filters.advisorId, filters.programId, filters.searchTerm, enabled]);

    useEffect(() => {
        if (enabled) {
            fetchLeads();
        }
    }, [fetchLeads, enabled]);

    const updateLocalLead = (leadId: string, updates: Partial<Lead>) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates } : l));
    };

    return {
        leads,
        loading,
        refreshKanban: fetchLeads,
        updateLocalLead
    };
};
