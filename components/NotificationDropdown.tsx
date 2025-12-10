// components/NotificationDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import BellAlertIcon from './icons/BellAlertIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import TrashIcon from './icons/TrashIcon';
import { useNotifications } from '../hooks/useNotifications';
// import { Notification } from '../types'; // No se usa explícitamente en el render, se infiere

interface NotificationDropdownProps {
  userId: string | undefined;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(userId);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />;
      case 'warning': return <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />;
      case 'error': return <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />;
      default: return <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:bg-white/20 rounded-xl transition-all outline-none focus:ring-2 focus:ring-white/30"
      >
        <BellAlertIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-brand-secondary rounded-full animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50 animate-scale-in origin-top-right transition-colors duration-200">
          <div className="p-4 border-b border-gray-50 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-brand-secondary dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
              >
                <CheckCircleIcon className="w-3 h-3" /> Marcar leídas
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                <BellAlertIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No tienes notificaciones nuevas</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors relative group ${!notif.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex gap-3 items-start">
                      {getIcon(notif.type)}
                      <div className="flex-1 pr-6 cursor-pointer">
                        <p className={`text-sm ${!notif.is_read ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-medium">
                          {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Botón Eliminar - Visible en hover/group */}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Eliminar notificación"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>

                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-brand-secondary dark:bg-blue-500 rounded-full absolute right-4 top-10 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity"></div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;