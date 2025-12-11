import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Lead } from '../../types';
import { calculateLeadScore, getScoreColor, getScoreBreakdown } from '../../utils/leadScoring';
import Badge from '../common/Badge';
import BellAlertIcon from '../icons/BellAlertIcon';
import ExclamationCircleIcon from '../icons/ExclamationCircleIcon';
import ClockIcon from '../icons/ClockIcon';
import CalendarIcon from '../icons/CalendarIcon';
import ChatBubbleLeftRightIcon from '../icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from '../icons/EnvelopeIcon';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import MagnifyingGlassIcon from '../icons/MagnifyingGlassIcon';
import Button from '../common/Button';
import ChevronDownIcon from '../icons/ChevronDownIcon';
import ChevronUpDownIcon from '../icons/ChevronUpDownIcon';
import SlidersIcon from '../icons/SlidersIcon';
import GripVerticalIcon from '../icons/GripVerticalIcon';

export type SortableColumn = 'name' | 'advisor_id' | 'status_id' | 'program_id' | 'registration_date' | 'urgency' | 'score' | 'email' | 'phone';
export type SortDirection = 'asc' | 'desc';

interface LeadTableProps {
    leads: Lead[];
    selectedIds: Set<string>;
    onSelectAll: () => void;
    onSelectOne: (id: string) => void;
    sortColumn: SortableColumn;
    sortDirection: SortDirection;
    onSort: (column: SortableColumn) => void;
    advisorMap: Map<string, string>;
    statusMap: Map<string, { name: string; color: string; category: string }>;
    licenciaturaMap: Map<string, string>;
    sourceMap: Map<string, string>;
    onViewDetails: (lead: Lead, tab?: 'info' | 'activity' | 'appointments') => void;
    onOpenWhatsApp: (lead: Lead) => void;
    onOpenEmail: (lead: Lead) => void;
    onEdit: (lead: Lead) => void;
    onDeleteClick: (leadId: string) => void;
    // For Empty State
    localSearchTerm: string;
    activeFilterCount: number;
    onClearFilters: () => void;
}

type ColumnId = 'urgency' | 'score' | 'name' | 'advisor' | 'status' | 'program' | 'registro' | 'agenda' | 'actions' | 'email' | 'phone' | 'source' | 'last_activity';

interface ColumnConfig {
    id: ColumnId;
    label: string;
    visible: boolean;
    sortKey?: SortableColumn; // If allow sorting
    minWidth?: string;
}

const defaultColumns: ColumnConfig[] = [
    { id: 'urgency', label: '!', visible: true, sortKey: 'urgency', minWidth: 'w-10' },
    { id: 'score', label: 'Prob.', visible: true, sortKey: 'score', minWidth: 'w-24' },
    { id: 'name', label: 'Nombre', visible: true, sortKey: 'name' },
    { id: 'email', label: 'Email', visible: false, sortKey: 'email' },
    { id: 'phone', label: 'Teléfono', visible: false, sortKey: 'phone' },
    { id: 'advisor', label: 'Asesor', visible: true, sortKey: 'advisor_id' },
    { id: 'status', label: 'Estado', visible: true, sortKey: 'status_id' },
    { id: 'program', label: 'Licenciatura', visible: true, sortKey: 'program_id' },
    { id: 'source', label: 'Origen', visible: false },
    { id: 'last_activity', label: 'Últ. Actividad', visible: false },
    { id: 'registro', label: 'Registro', visible: true, sortKey: 'registration_date' },
    { id: 'agenda', label: 'Agenda', visible: true },
    { id: 'actions', label: 'Contactar', visible: true },
];

