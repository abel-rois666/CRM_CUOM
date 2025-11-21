// components/DashboardStats.tsx
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
            // 1. Citas
            const hasAppointmentToday = lead.appointments?.some(appt => {
                const apptDate = new Date(appt.date);
                apptDate.setHours(0,0,0,0);
                return appt.status === 'scheduled' && apptDate.getTime() === today.getTime();
            });
            if (hasAppointmentToday) appointmentsToday++;

            // 2. Sin seguimiento
            const regDate = new Date(lead.registration_date);
            const regDateZero = new Date(lead.registration_date);
            regDateZero.setHours(0,0,0,0);
            const hasNoFollowUps = !lead.follow_ups || lead.follow_ups.length === 0;
            if (hasNoFollowUps && regDate < threeDaysAgo) noFollowUp++;

            // 3. Stale
            if (lead.follow_ups && lead.follow_ups.length > 0) {
                const lastFollowUp = [...lead.follow_ups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                if (new Date(lastFollowUp.date) < sevenDaysAgo) staleFollowUp++;
            }

            // 4. Analytics
            if (regDateZero.getTime() === today.getTime()) newLeadsToday++;
            statusCounts[lead.status_id] = (statusCounts[lead.status_id] || 0) + 1;
            advisorCounts[lead.advisor_id] = (advisorCounts[lead.advisor_id] || 0) + 1;
        });

        const statusData = statuses.map(s => ({ name: s.name, color: s.color, count: statusCounts[s.id] || 0 })).filter(s => s.count > 0).sort((a,b) => b.count - a.count);
        const advisorData = advisors.map(a => ({ name: a.full_name, count: advisorCounts[a.id] || 0 })).filter(a => a.count > 0).sort((a,b) => b.count - a.count);

        return { appointmentsToday, noFollowUp, staleFollowUp, totalLeads: leads.length, newLeadsToday, statusData, advisorData };
    }, [leads, statuses, advisors]);

    const handleCardClick = (filter: QuickFilterType) => {
        onFilterChange(activeFilter === filter ? null : filter);
    };

    const getPieGradient = () => {
        const total = stats.statusData.reduce((sum, item) => sum + item.count, 0);
        let cumulative = 0;
        const stops = stats.statusData.map(item => {
            const pct = (item.count / total) * 100;
            const start = cumulative;
            cumulative += pct;
            return `${tailwindColorMap[item.color] || '#ccc'} ${start}% ${cumulative}%`;
        });
        return `conic-gradient(${stops.join(', ')})`;
    };

    return (
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl">
                     <button 
                        onClick={() => setActiveTab('agenda')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'agenda' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <ListBulletIcon className="w-4 h-4"/>
                            Agenda
                        </div>
                    </button>
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <ChartBarIcon className="w-4 h-4"/>
                            Métricas
                        </div>
                    </button>
                </div>
                <button className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>
            
            {isExpanded && (
                <div className="p-6 animate-fade-in bg-gray-50/30">
                    {activeTab === 'agenda' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Citas Hoy */}
                            <div 
                                onClick={() => handleCardClick('appointments_today')}
                                className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 group
                                    ${activeFilter === 'appointments_today' 
                                        ? 'bg-white ring-2 ring-blue-500 shadow-lg shadow-blue-100' 
                                        : 'bg-white border border-gray-100 hover:shadow-lg hover:-translate-y-1'
                                    }`}
                            >
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 mb-2">Citas para Hoy</p>
                                        <p className={`text-4xl font-bold tracking-tight ${activeFilter === 'appointments_today' ? 'text-blue-600' : 'text-gray-800'}`}>
                                            {stats.appointmentsToday}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${activeFilter === 'appointments_today' ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-500 group-hover:bg-blue-100 transition-colors'}`}>
                                        <CalendarIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Sin Seguimiento */}
                            <div 
                                onClick={() => handleCardClick('no_followup')}
                                className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 group
                                    ${activeFilter === 'no_followup' 
                                        ? 'bg-white ring-2 ring-red-500 shadow-lg shadow-red-100' 
                                        : 'bg-white border border-gray-100 hover:shadow-lg hover:-translate-y-1'
                                    }`}
                            >
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 mb-2">Sin Interacción (+3 días)</p>
                                        <p className={`text-4xl font-bold tracking-tight ${activeFilter === 'no_followup' ? 'text-red-600' : 'text-gray-800'}`}>
                                            {stats.noFollowUp}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${activeFilter === 'no_followup' ? 'bg-red-100 text-red-600' : 'bg-red-50 text-red-500 group-hover:bg-red-100 transition-colors'}`}>
                                        <BellAlertIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Atrasados */}
                            <div 
                                onClick={() => handleCardClick('stale_followup')}
                                className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 group
                                    ${activeFilter === 'stale_followup' 
                                        ? 'bg-white ring-2 ring-amber-500 shadow-lg shadow-amber-100' 
                                        : 'bg-white border border-gray-100 hover:shadow-lg hover:-translate-y-1'
                                    }`}
                            >
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-500 mb-2">Requieren Atención</p>
                                        <p className={`text-4xl font-bold tracking-tight ${activeFilter === 'stale_followup' ? 'text-amber-600' : 'text-gray-800'}`}>
                                            {stats.staleFollowUp}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${activeFilter === 'stale_followup' ? 'bg-amber-100 text-amber-600' : 'bg-amber-50 text-amber-500 group-hover:bg-amber-100 transition-colors'}`}>
                                        <ClockIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-brand-primary/5 to-brand-primary/10 p-6 rounded-2xl border border-brand-primary/10 flex flex-col justify-center items-center text-center">
                                    <p className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-2">Total Leads</p>
                                    <p className="text-5xl font-black text-brand-primary tracking-tighter">{stats.totalLeads}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 p-6 rounded-2xl border border-green-100 flex flex-col justify-center items-center text-center">
                                    <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">Nuevos Hoy</p>
                                    <p className="text-5xl font-black text-green-600 tracking-tighter">+{stats.newLeadsToday}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        Distribución por Estado
                                        <span className="h-px flex-1 bg-gray-200 ml-2"></span>
                                    </h4>
                                    <div className="flex items-start gap-8">
                                        {stats.statusData.length > 0 ? (
                                            <div className="relative group">
                                                <div className="w-36 h-36 rounded-full border-[6px] border-white shadow-lg transition-transform group-hover:scale-105" style={{ background: getPieGradient() }}></div>
                                            </div>
                                        ) : (
                                            <div className="w-36 h-36 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">Sin datos</div>
                                        )}
                                        <ul className="space-y-2 flex-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                            {stats.statusData.map(item => (
                                                <li key={item.name} className="flex items-center justify-between text-sm group">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${item.color} group-hover:scale-125 transition-transform`}></span>
                                                        <span className="text-gray-600 truncate max-w-[120px]">{item.name}</span>
                                                    </div>
                                                    <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md text-xs">{item.count}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        Leads por Asesor
                                        <span className="h-px flex-1 bg-gray-200 ml-2"></span>
                                    </h4>
                                    <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                        {stats.advisorData.map(item => {
                                            const max = stats.advisorData[0]?.count || 1;
                                            const width = (item.count / max) * 100;
                                            return (
                                                <div key={item.name} className="group">
                                                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                                                        <span className="text-gray-700">{item.name}</span>
                                                        <span className="text-gray-900">{item.count}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                        <div 
                                                            className="bg-brand-secondary h-2.5 rounded-full transition-all duration-500 ease-out group-hover:bg-blue-600" 
                                                            style={{ width: `${width}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
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