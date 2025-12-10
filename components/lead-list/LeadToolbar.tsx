import React from 'react';
import { StatusCategory } from '../../types';
import ListBulletIcon from '../icons/ListBulletIcon';
import Squares2x2Icon from '../icons/Squares2x2Icon';
import CalendarIcon from '../icons/CalendarIcon';
import FunnelIcon from '../icons/FunnelIcon';
import ArrowPathIcon from '../icons/ArrowPathIcon';
import MagnifyingGlassIcon from '../icons/MagnifyingGlassIcon';

export type ViewMode = 'list' | 'kanban' | 'calendar';

interface LeadToolbarProps {
    localSearchTerm: string;
    isSearching: boolean;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    activeFilterCount: number;
    onToggleFilters: () => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    activeCategoryTab: StatusCategory;
    onCategoryTabChange: (category: StatusCategory) => void;
}

const LeadToolbar: React.FC<LeadToolbarProps> = ({
    localSearchTerm,
    isSearching,
    onSearchChange,
    activeFilterCount,
    onToggleFilters,
    viewMode,
    onViewModeChange,
    activeCategoryTab,
    onCategoryTabChange
}) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-grow w-full sm:w-auto group">

                    {isSearching ? (
                        // Icono de carga (Spinner) - Se muestra si hay texto
                        <ArrowPathIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-secondary animate-spin" />
                    ) : (
                        // Icono de lupa - Se muestra si el campo está vacío
                        <MagnifyingGlassIcon className="absolute top-1/2 left-1/45 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}

                    <input
                        type="text"
                        className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-brand-secondary/10 focus:border-brand-secondary transition-all text-sm"
                        placeholder="Buscar en el servidor (Nombre, Email, Tel)..."
                        value={localSearchTerm}
                        onChange={onSearchChange}
                    />
                </div>

                <div className="flex items-center w-full sm:w-auto gap-3 justify-between sm:justify-end">
                    <button
                        onClick={onToggleFilters}
                        className={`relative inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${activeFilterCount > 0
                            ? 'bg-brand-secondary/10 text-brand-secondary ring-1 ring-brand-secondary/20 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                            }`}
                    >
                        <FunnelIcon className="w-4 h-4 mr-2" />
                        Filtros
                        {activeFilterCount > 0 && <span className="ml-2 bg-brand-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
                    </button>

                    <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>

                    <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg flex items-center gap-1">
                        <button onClick={() => onViewModeChange('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => onViewModeChange('kanban')} className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Squares2x2Icon className="w-5 h-5" />
                        </button>
                        <button onClick={() => onViewModeChange('calendar')} className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                            <CalendarIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs de Estado */}
            <div className="border-b border-gray-200 dark:border-slate-700 overflow-x-auto scrollbar-hide">
                <nav className="-mb-px flex space-x-8 px-2 min-w-max" aria-label="Tabs">
                    {[
                        { id: 'active', label: 'En Proceso (Activos)', color: 'border-brand-secondary text-brand-secondary dark:text-blue-400' },
                        { id: 'won', label: 'Inscritos (Ganados)', color: 'border-green-500 text-green-600 dark:text-green-400' },
                        { id: 'lost', label: 'Bajas / Archivo', color: 'border-red-500 text-red-600 dark:text-red-400' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => onCategoryTabChange(tab.id as StatusCategory)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeCategoryTab === tab.id ? tab.color : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default LeadToolbar;
