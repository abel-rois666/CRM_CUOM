
import React, { useState } from 'react';
import CalendarIcon from './icons/CalendarIcon';
import BellAlertIcon from './icons/BellAlertIcon';
import ClockIcon from './icons/ClockIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import { DashboardStatsData } from '../hooks/useLeads';

export type QuickFilterType = 'appointments_today' | 'no_followup' | 'stale_followup' | null;

interface DashboardStatsProps {
    stats: DashboardStatsData | undefined;
    isLoading: boolean;
    activeFilter: QuickFilterType;
    onFilterChange: (filter: QuickFilterType) => void;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, isLoading, activeFilter, onFilterChange }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleCardClick = (filter: QuickFilterType) => {
        if (activeFilter === filter) {
            onFilterChange(null); // Toggle off
        } else {
            onFilterChange(filter);
        }
    };

    return (
        <div className="mb-6 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div 
                className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="text-lg font-semibold text-brand-primary flex items-center gap-2">
                    <span>📊</span> Resumen de Mi Día
                </h3>
                <button className="text-gray-500">
                    <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>
            
            {isExpanded && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                    {/* Card 1: Citas Hoy */}
                    <div 
                        onClick={() => handleCardClick('appointments_today')}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-between
                            ${activeFilter === 'appointments_today' 
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                                : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-md'
                            }`}
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Citas para Hoy</p>
                            <p className={`text-3xl font-bold ${activeFilter === 'appointments_today' ? 'text-blue-700' : 'text-gray-800'}`}>
                                {isLoading ? '...' : stats?.appointmentsToday || 0}
                            </p>
                        </div>
                        <div className={`p-3 rounded-full ${activeFilter === 'appointments_today' ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Card 2: Sin Seguimiento Reciente */}
                    <div 
                        onClick={() => handleCardClick('no_followup')}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-between
                            ${activeFilter === 'no_followup' 
                                ? 'border-red-500 bg-red-50 ring-2 ring-red-200' 
                                : 'border-gray-100 bg-white hover:border-red-300 hover:shadow-md'
                            }`}
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Sin Interacción (+3 días)</p>
                            <p className={`text-3xl font-bold ${activeFilter === 'no_followup' ? 'text-red-700' : 'text-gray-800'}`}>
                                {isLoading ? '...' : stats?.noFollowUp || 0}
                            </p>
                        </div>
                        <div className={`p-3 rounded-full ${activeFilter === 'no_followup' ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                            <BellAlertIcon className="w-6 h-6" />
                        </div>
                    </div>

                    {/* Card 3: Seguimiento Atrasado */}
                    <div 
                        onClick={() => handleCardClick('stale_followup')}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 flex items-center justify-between
                            ${activeFilter === 'stale_followup' 
                                ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' 
                                : 'border-gray-100 bg-white hover:border-amber-300 hover:shadow-md'
                            }`}
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Requieren Atención (+1 sem)</p>
                            <p className={`text-3xl font-bold ${activeFilter === 'stale_followup' ? 'text-amber-700' : 'text-gray-800'}`}>
                                {isLoading ? '...' : stats?.staleFollowUp || 0}
                            </p>
                        </div>
                        <div className={`p-3 rounded-full ${activeFilter === 'stale_followup' ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                            <ClockIcon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardStats;
