// components/common/EmptyState.tsx
import React from 'react';
import PlusIcon from '../icons/PlusIcon';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, actionLabel, onAction }) => {
return (
    <div className="text-center py-12 px-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center group hover:border-brand-secondary/30 transition-colors">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">        {icon || (
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-6">{description}</p>
      
      {actionLabel && onAction && (
        <button 
            onClick={onAction}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-brand-secondary bg-brand-secondary/10 hover:bg-brand-secondary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition-colors"
        >
            <PlusIcon className="w-4 h-4 mr-2" />
            {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;