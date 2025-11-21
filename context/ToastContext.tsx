// context/ToastContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import CheckCircleIcon from '../components/icons/CheckCircleIcon';
import ExclamationCircleIcon from '../components/icons/ExclamationCircleIcon';
import InformationCircleIcon from '../components/icons/InformationCircleIcon';
import XIcon from '../components/icons/XIcon';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000); // Un poco más de tiempo para leer
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast('success', message), [addToast]);
  const error = useCallback((message: string) => addToast('error', message), [addToast]);
  const info = useCallback((message: string) => addToast('info', message), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info, removeToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto min-w-[320px] max-w-md bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-4 animate-slide-up border border-gray-100 flex items-start gap-3 transform transition-all duration-300 hover:scale-[1.02]"
          >
            {/* Icono con fondo suave */}
            <div className={`flex-shrink-0 p-1.5 rounded-full ${
                toast.type === 'success' ? 'bg-green-100 text-green-600' :
                toast.type === 'error' ? 'bg-red-100 text-red-600' :
                'bg-blue-100 text-blue-600'
            }`}>
              {toast.type === 'success' && <CheckCircleIcon className="w-5 h-5" />}
              {toast.type === 'error' && <ExclamationCircleIcon className="w-5 h-5" />}
              {toast.type === 'info' && <InformationCircleIcon className="w-5 h-5" />}
            </div>

            <div className="flex-1 pt-1">
                <p className="text-sm font-medium text-gray-800 leading-snug">
                    {toast.message}
                </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors -mt-1 -mr-1"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};