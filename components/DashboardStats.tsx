import React, { useState, useMemo } from 'react';
import { Lead, Status, Profile, DashboardMetrics, QuickFilterType } from '../types';
import CalendarIcon from './icons/CalendarIcon';
import BellAlertIcon from './icons/BellAlertIcon';
import ClockIcon from './icons/ClockIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import ListBulletIcon from './icons/ListBulletIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, TooltipProps
} from 'recharts';



interface DashboardStatsProps {
    leads: Lead[]; // Kept for compatibility if needed elsewhere, but mainly unused for stats now
    metrics: DashboardMetrics | null; // <--- NEW PROP
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

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 border border-gray-100 dark:border-slate-600 shadow-xl rounded-xl text-xs">
                <p className="font-bold text-gray-800 dark:text-white mb-1">{payload[0].name || label}</p>
                <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-brand-secondary">{payload[0].value}</span> leads
                </p>
            </div>
        );
    }
    return null;
};

const DashboardStats: React.FC<DashboardStatsProps> = ({ leads, metrics, statuses, advisors, activeFilter, onFilterChange }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState<'agenda' | 'analytics'>('agenda');

    // Use memoized stats from props or defaults
    const stats = useMemo(() => {
        if (metrics) {
            return {
                appointmentsToday: metrics.appointmentsToday,
                noFollowUp: metrics.noFollowUp,
                staleFollowUp: metrics.staleFollowUp,
                totalLeads: metrics.totalLeads,
                newLeadsToday: metrics.newLeadsToday,
                enrolledToday: metrics.enrolledToday,
                statusData: metrics.statusCallback.map(item => ({
                    ...item,
                    originalColor: item.color, // Keep original class for reference if needed
                    color: tailwindColorMap[item.color] || '#cbd5e1' // Map to Hex or fallback
                })),
                advisorData: metrics.advisorStats
            };
        }

        // Fallback zeros while loading
        return {
            appointmentsToday: 0,
            noFollowUp: 0,
            staleFollowUp: 0,
            totalLeads: 0,
            newLeadsToday: 0,
            enrolledToday: 0,
            statusData: [],
            advisorData: []
        };
    }, [metrics]);

    const handleCardClick = (filter: QuickFilterType) => {
        onFilterChange(activeFilter === filter ? null : filter);
    };

    // Estilos dinámicos para Dark Mode y Light Mode (Mejorados)
    const getNoFollowUpStyles = () => {
        const isActive = activeFilter === 'no_followup';
        if (stats.noFollowUp > 0) {
            return isActive
                ? 'bg-red-50 ring-2 ring-red-500 shadow-lg shadow-red-100 dark:bg-red-900/30 dark:shadow-none'
                : 'bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 shadow-md shadow-red-50 dark:shadow-none hover:border-red-400';
        }
        // ESTADO INACTIVO (0 Leads): Borde más visible en modo claro
        return isActive
            ? 'bg-white dark:bg-slate-700 ring-2 ring-green-500 shadow-lg'
            : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md';
    };

    const getStaleStyles = () => {
        const isActive = activeFilter === 'stale_followup';
        if (stats.staleFollowUp > 0) {
            return isActive
                ? 'bg-amber-50 ring-2 ring-amber-500 shadow-lg shadow-amber-100 dark:bg-amber-900/30 dark:shadow-none'
                : 'bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/50 shadow-md shadow-amber-50 dark:shadow-none hover:border-amber-400';
        }
        // ESTADO INACTIVO (0 Leads): Borde más visible en modo claro
        return isActive
            ? 'bg-white dark:bg-slate-700 ring-2 ring-gray-400 shadow-lg'
            : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md';
    };

    const getApptStyles = () => {
        // ESTADO GENERAL: Borde más visible en modo claro
        return activeFilter === 'appointments_today'
            ? 'bg-blue-50 ring-2 ring-blue-500 shadow-lg shadow-blue-100 dark:bg-blue-900/30 dark:shadow-none'
            : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1';
    };

    return (
        <div className="mb-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-md">
            <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center transition-colors">
                <div className="flex space-x-1 bg-gray-100/50 dark:bg-slate-700/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('agenda')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'agenda' ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        <div className="flex items-center gap-2">
                            <ListBulletIcon className="w-4 h-4" />
                            Indicadores de Atención
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        <div className="flex items-center gap-2">
                            <ChartBarIcon className="w-4 h-4" />
                            Métricas Globales
                        </div>
                    </button>
                </div>
                <button className="text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
                    <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isExpanded && (
                <div className="p-6 animate-fade-in bg-gray-50/30 dark:bg-slate-900/30">
                    {activeTab === 'agenda' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Card 1: Agenda */}
                            <div
                                onClick={() => handleCardClick('appointments_today')}
                                className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 group ${getApptStyles()}`}
                            >
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-1 mb-2">
                                            <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Citas para Hoy</p>
                                        </div>
                                        <p className={`text-4xl font-black tracking-tight ${activeFilter === 'appointments_today' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
                                            {stats.appointmentsToday}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-2">Eventos programados</p>
                                    </div>
                                    <div className={`p-3 rounded-xl transition-colors ${stats.appointmentsToday > 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                        <CalendarIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Nuevos sin Atender */}
                            <div
                                onClick={() => handleCardClick('no_followup')}
                                className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 group hover:-translate-y-1 ${getNoFollowUpStyles()}`}
                            >
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-1 mb-2">
                                            <p className={`text-sm font-bold uppercase tracking-wide ${stats.noFollowUp > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                                Nuevos sin Atender
                                            </p>
                                            <div
                                                className={`transition-colors ${stats.noFollowUp > 0 ? 'text-red-400 hover:text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                                                title="Criterio: Leads registrados hace más de 3 días que NO tienen ninguna nota."
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <InformationCircleIcon className="w-4 h-4 cursor-help" />
                                            </div>
                                        </div>

                                        <p className={`text-4xl font-black tracking-tight ${stats.noFollowUp > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                                            {stats.noFollowUp}
                                        </p>
                                        <p className={`text-xs font-medium mt-2 ${stats.noFollowUp > 0 ? 'text-red-500 dark:text-red-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {stats.noFollowUp > 0 ? '¡Requiere contacto urgente!' : 'Bandeja de entrada al día'}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl transition-colors 
                                        ${stats.noFollowUp > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300 animate-pulse' : 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300'}`}>
                                        {stats.noFollowUp > 0 ? <BellAlertIcon className="w-6 h-6" /> : <CheckCircleIcon className="w-6 h-6" />}
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Seguimiento Vencido */}
                            <div
                                onClick={() => handleCardClick('stale_followup')}
                                className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 group hover:-translate-y-1 ${getStaleStyles()}`}
                            >
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-1 mb-2">
                                            <p className={`text-sm font-bold uppercase tracking-wide ${stats.staleFollowUp > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                                Seguimiento Vencido
                                            </p>
                                            <div
                                                className={`transition-colors ${stats.staleFollowUp > 0 ? 'text-amber-500 hover:text-amber-700' : 'text-gray-400 hover:text-gray-600'}`}
                                                title="Criterio: Leads con historial activo, sin nota en >7 días."
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <InformationCircleIcon className="w-4 h-4 cursor-help" />
                                            </div>
                                        </div>

                                        <p className={`text-4xl font-black tracking-tight ${stats.staleFollowUp > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-white'}`}>
                                            {stats.staleFollowUp}
                                        </p>
                                        <p className={`text-xs font-medium mt-2 ${stats.staleFollowUp > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {stats.staleFollowUp > 0 ? '> 7 días sin actualización' : 'Cartera activa actualizada'}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl transition-colors ${stats.staleFollowUp > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                        <ClockIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            {/* Analytics View */}
                            {/* Analytics View */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-brand-primary/5 to-brand-primary/10 dark:from-slate-700 dark:to-slate-800 p-6 rounded-2xl border border-brand-primary/10 dark:border-slate-600 flex flex-col justify-center items-center text-center">
                                    <p className="text-xs font-bold text-brand-primary dark:text-blue-300 uppercase tracking-widest mb-2">Total Leads</p>
                                    <p className="text-5xl font-black text-brand-primary dark:text-white tracking-tighter">{stats.totalLeads}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-900/20 dark:to-green-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-800 flex flex-col justify-center items-center text-center">
                                    <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest mb-2">Nuevos Hoy</p>
                                    <p className="text-5xl font-black text-green-600 dark:text-green-400 tracking-tighter">+{stats.newLeadsToday}</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-fuchsia-100/50 dark:from-purple-900/20 dark:to-purple-900/10 p-6 rounded-2xl border border-purple-100 dark:border-purple-800 flex flex-col justify-center items-center text-center">
                                    <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest mb-2">Inscritos Hoy</p>
                                    <p className="text-5xl font-black text-purple-600 dark:text-purple-400 tracking-tighter">+{stats.enrolledToday}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">Distribución por Estado</h4>
                                    <div className="h-64 w-full flex items-center justify-center">
                                        {stats.statusData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                        {stats.statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (<div className="text-gray-400 text-sm">Sin datos disponibles</div>)}
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                        {stats.statusData.map(item => (
                                            <div key={item.name} className="flex items-center justify-between text-xs p-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                                                    <span className="text-gray-600 dark:text-gray-300 truncate" title={item.name}>{item.name}</span>
                                                </div>
                                                <span className="font-bold text-gray-800 dark:text-white">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">Leads por Asesor</h4>
                                    <div className="h-64 w-full">
                                        {stats.advisorData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.advisorData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={70} />
                                                    <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-white dark:bg-slate-800 p-3 border border-gray-100 dark:border-slate-600 shadow-xl rounded-xl text-xs">
                                                                    <p className="font-bold text-gray-800 dark:text-white mb-1">{payload[0].payload.fullName}</p>
                                                                    <p className="text-gray-600 dark:text-gray-300"><span className="font-semibold text-brand-secondary">{payload[0].value}</span> leads asignados</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                    />
                                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (<div className="h-full flex items-center justify-center text-gray-400 text-sm">Sin datos de asesores</div>)}
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