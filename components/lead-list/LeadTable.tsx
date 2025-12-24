import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Lead } from '../../types';
import { calculateLeadScore, getScoreColor, getScoreBreakdown, getLeadUrgency } from '../../utils/leadScoring';
import Badge from '../common/Badge';
import LeadRow from './LeadRow'; // [NEW] Memoized Row
import { usePreferences } from '../../hooks/usePreferences';
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
    loading?: boolean; // [NEW] Prop to control empty state visibility
    onStatusChange: (id: string, newStatusId: string) => void;
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
    { id: 'email', label: 'Email', visible: true, sortKey: 'email' },
    { id: 'phone', label: 'Teléfono', visible: true, sortKey: 'phone' },
    { id: 'advisor', label: 'Asesor', visible: true, sortKey: 'advisor_id' },
    { id: 'status', label: 'Estado', visible: true, sortKey: 'status_id', minWidth: 'w-36' },
    { id: 'program', label: 'Licenciatura', visible: true, sortKey: 'program_id' },
    { id: 'source', label: 'Origen', visible: true },
    { id: 'last_activity', label: 'Últ. Actividad', visible: true },
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
    onClearFilters,
    loading = false,
    onStatusChange
}) => {
    // [NEW] Column Visibility Persistence
    const { preferences, updatePreferences } = usePreferences();

    // Initialize from preferences OR local storage toggle (fallback)
    const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);

    // Sync from persisted preferences
    useEffect(() => {
        if (preferences?.lead_table_columns && preferences.lead_table_columns.length > 0) {
            const savedOrderIds = preferences.lead_table_columns;

            // 1. Create a map of defaults for easy lookup
            const defaultsMap = new Map(defaultColumns.map(c => [c.id, c]));

            // 2. Reconstruct columns in the SAVED order (for visible ones)
            const orderedColumns: ColumnConfig[] = [];
            const processedIds = new Set<string>();

            // Add saved columns in their specific order
            savedOrderIds.forEach(id => {
                // @ts-ignore - Supabase might return strings that match ColumnId
                const def = defaultsMap.get(id);
                if (def) {
                    orderedColumns.push({ ...def, visible: true });
                    processedIds.add(id);
                }
            });

            // 3. Append any remaining default columns that were NOT in the saved list (hidden or new)
            // We append them at the end, marked as hidden (or default visibility if needed, but usually hidden if not in saved list)
            defaultColumns.forEach(def => {
                if (!processedIds.has(def.id)) {
                    orderedColumns.push({ ...def, visible: false });
                }
            });

            setColumns(orderedColumns);
        }
    }, [preferences.lead_table_columns]);

    // Save changes to Persistence
    // We update local state immediately for UI, and sync to DB
    const handleColumnChange = (newColumns: ColumnConfig[]) => {
        setColumns(newColumns);
        const visibleIds = newColumns.filter(c => c.visible).map(c => c.id);
        updatePreferences({ lead_table_columns: visibleIds });
    };

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
        const newCols = columns.map(c => c.id === colId ? { ...c, visible: !c.visible } : c);
        handleColumnChange(newCols);
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
        handleColumnChange(columns);
    };

    const SortableHeader: React.FC<{ config: ColumnConfig; className?: string }> = ({ config, className }) => {
        const { label, sortKey, minWidth, id } = config;

        // Sticky Logic for Name Column
        const stickyClass = id === 'name'
            ? 'sticky left-0 z-30 bg-gray-50/50 dark:bg-slate-700/50 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
            : '';

        if (!sortKey) {
            const isUrgency = id === 'urgency';
            const headerLabel = isUrgency ? <span className="sr-only">Urgencia</span> : label;
            return <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className} ${minWidth || ''} ${stickyClass}`}>{isUrgency ? <span aria-hidden="true">!</span> : null}{headerLabel}</th>;
        }

        const isSorted = sortColumn === sortKey;
        const icon = isSorted
            ? <ChevronDownIcon className={`w-4 h-4 text-brand-secondary transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
            : <ChevronUpDownIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />;

        return (
            <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group ${className} ${minWidth || ''} ${stickyClass}`} onClick={() => onSort(sortKey)}>
                <div className="flex items-center gap-1">
                    <span className="group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">{id === 'urgency' ? <span aria-label="Ordenar por Urgencia">!</span> : label}</span>
                    {icon}
                </div>
            </th>
        )
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
                    <SlidersIcon className="w-5 h-5" aria-hidden="true" />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 p-3 animate-fade-in-down ring-1 ring-black/5">
                        <div className="flex justify-between items-center mb-3 px-1 border-b border-gray-100 dark:border-slate-700 pb-2">
                            <label className="flex items-center cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={columns.every(c => c.visible)}
                                    onChange={(e) => {
                                        const areAllVisible = columns.every(c => c.visible);
                                        const newCols = columns.map(c =>
                                            c.id === 'name' ? c : { ...c, visible: !areAllVisible }
                                        );
                                        handleColumnChange(newCols);
                                    }}
                                    className="rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary mr-2 w-4 h-4 cursor-pointer"
                                    id="select-all-columns"
                                    name="select-all-columns"
                                    aria-label="Mostrar todas las columnas"
                                />
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Todo</span>
                            </label>
                            <button onClick={() => handleColumnChange(defaultColumns)} className="text-[10px] text-brand-secondary hover:underline">Restaurar</button>
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
                                            id={`col-visibility-${col.id}`}
                                            name={`col-visibility-${col.id}`}
                                            checked={col.visible}
                                            onChange={() => toggleColumn(col.id)}
                                            disabled={col.id === 'name'}
                                            className="rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary mr-3 w-4 h-4 cursor-pointer"
                                            aria-label={`Alternar visibilidad de columna ${col.label}`}
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

            {/* RESPONSIVE LAYOUT */}

            {/* 1. MOBILE & TABLET CARD VIEW (Visible < xl) */}
            <div className="block xl:hidden p-3 space-y-4 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl">
                {/* Mobile Selection Toolbar */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            id="mobile-select-all"
                            name="mobile-select-all"
                            className="w-5 h-5 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                            checked={leads.length > 0 && leads.every(l => selectedIds.has(l.id))}
                            onChange={onSelectAll}
                            aria-label="Seleccionar todos en móvil"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {selectedIds.size > 0 ? `${selectedIds.size} seleccionados` : 'Seleccionar todo'}
                        </span>
                    </label>

                    {/* Reusing existing column config button logic if needed, or just relying on the top toolbar */}
                </div>

                <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
                    {leads.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in col-span-full">
                            <div className="bg-white dark:bg-slate-800 rounded-full p-4 mb-3 shadow-sm">
                                <MagnifyingGlassIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No hay leads</h3>
                            <p className="text-xs text-gray-400 mt-1">Intenta ajustar tus filtros.</p>
                            {(activeFilterCount > 0 || localSearchTerm) && (
                                <button onClick={onClearFilters} className="mt-4 text-xs font-semibold text-brand-secondary underline">
                                    Limpiar Filtros
                                </button>
                            )}
                        </div>
                    )}

                    {leads.map(lead => {
                        const statusObj = statusMap.get(lead.status_id);
                        const urgency = getLeadUrgency(lead, statusObj);
                        const score = calculateLeadScore(lead, statusObj ? [{ id: lead.status_id, ...statusObj }] : []);
                        const scoreColor = getScoreColor(score);

                        // Calculate Last Activity Date
                        const lastNote = lead.follow_ups?.length ? new Date(Math.max(...lead.follow_ups.map(f => new Date(f.date).getTime()))) : null;
                        const lastAppt = lead.appointments?.length ? new Date(Math.max(...lead.appointments.map(a => new Date(a.date).getTime()))) : null;
                        const activityDates = [lastNote, lastAppt, new Date(lead.registration_date)].filter(Boolean) as Date[];
                        const lastActivityDate = new Date(Math.max(...activityDates.map(d => d.getTime())));

                        return (
                            <div key={lead.id} className={`bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden ${selectedIds.has(lead.id) ? 'ring-2 ring-brand-secondary/50' : ''}`}>
                                {/* Selection Overlay (Tap active area) */}
                                <div className="absolute top-4 right-4 z-10">
                                    <input
                                        type="checkbox"
                                        id={`mobile-select-${lead.id}`}
                                        name={`mobile-select-${lead.id}`}
                                        checked={selectedIds.has(lead.id)}
                                        onChange={() => onSelectOne(lead.id)}
                                        className="w-5 h-5 rounded-full border-gray-300 text-brand-secondary focus:ring-brand-secondary"
                                        aria-label={`Seleccionar lead ${lead.first_name}`}
                                    />
                                </div>

                                {/* Urgency Indicator Strip */}
                                {urgency > 0 && columns.find(c => c.id === 'urgency')?.visible && (
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${urgency === 3 ? 'bg-red-500' : 'bg-amber-400'}`} />
                                )}

                                {/* Header: Avatar & Name */}
                                <div className="flex items-start gap-3 pr-8 mb-3" onClick={() => onViewDetails(lead, 'info')}>
                                    <div className="h-10 w-10 rounded-full bg-brand-secondary/10 dark:bg-blue-900/20 flex items-center justify-center text-brand-secondary dark:text-blue-400 font-bold shrink-0">
                                        {lead.first_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                                            {lead.first_name} {lead.paternal_last_name}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {columns.find(c => c.id === 'status')?.visible && (
                                                <Badge color={statusObj?.color} size="sm">{statusObj?.name || 'Estado'}</Badge>
                                            )}
                                            {columns.find(c => c.id === 'score')?.visible && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border ${scoreColor}`}>
                                                    {score}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Key Details Grid - Respecting Column Visibility */}
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-gray-500 dark:text-gray-400 mb-4 pl-2 border-l-2 border-gray-100 dark:border-slate-700 ml-3">
                                    {columns.find(c => c.id === 'program')?.visible && (
                                        <div>
                                            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Programa</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate block">
                                                {licenciaturaMap.get(lead.program_id) || '-'}
                                            </span>
                                        </div>
                                    )}

                                    {columns.find(c => c.id === 'advisor')?.visible && (
                                        <div>
                                            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Asesor</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate block">
                                                {advisorMap.get(lead.advisor_id) ?? 'Sin asignar'}
                                            </span>
                                        </div>
                                    )}

                                    {columns.find(c => c.id === 'email')?.visible && (
                                        <div className="col-span-2 sm:col-span-1">
                                            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Email</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate block" title={lead.email}>
                                                {lead.email || '-'}
                                            </span>
                                        </div>
                                    )}

                                    {columns.find(c => c.id === 'phone')?.visible && (
                                        <div>
                                            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Teléfono</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate block">
                                                {lead.phone || '-'}
                                            </span>
                                        </div>
                                    )}

                                    {columns.find(c => c.id === 'source')?.visible && (
                                        <div>
                                            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Origen</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate block">
                                                {sourceMap.get(lead.source_id) || 'Desconocido'}
                                            </span>
                                        </div>
                                    )}

                                    {columns.find(c => c.id === 'last_activity')?.visible && (
                                        <div>
                                            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Últ. Actividad</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate block">
                                                {lastActivityDate.toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}

                                    {columns.find(c => c.id === 'registro')?.visible && (
                                        <div>
                                            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Registro</span>
                                            <span className="font-medium">{new Date(lead.registration_date).toLocaleDateString()}</span>
                                        </div>
                                    )}

                                    {/* Appointments / Agenda Shortcut */}
                                    {columns.find(c => c.id === 'agenda')?.visible && (
                                        <div className="flex items-center col-span-2 mt-1">
                                            {lead.appointments?.some(a => a.status === 'scheduled') && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onViewDetails(lead, 'appointments'); }}
                                                    className="flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full"
                                                >
                                                    <CalendarIcon className="w-3 h-3" />
                                                    <span className="font-bold">Cita</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Bar */}
                                {columns.find(c => c.id === 'actions')?.visible && (
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => onOpenWhatsApp(lead)}
                                                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                                            >
                                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                            </button>
                                            {lead.email && (
                                                <button
                                                    onClick={() => onOpenEmail(lead)}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                                                >
                                                    <EnvelopeIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onEdit(lead)}
                                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300"
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 2. DESKTOP TABLE VIEW (Visible >= xl) */}
            <div className="hidden xl:block overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-transparent">
                    <thead className="bg-gray-50/50 dark:bg-slate-700/50 sticky top-0 z-20">
                        <tr>
                            <th scope="col" className="px-4 py-4 text-left w-10">
                                <label htmlFor="select-all-leads" className="sr-only">Seleccionar todos los leads</label>
                                <input
                                    type="checkbox"
                                    id="select-all-leads"
                                    name="select-all-leads"
                                    aria-label="Seleccionar todos los leads"
                                    checked={leads.length > 0 && leads.every(l => selectedIds.has(l.id))}
                                    onChange={onSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                                />
                            </th>

                            {columns.filter(c => c.visible).map(col => (
                                <SortableHeader key={col.id} config={col} />
                            ))}

                            <th scope="col" className="relative px-6 py-3 w-20"><span className="sr-only">Editar</span></th>
                            <th scope="col" className="px-2 w-10"><span className="sr-only">Indicadores</span></th>
                        </tr>
                    </thead>

                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-none">
                        {leads.map((lead) => (
                            <LeadRow
                                key={lead.id}
                                lead={lead}
                                columns={columns}
                                isSelected={selectedIds.has(lead.id)}
                                onSelectOne={onSelectOne}
                                advisorMap={advisorMap}
                                statusMap={statusMap}
                                licenciaturaMap={licenciaturaMap}
                                sourceMap={sourceMap}
                                onViewDetails={onViewDetails}
                                onOpenWhatsApp={onOpenWhatsApp}
                                onOpenEmail={onOpenEmail}
                                onEdit={onEdit}
                                onDeleteClick={onDeleteClick}
                                onStatusChange={onStatusChange}
                            />
                        ))}
                        {/* [MODIFIED] Only show empty state if NOT loading. If loading, showing nothing here (or a spinner) is better to avoid flash. */}
                        {!loading && leads.length === 0 && (
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
                        {/* [NEW] Optional: Subtle Spinner Overlay logic could go here if needed, but for now just hiding empty state is enough to fix the flash. */}
                        {loading && leads.length === 0 && (
                            <tr>
                                <td colSpan={columns.filter(c => c.visible).length + 3} className="text-center py-20">
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
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
