
import React, { useState, useMemo } from 'react';
import { Lead, Status, Profile } from '../types';
import CalendarIcon from './icons/CalendarIcon';
import BellAlertIcon from './icons/BellAlertIcon';
import ClockIcon from './icons/ClockIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import ListBulletIcon from './icons/ListBulletIcon';

export type QuickFilterType = 'appointments_today' | 'no_followup' | 'stale_followup' | null;

interface DashboardStatsProps {
    leads: Lead[];
    statuses: Status[];
    advisors: Profile[];
    activeFilter: QuickFilterType;
    onFilterChange: (filter: QuickFilterType) => void;
}

const tailwindColorMap: { [key: string]: string } = {
    'bg-slate-500': '#64748b', 'bg-gray-500': '#6b7280', 'bg-zinc-500': '#71717a',
    'bg-neutral-500': '#737373', 'bg-stone-500': '#78716c', 'bg-red-500': '#ef4444',
    'bg-orange-500': '#f97316', 'bg-amber-500': '#f59e0b', 'bg-yellow-500': '#eab308',
    'bg-lime-500': '#84cc16', 'bg-green-500': '#22c55e', 'bg-emerald-500': '#10b981',
    'bg-teal-500': '#14b8a6', 'bg-cyan-500': '#06b6d4', 'bg-sky-500': '#0ea5e9',
    'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1', 'bg-violet-500': '#8b5cf6',
    'bg-purple-500': '#a855f7', 'bg-fuchsia-500': '#d946ef', 'bg-pink-500': '#ec4899',
    'bg-rose-500': '#f43f5e'
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ leads, statuses, advisors, activeFilter, onFilterChange }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState<'agenda' | 'analytics'>('agenda');

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let appointmentsToday = 0;
        let noFollowUp = 0;
        let staleFollowUp = 0;
        let newLeadsToday = 0;

        const statusCounts: Record<string, number> = {};
        const advisorCounts: Record<string, number> = {};

        leads.forEach(lead => {
            // 1. Citas para hoy
            const hasAppointmentToday = lead.appointments?.some(appt => {
                const apptDate = new Date(appt.date);
                apptDate.setHours(0,0,0,0);
                return appt.status === 'scheduled' && apptDate.getTime() === today.getTime();
            });
            if (hasAppointmentToday) appointmentsToday++;

            // 2. Sin seguimiento (> 3 días desde registro y 0 follow ups)
            const regDate = new Date(lead.registration_date);
            const regDateZero = new Date(lead.registration_date);
            regDateZero.setHours(0,0,0,0);

            const hasNoFollowUps = !lead.follow_ups || lead.follow_ups.length === 0;
            if (hasNoFollowUps && regDate < threeDaysAgo) {
                noFollowUp++;
            }

            // 3. Seguimiento Atrasado
            if (lead.follow_ups && lead.follow_ups.length > 0) {
                const lastFollowUp = [...lead.follow_ups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                const lastDate = new Date(lastFollowUp.date);
                if (lastDate < sevenDaysAgo) {
                    staleFollowUp++;
                }
            }

            // 4. Analytics: Nuevos Hoy
            if (regDateZero.getTime() === today.getTime()) {
                newLeadsToday++;
            }

            // 5. Analytics: Status Distribution
            statusCounts[lead.status_id] = (statusCounts[lead.status_id] || 0) + 1;

            // 6. Analytics: Advisor Distribution
            advisorCounts[lead.advisor_id] = (advisorCounts[lead.advisor_id] || 0) + 1;
        });

        // Format Status Data
        const statusData = statuses.map(s => ({
            name: s.name,
            color: s.color,
            count: statusCounts[s.id] || 0
        })).filter(s => s.count > 0).sort((a,b) => b.count - a.count);

        // Format Advisor Data
        const advisorData = advisors.map(a => ({
            name: a.full_name,
            count: advisorCounts[a.id] || 0
        })).filter(a => a.count > 0).sort((a,b) => b.count - a.count);

        return { 
            appointmentsToday, 
            noFollowUp, 
            staleFollowUp,
            totalLeads: leads.length,
            newLeadsToday,
            statusData,
            advisorData
        };
    }, [leads, statuses, advisors]);

    const handleCardClick = (filter: QuickFilterType) => {
        if (activeFilter === filter) {
            onFilterChange(null); // Toggle off
        } else {
            onFilterChange(filter);
        }
    };

    // Helper for Pie Chart Gradient
    const getPieGradient = () => {
        const total = stats.statusData.reduce((sum, item) => sum + item.count, 0);
        let cumulativePercentage = 0;
        const stops = stats.statusData.map(item => {
            const percentage = (item.count / total) * 100;
            const start = cumulativePercentage;
            cumulativePercentage += percentage;
            const end = cumulativePercentage;
            const color = tailwindColorMap[item.color] || '#cccccc';
            return `${color} ${start}% ${end}%`;
        });
        return `conic-gradient(${stops.join(', ')})`;
    };

    return (
        <div className="mb-6 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <div className="flex space-x-2">
                     <button 
                        onClick={() => setActiveTab('agenda')}
                        className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === 'agenda' ? 'border-brand-secondary text-brand-secondary bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <ListBulletIcon className="w-4 h-4"/>
                            Mi Agenda
                        </div>
                    </button>
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === 'analytics' ? 'border-brand-secondary text-brand-secondary bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <ChartBarIcon className="w-4 h-4"/>
                            Vista General
                        </div>
                    </button>
                </div>
                <button className="text-gray-500 p-1 hover:bg-gray-200 rounded" onClick={() => setIsExpanded(!isExpanded)}>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>
            
            {isExpanded && (
                <div className="p-4 animate-fade-in">
                    {activeTab === 'agenda' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                        {stats.appointmentsToday}
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
                                        {stats.noFollowUp}
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
                                        {stats.staleFollowUp}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-full ${activeFilter === 'stale_followup' ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <ClockIcon className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Analytics View */
                        <div className="space-y-6">
                            {/* KPIs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-brand-primary/5 p-4 rounded-lg border border-brand-primary/10">
                                    <p className="text-xs font-bold text-brand-primary uppercase tracking-wide">Total Leads</p>
                                    <p className="text-3xl font-extrabold text-brand-primary">{stats.totalLeads}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Nuevos Hoy</p>
                                    <p className="text-3xl font-extrabold text-green-700">+{stats.newLeadsToday}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Pie Chart - Status */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-4">Distribución por Estado</h4>
                                    <div className="flex items-start gap-6">
                                        {stats.statusData.length > 0 ? (
                                            <div 
                                                className="w-32 h-32 rounded-full flex-shrink-0 border-4 border-white shadow-sm"
                                                style={{ background: getPieGradient() }}
                                            ></div>
                                        ) : (
                                            <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">Sin datos</div>
                                        )}
                                        <ul className="space-y-1 flex-1 max-h-40 overflow-y-auto text-xs custom-scrollbar pr-2">
                                            {stats.statusData.map(item => (
                                                <li key={item.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                                                        <span className="text-gray-600 truncate max-w-[100px]">{item.name}</span>
                                                    </div>
                                                    <span className="font-semibold">{item.count}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Bar Chart - Advisors */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-4">Leads por Asesor</h4>
                                    <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                        {stats.advisorData.map(item => {
                                            const max = stats.advisorData[0]?.count || 1;
                                            const width = (item.count / max) * 100;
                                            return (
                                                <div key={item.name}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-600">{item.name}</span>
                                                        <span className="font-semibold">{item.count}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                                        <div 
                                                            className="bg-brand-secondary h-2 rounded-full" 
                                                            style={{ width: `${width}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {stats.advisorData.length === 0 && <p className="text-xs text-gray-400 italic">Sin datos</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardStats;
