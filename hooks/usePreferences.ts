import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UserPreferences } from '../types';

// Custom minimal debounce
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'system',
    lead_table_columns: [], // Empty means "default" logic in consumer
    pageSize: 50
};

export const usePreferences = () => {
    const { session, profile } = useAuth();
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        if (profile?.preferences) {
            setPreferences({ ...DEFAULT_PREFERENCES, ...profile.preferences });
            setLoading(false);
        } else if (session) {
            setLoading(false);
        }
    }, [profile, session]);

    // DB Update Function (Debounced)
    const debouncedUpdateRef = useRef(
        debounce(async (id: string, newPrefs: UserPreferences) => {
            try {
                // @ts-ignore - Supabase types might not reflect the new column yet
                const { error } = await supabase
                    .from('profiles')
                    .update({ preferences: newPrefs })
                    .eq('id', id);

                if (error) console.error('Error saving preferences:', error);
            } catch (err) {
                console.error('Error saving preferences:', err);
            }
        }, 1000)
    );

    const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
        if (!session?.user?.id) return;

        setPreferences(prev => {
            const newPrefs = { ...prev, ...updates };
            // Trigger background save
            debouncedUpdateRef.current(session.user.id, newPrefs);
            return newPrefs;
        });
    }, [session]);

    return {
        preferences,
        updatePreferences,
        loading
    };
};
