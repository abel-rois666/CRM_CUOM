// components/common/Modal.tsx
import React from 'react';
import XIcon from '../icons/XIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex sm:justify-center sm:items-center p-0 sm:p-6"
        aria-labelledby="modal-title" 
        role="dialog" 
        aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Panel del Modal (Modo Oscuro Agregado) */}
      <div className={`
        relative bg-white dark:bg-slate-800 shadow-2xl flex flex-col border border-gray-100 dark:border-slate-700 animate-scale-in
        w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:w-full ${sizeClasses[size]} transition-colors duration-300
      `}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 sm:rounded-t-2xl flex-shrink-0 transition-colors duration-300">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white" id="modal-title">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors bg-gray-50 dark:bg-slate-700/50 sm:bg-transparent"
            aria-label="Cerrar"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 overscroll-contain text-gray-700 dark:text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;