import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface OrganizationSettings {
    id: string;
    company_name: string;
    company_subtitle: string;
    logo_url: string | null;
}

interface ConfigContextType {
    settings: OrganizationSettings;
    updateSettings: (newSettings: Partial<OrganizationSettings>) => Promise<void>;
    loading: boolean;
}

const defaultSettings: OrganizationSettings = {
    id: '',
    company_name: 'CUOM CRM',
    company_subtitle: 'Administración',
    logo_url: null,
};

const ConfigContext = createContext<ConfigContextType>({
    settings: defaultSettings,
    updateSettings: async () => { },
    loading: true,
});

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<OrganizationSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('*')
                .select('*')
                .limit(1)
                .single(); // [FIX] Use limit(1).single() to handle duplicates gracefully

            if (error) {
                console.error('Error fetching org settings:', error);
            } else if (data) {
                setSettings(data);
            } else {
                // No settings found, insert default row to avoid future checks
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, ...defaultsToInsert } = defaultSettings;
                const { error: insertError, data: newSetting } = await supabase
                    .from('organization_settings')
                    .insert([defaultsToInsert])
                    .select()
                    .single();

                if (!insertError && newSetting) {
                    setSettings(newSetting);
                }
            }
        } catch (err) {
            console.error('Unexpected error fetching settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<OrganizationSettings>) => {
        try {
            // Optimistic update
            setSettings(prev => ({ ...prev, ...newSettings }));

            // Check if row exists, if not insert, else update
            // Ideally we assume row exists or we upsert. 
            // Since we might not have an ID if it was default, let's check.

            const { data: existing } = await supabase.from('organization_settings').select('id').single();

            if (existing) {
                const { error } = await supabase
                    .from('organization_settings')
                    .update(newSettings)
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('organization_settings')
                    .insert([newSettings]);
                if (error) throw error;
                // Re-fetch to get ID
                fetchSettings();
            }

        } catch (error) {
            console.error('Error updating settings:', error);
            // Revert on error could be implemented here
            fetchSettings();
        }
    };

    useEffect(() => {
        fetchSettings();

        // Subscribe to changes
        const channel = supabase
            .channel('org_settings_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'organization_settings' },
                (payload) => {
                    if (payload.new) {
                        setSettings(payload.new as OrganizationSettings);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <ConfigContext.Provider value={{ settings, updateSettings, loading }}>
            {children}
        </ConfigContext.Provider>
    );
};
