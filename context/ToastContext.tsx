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
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
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
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[300px] max-w-md bg-white shadow-lg rounded-lg flex items-start p-4 border-l-4 animate-fade-in transition-all transform ${
              toast.type === 'success' ? 'border-green-500' :
              toast.type === 'error' ? 'border-red-500' :
              'border-blue-500'
            }`}
          >
            <div className="flex-shrink-0 mr-3">
              {toast.type === 'success' && <CheckCircleIcon className="w-6 h-6 text-green-500" />}
              {toast.type === 'error' && <ExclamationCircleIcon className="w-6 h-6 text-red-500" />}
              {toast.type === 'info' && <InformationCircleIcon className="w-6 h-6 text-blue-500" />}
            </div>
            <div className="flex-1 text-sm font-medium text-gray-800 pt-0.5">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
