// hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import { useToast } from '../context/ToastContext';

export const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { info } = useToast();

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    const init = async () => {
      // 1. Check System Settings
      let enabled = true;
      const { data: settings } = await (supabase as any).from('system_settings').select('value').eq('key', 'notifications_enabled').single();
      if (settings) {
        try {
          enabled = JSON.parse(settings.value);
        } catch (e) { console.error(e); }
      }

      if (!enabled && mounted) {
        return; // Notifications disabled globally
      }

      // 2. Carga inicial
      const { data } = await (supabase.from('notifications') as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && mounted) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }

      // 3. Suscripción Realtime
      const channel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            info(`🔔 ${newNotif.title}`);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    init();

    return () => {
      mounted = false;
    };
  }, [userId, info]);

  const markAsRead = async (id: string) => {
    // Actualización optimista
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    // SOLUCIÓN FINAL: Casteamos la tabla entera a 'any'.
    // Esto desconecta la validación estricta de tipos para esta línea.
    await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    // SOLUCIÓN FINAL: Casteamos la tabla entera a 'any'.
    await (supabase.from('notifications') as any).update({ is_read: true }).in('id', unreadIds);
  };

  const deleteNotification = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notifications.find(n => n.id === id && !n.is_read)) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Casteo a 'any' para evitar chequeo estricto de tipos
    await (supabase.from('notifications') as any).delete().eq('id', id);
    info('Notificación eliminada');
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};