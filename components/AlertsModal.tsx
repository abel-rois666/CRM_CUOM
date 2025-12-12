import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Modal from './common/Modal';
import Button from './common/Button';
import CalendarIcon from './icons/CalendarIcon';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import ClockIcon from './icons/ClockIcon';
import { AlertsSummary, Profile } from '../types';
import { supabase } from '../lib/supabase';

interface AlertsModalProps {
    userProfile: Profile | null;
}

const AlertsModal: React.FC<AlertsModalProps> = ({ userProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [alerts, setAlerts] = useState<AlertsSummary | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userProfile) return;

        const checkAlerts = async () => {
            // Check if we already showed alerts this session to avoid annoyance
            // Using sessionStorage so it persists while tab is open but clears on restart
            const hasChecked = sessionStorage.getItem('alertschecked_' + userProfile.id);
            if (hasChecked) return;

            setLoading(true);
            try {
                const { data, error } = await (supabase as any)
                    .rpc('check_pending_alerts', { requesting_user_id: userProfile.id });

                if (error) throw error;

                // If user is Admin/Coordinator, data might be aggregated, but for now 
                // the RPC returns a simple structure for everyone.
                const result = data as AlertsSummary;

                if (result.hasAlerts) {
                    setAlerts(result);
                    setIsOpen(true);
                }

                // Mark as checked
                sessionStorage.setItem('alertschecked_' + userProfile.id, 'true');

            } catch (err) {
                console.error('Error checking alerts:', err);
            } finally {
                setLoading(false);
            }
        };

        checkAlerts();
    }, [userProfile]);

    const handleClose = () => {
        setIsOpen(false);
    };

    if (!alerts) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Resumen de Pendientes Diarios" maxWidth="max-w-md">
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                    Hola <strong>{userProfile?.first_name}</strong>, aquí tienes un resumen de tus prioridades para hoy:
                </p>

                <div className="grid grid-cols-1 gap-3">
                    {alerts.appointmentsCount > 0 && (
                        <div className="flex items-center p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
                            <CalendarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3" />
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white text-lg">{alerts.appointmentsCount}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Citas programadas para hoy</p>
                            </div>
                        </div>
                    )}

                    {alerts.overdueFollowupsCount > 0 && (
                        <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                            <ClockIcon className="w-8 h-8 text-red-600 dark:text-red-400 mr-3" />
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white text-lg">{alerts.overdueFollowupsCount}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Seguimientos vencidos (7+ días)</p>
                            </div>
                        </div>
                    )}

                    {alerts.untouchedLeadsCount > 0 && (
                        <div className="flex items-center p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
                            <ExclamationCircleIcon className="w-8 h-8 text-amber-600 dark:text-amber-400 mr-3" />
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white text-lg">{alerts.untouchedLeadsCount}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Leads nuevos sin atender (3+ días)</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <Button onClick={handleClose} className="w-full sm:w-auto">
                        Entendido, a trabajar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AlertsModal;