const LeadTable: React.FC<LeadTableProps> = ({
    leads,
    selectedIds,
    onSelectAll,
    onSelectOne,
    sortColumn,
    sortDirection,
    onSort,
    advisorMap,
    statusMap,
    licenciaturaMap,
    sourceMap,
    onViewDetails,
    onOpenWhatsApp,
    onOpenEmail,
    onEdit,
    onDeleteClick,
    localSearchTerm,
    activeFilterCount,
    onClearFilters
}) => {
    // [NEW] Column Visibility State as Ordered Array
    const [columns, setColumns] = useState<ColumnConfig[]>(() => {
        const saved = localStorage.getItem('leadTable_columnsConfig_v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const merged = parsed.map((p: any) => {
                    const def = defaultColumns.find(d => d.id === p.id);
                    return def ? { ...def, ...p } : null;
                }).filter(Boolean);
                defaultColumns.forEach(def => {
                    if (!merged.find((m: any) => m.id === def.id)) merged.push(def);
                });
                return merged;
            } catch (e) { return defaultColumns; }
        }
        return defaultColumns;
    });

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        localStorage.setItem('leadTable_columnsConfig_v2', JSON.stringify(columns));
    }, [columns]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);


    const toggleColumn = (colId: ColumnId) => {
        setColumns(prev => prev.map(c => c.id === colId ? { ...c, visible: !c.visible } : c));
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        e.preventDefault();
        dragOverItem.current = position;

        if (dragItem.current !== null && dragItem.current !== position) {
            const newCols = [...columns];
            const draggedContent = newCols[dragItem.current];
            newCols.splice(dragItem.current, 1);
            newCols.splice(position, 0, draggedContent);
            setColumns(newCols);
            dragItem.current = position; // Update drag index to follow
        }
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('opacity-50');
        dragItem.current = null;
        dragOverItem.current = null;
    };

    const SortableHeader: React.FC<{ config: ColumnConfig; className?: string }> = ({ config, className }) => {
        const { label, sortKey, minWidth } = config;

        if (!sortKey) {
            return <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className} ${minWidth || ''}`}>{label}</th>;
        }

        const isSorted = sortColumn === sortKey;
        const icon = isSorted
            ? <ChevronDownIcon className={`w-4 h-4 text-brand-secondary transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
            : <ChevronUpDownIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />;

        return (
            <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group ${className} ${minWidth || ''}`} onClick={() => onSort(sortKey)}>
                <div className="flex items-center gap-1">
                    <span className="group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">{label}</span>
                    {icon}
                </div>
            </th>
        )
    };

    const getLeadUrgency = (lead: Lead) => {
        const status = statusMap.get(lead.status_id);
        if (status?.category !== 'active') return 0;
        if (lead.appointments?.some(a => a.status === 'scheduled')) {
            const activeAppt = lead.appointments.find(a => a.status === 'scheduled');
            if (activeAppt) {
                const apptDate = new Date(activeAppt.date);
                const now = new Date();
                const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                if (hoursDiff > 0 && hoursDiff <= 48) return 3;
                return 1;
            }
        }
        const regDate = new Date(lead.registration_date);
        const now = new Date();
        const daysSinceReg = (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24);
        if ((!lead.follow_ups || lead.follow_ups.length === 0) && daysSinceReg > 3) return 2;
        if (lead.follow_ups && lead.follow_ups.length > 0) {
            const lastFollowUp = [...lead.follow_ups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const daysSinceFollowUp = (now.getTime() - new Date(lastFollowUp.date).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceFollowUp > 7) return 2;
        }
        return 0;
    };

    const renderCell = (lead: Lead, colId: ColumnId) => {
        switch (colId) {
            case 'urgency':
                const urgencyLevel = getLeadUrgency(lead);
                if (urgencyLevel === 3) return <div className="flex justify-center"><BellAlertIcon className="w-5 h-5 text-red-600 animate-pulse" title="Cita inminente (<48h)" /></div>;
                if (urgencyLevel === 2) return <div className="flex justify-center"><ExclamationCircleIcon className="w-5 h-5 text-amber-500" title="Requiere Atención (Sin seguimiento)" /></div>;
                return null;
            case 'score':
                const statusObj = statusMap.get(lead.status_id);
                const statusesContext = statusObj ? [{ id: lead.status_id, ...statusObj }] : [];
                const score = calculateLeadScore(lead, statusesContext);
                const colorClass = getScoreColor(score);
                return (
                    <div className="flex justify-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass} cursor-help`} title={getScoreBreakdown(lead, statusesContext)}>
                            {score}%
                        </span>
                    </div>
                );
            case 'name':
                return (
                    <div className="flex items-center cursor-pointer" onClick={() => onViewDetails(lead, 'info')}>
                        <div className="h-9 w-9 rounded-full bg-brand-secondary/10 dark:bg-blue-900/30 flex items-center justify-center text-brand-secondary dark:text-blue-400 font-bold text-sm mr-3">
                            {lead.first_name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{lead.first_name} {lead.paternal_last_name}</div>
                        </div>
                    </div>
                );
            case 'email':
                return <span className="text-sm text-gray-600 dark:text-gray-300">{lead.email || '-'}</span>;
            case 'phone':
                return <span className="text-sm text-gray-600 dark:text-gray-300">{lead.phone || '-'}</span>;
            case 'advisor':
                return <span className="text-sm text-gray-600 dark:text-gray-300">{advisorMap.get(lead.advisor_id) || <span className="text-gray-400 italic">Sin asignar</span>}</span>;
            case 'status':
                return <Badge color={statusMap.get(lead.status_id)?.color} size="sm">{statusMap.get(lead.status_id)?.name || 'Desconocido'}</Badge>;
            case 'program':
                return <span className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate block">{licenciaturaMap.get(lead.program_id) || '-'}</span>;
            case 'source':
                return <span className="text-sm text-gray-500 dark:text-gray-400">{sourceMap.get(lead.source_id) || 'Desconocido'}</span>;
            case 'last_activity':
                // Calcular fecha más reciente de notas o citas
                const lastNote = lead.follow_ups?.length ? new Date(Math.max(...lead.follow_ups.map(f => new Date(f.date).getTime()))) : null;
                const lastAppt = lead.appointments?.length ? new Date(Math.max(...lead.appointments.map(a => new Date(a.date).getTime()))) : null;
                const dates = [lastNote, lastAppt, new Date(lead.registration_date)].filter(Boolean) as Date[];
                const lastDate = new Date(Math.max(...dates.map(d => d.getTime())));

                return (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {lastDate.toLocaleDateString()}
                    </div>
                );
            case 'registro':
                return (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <ClockIcon className="w-3 h-3" />
                        {new Date(lead.registration_date).toLocaleDateString()}
                    </div>
                );
            case 'agenda':
                return lead.appointments?.some(a => a.status === 'scheduled') ? (
                    <div className="flex justify-center">
                        <button onClick={() => onViewDetails(lead, 'appointments')} className="text-emerald-500 hover:scale-110 transition-transform" title="Cita Programada">
                            <CalendarIcon className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center"><span className="text-gray-300 dark:text-gray-600 text-xs">•</span></div>
                );
            case 'actions':
                return (
                    <div className="flex items-center justify-center space-x-3 opacity-100 sm:opacity-70 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onOpenWhatsApp(lead)} className="text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors hover:bg-green-50 dark:hover:bg-green-900/30 p-1 rounded-md">
                            <ChatBubbleLeftRightIcon className="w-5 h-5" />
                        </button>
                        {lead.email && (
                            <button onClick={() => onOpenEmail(lead)} className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded-md">
                                <EnvelopeIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl border border-gray-200 dark:border-slate-700 flex flex-col relative">

            {/* FIXED SETTINGS BUTTON */}
            <div className="absolute top-2 right-2 z-30" ref={menuRef}>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-gray-400 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-all shadow-sm bg-white dark:bg-slate-800"
                    title="Gestionar Columnas"
                >
                    <SlidersIcon className="w-5 h-5" />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 p-3 animate-fade-in-down ring-1 ring-black/5">
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gestionar Columnas</h4>
                            <button onClick={() => setColumns(defaultColumns)} className="text-[10px] text-brand-secondary hover:underline">Restaurar</button>
                        </div>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {columns.map((col, index) => (
                                <div
                                    key={col.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg group cursor-move active:cursor-grabbing transition-colors"
                                >
                                    <div className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                                        <GripVerticalIcon className="w-4 h-4" />
                                    </div>
                                    <label className="flex-1 flex items-center cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={col.visible}
                                            onChange={() => toggleColumn(col.id)}
                                            disabled={col.id === 'name'}
                                            className="rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary mr-3 w-4 h-4 cursor-pointer"
                                        />
                                        <span className={`text-sm ${col.visible ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400 line-through'}`}>
                                            {col.label}
                                        </span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-transparent">
                    <thead className="bg-gray-50/50 dark:bg-slate-700/50 sticky top-0 z-20">
                        <tr>
                            <th scope="col" className="px-4 py-4 text-left w-10">
                                <input
                                    type="checkbox"
                                    checked={leads.length > 0 && leads.every(l => selectedIds.has(l.id))}
                                    onChange={onSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                                />
                            </th>

                            {columns.filter(c => c.visible).map(col => (
                                <SortableHeader key={col.id} config={col} />
                            ))}

                            <th scope="col" className="relative px-6 py-3 w-20"><span className="sr-only">Editar</span></th>
                            <th scope="col" className="px-2 w-10"></th>
                        </tr>
                    </thead>

                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-none">
                        {leads.map((lead) => {
                            const urgencyLevel = getLeadUrgency(lead);

                            let rowClasses = "group hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-200 border-b border-transparent dark:border-slate-800";

                            if (urgencyLevel === 3) {
                                rowClasses = "group bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 border-l-4 border-red-500";
                            } else if (urgencyLevel === 2) {
                                rowClasses = "group bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-l-4 border-amber-400";
                            } else {
                                rowClasses += " border-l-4 border-transparent";
                            }

                            if (selectedIds.has(lead.id)) {
                                rowClasses += " bg-blue-50 dark:bg-blue-900/20";
                            }

                            return (
                                <tr key={lead.id} className={rowClasses}>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(lead.id)}
                                            onChange={() => onSelectOne(lead.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                                        />
                                    </td>

                                    {columns.filter(c => c.visible).map(col => (
                                        <td key={col.id} className="px-6 py-4 whitespace-nowrap">
                                            {renderCell(lead, col.id)}
                                        </td>
                                    ))}

                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEdit(lead)} className="text-gray-400 dark:text-gray-500 hover:text-brand-secondary dark:hover:text-blue-400 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"><EditIcon className="w-4 h-4" /></button>
                                            <button onClick={() => onDeleteClick(lead.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                    <td></td>
                                </tr>
                            )
                        })}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan={columns.filter(c => c.visible).length + 3} className="text-center py-20">
                                    <div className="flex flex-col items-center justify-center animate-fade-in">
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow-inner">
                                            <MagnifyingGlassIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No se encontraron leads</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                                            No hay resultados que coincidan con los filtros aplicados o la búsqueda "{localSearchTerm}".
                                        </p>
                                        {(activeFilterCount > 0 || localSearchTerm) && (
                                            <Button
                                                variant="secondary"
                                                className="mt-6 border-brand-secondary text-brand-secondary hover:bg-brand-secondary/5"
                                                onClick={onClearFilters}
                                            >
                                                Limpiar búsqueda y filtros
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeadTable;
