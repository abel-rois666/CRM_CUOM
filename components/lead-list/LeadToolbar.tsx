import React from 'react';
import { StatusCategory } from '../../types';
import ListBulletIcon from '../icons/ListBulletIcon';
import Squares2x2Icon from '../icons/Squares2x2Icon';
import CalendarIcon from '../icons/CalendarIcon';
import FunnelIcon from '../icons/FunnelIcon';
import ArrowPathIcon from '../icons/ArrowPathIcon';
import MagnifyingGlassIcon from '../icons/MagnifyingGlassIcon';

export type ViewMode = 'list' | 'kanban' | 'calendar';

export type CalendarViewType = 'month' | 'week' | 'day' | 'agenda';

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
    currentCalendarView?: CalendarViewType;
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
    onCategoryTabChange,
    currentCalendarView = 'month'
}) => {
    const getCalendarTitle = () => {
        switch (currentCalendarView) {
            case 'month': return 'Vista de Calendario Mensual';
            case 'week': return 'Vista de Calendario Semanal';
            case 'day': return 'Vista de Calendario por Día';
            case 'agenda': return 'Vista de Agenda';
            default: return 'Vista de Calendario';
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-grow w-full sm:w-auto group">
                    {viewMode !== 'calendar' && (
                        <>
                            {isSearching ? (
                                <ArrowPathIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-secondary animate-spin" />
                            ) : (
                                <MagnifyingGlassIcon className="absolute top-1/2 left-3 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            )}

                            <input
                                type="text"
                                className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-brand-secondary/10 focus:border-brand-secondary transition-all text-sm"
                                placeholder="Buscar en el servidor (Nombre, Email, Tel)..."
                                value={localSearchTerm}
                                onChange={onSearchChange}
                            />
                        </>
                    )}
                    {viewMode === 'calendar' && (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-3 pl-2">
                            <CalendarIcon className="w-5 h-5 text-brand-secondary" />
                            <span className="text-sm font-medium">{getCalendarTitle()}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center w-full sm:w-auto gap-3 justify-between sm:justify-end">
                    {viewMode !== 'calendar' && (
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
                    )}

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
            {viewMode !== 'calendar' && (
                <div className="border-b border-gray-200 dark:border-slate-700">
                    <nav className="-mb-px flex w-full" aria-label="Tabs">
                        {[
                            { id: 'active', label: 'En Proceso', mobileLabel: 'Activos', color: 'border-brand-secondary text-brand-secondary dark:text-blue-400' },
                            { id: 'won', label: 'Inscritos', mobileLabel: 'Inscritos', color: 'border-green-500 text-green-600 dark:text-green-400' },
                            { id: 'lost', label: 'Bajas', mobileLabel: 'Bajas', color: 'border-red-500 text-red-600 dark:text-red-400' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => onCategoryTabChange(tab.id as StatusCategory)}
                                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-xs sm:text-sm transition-colors ${activeCategoryTab === tab.id ? tab.color : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600'}`}
                            >
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.mobileLabel}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            )}
        </div>
    );
};

export default LeadToolbar;
