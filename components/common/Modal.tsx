// components/common/Modal.tsx
import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import XIcon from '../icons/XIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  resizable?: boolean; // New prop
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', resizable }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number | string; height: number | string } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Determine if resizable should be enabled (default to true for non-small modals if not specified)
  const isResizable = resizable ?? (size !== 'sm');

  // Reset dimensions when modal opens or size changes
  useEffect(() => {
    if (isOpen) {
      setDimensions(null);
    }
  }, [isOpen, size]);

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (modalRef.current) {
        // Calculate new dimensions based on mouse position relative to modal rect
        // We use clientX/Y to allow resizing even if stored dimensions are null initially
        const rect = modalRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const newHeight = e.clientY - rect.top;

        // Min dimensions to prevent breaking UI
        if (newWidth > 300 && newHeight > 200) {
          setDimensions({ width: newWidth, height: newHeight });
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);


  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    '6xl': 'sm:max-w-6xl',
    '7xl': 'sm:max-w-7xl',
    'full': 'sm:max-w-[95vw]',
  };

  // If we have custom dimensions, we override the width classes with inline styles.
  // We remove the default size class if resizing has occurred to allow growth.
  // If no dimensions set, we user standard classes.
  const appliedSizeClass = dimensions ? '' : sizeClasses[size];

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
      <div
        ref={modalRef}
        style={dimensions ? { width: dimensions.width, height: dimensions.height, maxWidth: '95vw', maxHeight: '95vh' } : {}}
        className={`
        relative bg-white dark:bg-slate-800 shadow-2xl flex flex-col border border-gray-100 dark:border-slate-700 animate-scale-in
        w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:w-full ${appliedSizeClass} transition-colors duration-300
      `}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 sm:rounded-t-2xl flex-shrink-0 transition-colors duration-300 select-none">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white" id="modal-title">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="sr-only">Cerrar</span>
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar dark:text-gray-300">
          {children}
        </div>

        {/* Resize Handle (Only Visible on Desktop if resizable) */}
        {isResizable && (
          <div
            className="hidden sm:block absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 rounded-br-2xl group"
            onMouseDown={handleMouseDown}
          >
            {/* Visual Grip Indicator */}
            <svg className="absolute bottom-1 right-1 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v6" />
              <path d="M15 21h6" />
              <path d="M21 9v2" />
              <path d="M9 21h2" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;