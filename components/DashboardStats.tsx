// components/DashboardStats.tsx
import React, { useState, useMemo } from 'react';
import { Lead, Status, Profile } from '../types';
import CalendarIcon from './icons/CalendarIcon';
import BellAlertIcon from './icons/BellAlertIcon';
import ClockIcon from './icons/ClockIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import ListBulletIcon from './icons/ListBulletIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, TooltipProps 
} from 'recharts';

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

const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl text-xs">
          <p className="font-bold text-gray-800 mb-1">{payload[0].name || label}</p>
          <p className="text-gray-600">
            <span className="font-semibold text-brand-secondary">{payload[0].value}</span> leads
          </p>
        </div>
      );
    }
    return null;
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

        const statusCategoryMap = new Map(statuses.map(s => [s.id, s.category || 'active']));

        advisors.forEach(a => advisorCounts[a.id] = 0);

        leads.forEach(lead => {
            const regDate = new Date(lead.registration_date);
            const regDateZero = new Date(lead.registration_date);
            regDateZero.setHours(0,0,0,0);

            const category = statusCategoryMap.get(lead.status_id);
            const isActive = category === 'active';

            if (isActive) {
                const hasAppointmentToday = lead.appointments?.some(appt => {
                    const apptDate = new Date(appt.date);
                    apptDate.setHours(0,0,0,0);
                    return appt.status === 'scheduled' && apptDate.getTime() === today.getTime();
                });
                if (hasAppointmentToday) appointmentsToday++;

                const hasNoFollowUps = !lead.follow_ups || lead.follow_ups.length === 0;
                if (hasNoFollowUps && regDate < threeDaysAgo) noFollowUp++;

                if (lead.follow_ups && lead.follow_ups.length > 0) {
                    const lastFollowUp = [...lead.follow_ups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    if (new Date(lastFollowUp.date) < sevenDaysAgo) staleFollowUp++;
                }
            }

            if (regDateZero.getTime() === today.getTime()) newLeadsToday++;
            statusCounts[lead.status_id] = (statusCounts[lead.status_id] || 0) + 1;
            advisorCounts[lead.advisor_id] = (advisorCounts[lead.advisor_id] || 0) + 1;
        });

        const statusData = statuses
            .map(s => ({ 
                name: s.name, 
                colorKey: s.color,
                color: tailwindColorMap[s.color] || '#cbd5e1', 
                value: statusCounts[s.id] || 0 
            }))
            .filter(s => s.value > 0)
            .sort((a,b) => b.value - a.value);

        const advisorData = advisors
            .map(a => ({ 
                name: a.full_name.split(' ')[0], 
                fullName: a.full_name,
                value: advisorCounts[a.id] || 0 
            }))
            .sort((a,b) => b.value - a.value);

        return { appointmentsToday, noFollowUp, staleFollowUp, totalLeads: leads.length, newLeadsToday, statusData, advisorData };
    }, [leads, statuses, advisors]);

    const handleCardClick = (filter: QuickFilterType) => {
        onFilterChange(activeFilter === filter ? null : filter);
    };

    const getNoFollowUpStyles = () => {
        const isActive = activeFilter === 'no_followup';
        if (stats.noFollowUp > 0) {
            return isActive 
                ? 'bg-red-50 ring-2 ring-red-500 shadow-lg shadow-red-100' 
                : 'bg-white border border-red-200 shadow-md shadow-red-50 hover:border-red-400';
        }
        return isActive 
            ? 'bg-white ring-2 ring-green-500 shadow-lg' 
            : 'bg-white border border-gray-100 hover:shadow-lg';
    };

    const getStaleStyles = () => {
        const isActive = activeFilter === 'stale_followup';
        if (stats.staleFollowUp > 0) {
            return isActive 
                ? 'bg-amber-50 ring-2 ring-amber-500 shadow-lg shadow-amber-100'
                : 'bg-white border border-amber-200 shadow-md shadow-amber-50 hover:border-amber-400';
        }
        return isActive 
            ? 'bg-white ring-2 ring-gray-400 shadow-lg' 
            : 'bg-white border border-gray-100 hover:shadow-lg';
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
                            Indicadores de Atención
                        </div>
                    </button>
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <ChartBarIcon className="w-4 h-4"/>
                            Métricas Globales
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
                            
                            {/* Card 1: Agenda */}
                            <div 
                                onClick={() => handleCardClick('appointments_today')}
                                className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 group
                                    ${activeFilter === 'appointments_today' 
                                        ? 'bg-blue-50 ring-2 ring-blue-500 shadow-lg shadow-blue-100' 
                                        : 'bg-white border border-gray-100 hover:shadow-lg hover:-translate-y-1'
                                    }`}
                            >
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">Citas para Hoy</p>
                                        <p className={`text-4xl font-black tracking-tight ${activeFilter === 'appointments_today' ? 'text-blue-700' : 'text-gray-800'}`}>
                                            {stats.appointmentsToday}
                                        </p>
                                        <p className="text-xs text-gray-400 font-medium mt-2">Eventos programados</p>
                                    </div>
                                    <div className={`p-3 rounded-xl transition-colors ${stats.appointmentsToday > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <CalendarIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Nuevos sin Atender */}
                            <div 
                                onClick={() => handleCardClick('no_followup')}
                                className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 group hover:-translate-y-1
                                    ${getNoFollowUpStyles()}`}
                            >
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className={`text-sm font-bold mb-2 uppercase tracking-wide ${stats.noFollowUp > 0 ? 'text-red-700' : 'text-gray-600'}`}>
                                            Nuevos sin Atender
                                        </p>
                                        <p className={`text-4xl font-black tracking-tight ${stats.noFollowUp > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                            {stats.noFollowUp}
                                        </p>
                                        <p className={`text-xs font-medium mt-2 ${stats.noFollowUp > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {stats.noFollowUp > 0 ? '¡Requiere contacto urgente!' : 'Bandeja de entrada al día'}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl transition-colors 
                                        ${stats.noFollowUp > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
                                        {stats.noFollowUp > 0 ? <BellAlertIcon className="w-6 h-6" /> : <CheckCircleIcon className="w-6 h-6" />}
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Seguimiento Vencido */}
                            <div 
                                onClick={() => handleCardClick('stale_followup')}
                                className={`relative overflow-hidden p-6 rounded-2xl cursor-pointer transition-all duration-300 group hover:-translate-y-1
                                    ${getStaleStyles()}`}
                            >
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <p className={`text-sm font-bold mb-2 uppercase tracking-wide ${stats.staleFollowUp > 0 ? 'text-amber-700' : 'text-gray-600'}`}>
                                            Seguimiento Vencido
                                        </p>
                                        <p className={`text-4xl font-black tracking-tight ${stats.staleFollowUp > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
                                            {stats.staleFollowUp}
                                        </p>
                                        <p className={`text-xs font-medium mt-2 ${stats.staleFollowUp > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                            {stats.staleFollowUp > 0 ? '> 7 días sin actualización' : 'Cartera activa actualizada'}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl transition-colors ${stats.staleFollowUp > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <ClockIcon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            {/* Analytics View (Sin cambios) */}
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
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">Distribución por Estado</h4>
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
                                            <div key={item.name} className="flex items-center justify-between text-xs p-1.5 hover:bg-gray-50 rounded-lg transition-colors">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></span>
                                                    <span className="text-gray-600 truncate" title={item.name}>{item.name}</span>
                                                </div>
                                                <span className="font-bold text-gray-800">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">Leads por Asesor</h4>
                                    <div className="h-64 w-full">
                                        {stats.advisorData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.advisorData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                                                    <Tooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl text-xs">
                                                                        <p className="font-bold text-gray-800 mb-1">{payload[0].payload.fullName}</p>
                                                                        <p className="text-gray-600"><span className="font-semibold text-brand-secondary">{payload[0].value}</span> leads asignados</p>
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