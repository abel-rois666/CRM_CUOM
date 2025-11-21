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

      {/* Panel del Modal: 
          Móvil: w-full h-full rounded-none (Pantalla completa)
          Escritorio (sm): redondeado, altura auto, centrado
      */}
      <div className={`
        relative bg-white shadow-2xl flex flex-col border border-gray-100 animate-scale-in
        w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:w-full ${sizeClasses[size]}
      `}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white sm:rounded-t-2xl flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-800" id="modal-title">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors bg-gray-50 sm:bg-transparent"
            aria-label="Cerrar"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;