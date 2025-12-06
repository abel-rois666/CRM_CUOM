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

    // 1. Carga inicial
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    // 2. Suscripción Realtime
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
          // Alerta visual tipo Toast
          info(`🔔 ${newNotif.title}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, info]);

  const markAsRead = async (id: string) => {
    // Actualización optimista
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
};