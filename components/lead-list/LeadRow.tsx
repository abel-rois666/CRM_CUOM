
import React, { memo } from 'react';
import { Lead } from '../../types';
import { calculateLeadScore, getScoreColor, getScoreBreakdown, getLeadUrgency, getLastActivityDate } from '../../utils/leadScoring';
import Badge from '../common/Badge';
import BellAlertIcon from '../icons/BellAlertIcon';
import ExclamationCircleIcon from '../icons/ExclamationCircleIcon';
import ClockIcon from '../icons/ClockIcon';
import CalendarIcon from '../icons/CalendarIcon';
import ChatBubbleLeftRightIcon from '../icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from '../icons/EnvelopeIcon';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import ChevronDownIcon from '../icons/ChevronDownIcon';
import { SortableColumn } from './LeadTable'; // We will export this from LeadTable

// We need to define ColumnConfig locally or export it. 
// For now, let's define a simplified interface or importing it would be better if we export it.
// To avoid circular dependency issues if LeadTable imports LeadRow, we should NOT import LeadTable here.
// Best to move shared types to a separate file, but to strictly follow "no break" and "minimal move", 
// we will redefine the necessary shape or just usage usage.
// Actually, SortableColumn is in types? No, it was in LeadTable.
// Let's just use what we need.

type ColumnId = 'urgency' | 'score' | 'name' | 'advisor' | 'status' | 'program' | 'registro' | 'agenda' | 'actions' | 'email' | 'phone' | 'source' | 'last_activity';

interface ColumnConfig {
    id: ColumnId;
    label: string;
    visible: boolean;
    sortKey?: any; // We don't strictly need the sort key here for rendering
    minWidth?: string;
}

interface LeadRowProps {
    lead: Lead;
    columns: ColumnConfig[];
    isSelected: boolean;
    onSelectOne: (id: string) => void;
    advisorMap: Map<string, string>;
    statusMap: Map<string, { name: string; color: string; category: string }>;
    licenciaturaMap: Map<string, string>;
    sourceMap: Map<string, string>;
    onViewDetails: (lead: Lead, tab?: 'info' | 'activity' | 'appointments') => void;
    onOpenWhatsApp: (lead: Lead) => void;
    onOpenEmail: (lead: Lead) => void;
    onEdit: (lead: Lead) => void;
    onDeleteClick: (leadId: string) => void;
    onStatusChange: (id: string, newStatusId: string) => void;
}

const LeadRow: React.FC<LeadRowProps> = memo(({
    lead,
    columns,
    isSelected,
    onSelectOne,
    advisorMap,
    statusMap,
    licenciaturaMap,
    sourceMap,
    onViewDetails,
    onOpenWhatsApp,
    onOpenEmail,
    onEdit,
    onDeleteClick,
    onStatusChange
}) => {

    const urgencyLevel = getLeadUrgency(lead, statusMap.get(lead.status_id));

    const getColorStyle = (bgClass: string) => {
        if (!bgClass) return 'bg-gray-100 text-gray-800';
        if (bgClass.includes('red')) return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
        if (bgClass.includes('blue') || bgClass.includes('sky')) return 'bg-blue-50 text-blue-700 ring-1 ring-blue-700/10';
        if (bgClass.includes('green') || bgClass.includes('emerald')) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20';
        if (bgClass.includes('yellow') || bgClass.includes('amber')) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
        if (bgClass.includes('purple') || bgClass.includes('violet')) return 'bg-purple-50 text-purple-700 ring-1 ring-purple-700/10';
        if (bgClass.includes('orange')) return 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20';
        return 'bg-gray-50 text-gray-600 ring-1 ring-gray-500/10';
    };

    const renderCell = (lead: Lead, colId: ColumnId) => {
        switch (colId) {
            case 'urgency':
                if (urgencyLevel === 3) return <div className="flex justify-center"><BellAlertIcon className="w-5 h-5 text-red-600 animate-pulse" title="Cita inminente (<48h)" role="img" aria-label="Cita inminente" /></div>;
                if (urgencyLevel === 2) return <div className="flex justify-center"><ExclamationCircleIcon className="w-5 h-5 text-amber-500" title="Requiere Atención (Sin seguimiento)" role="img" aria-label="Requiere atención" /></div>;
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
                    <div className="relative z-10 flex items-center cursor-pointer w-full h-full" onClick={() => onViewDetails(lead, 'info')}>
                        <div className="h-9 w-9 rounded-full bg-brand-secondary/10 dark:bg-blue-900/30 flex items-center justify-center text-brand-secondary dark:text-blue-400 font-bold text-sm mr-3 shrink-0">
                            {lead.first_name.charAt(0)}
                        </div>
                        <div className="min-w-[120px]">
                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{lead.first_name} {lead.paternal_last_name}</div>
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
                const rawColor = statusMap.get(lead.status_id)?.color;
                const badgeStyle = getColorStyle(rawColor || '');

                return (
                    <div className="relative group/status" onClick={(e) => e.stopPropagation()}>
                        <select
                            name={`status-${lead.id}`}
                            id={`status-${lead.id}`}
                            value={lead.status_id}
                            onChange={(e) => onStatusChange(lead.id, e.target.value)}
                            className={`appearance-none cursor-pointer type-none w-auto max-w-[180px] truncate rounded-full px-3 py-1 pr-7 text-xs font-medium border-0 focus:ring-2 focus:ring-brand-secondary/50 transition-colors ${badgeStyle}`}
                            aria-label={`Cambiar estado de ${lead.first_name}`}
                        >
                            {Array.from(statusMap.entries()).map(([id, s]) => (
                                <option key={id} value={id} className="bg-white text-gray-900 dark:bg-slate-800 dark:text-gray-100 py-1">
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDownIcon className="absolute left-[calc(100%-1.5rem)] ml-1 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 pointer-events-none text-current" aria-hidden="true" />
                    </div>
                );
            case 'program':
                return <span className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate block">{licenciaturaMap.get(lead.program_id) || '-'}</span>;
            case 'source':
                return <span className="text-sm text-gray-500 dark:text-gray-400">{sourceMap.get(lead.source_id) || 'Desconocido'}</span>;
            case 'last_activity':
                // Calcular fecha más reciente usando utilidad centralizada
                const lastDate = getLastActivityDate(lead);

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
                        <button onClick={() => onOpenWhatsApp(lead)} aria-label={`Enviar WhatsApp a ${lead.first_name}`} className="text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-colors hover:bg-green-50 dark:hover:bg-green-900/30 p-1 rounded-md">
                            <ChatBubbleLeftRightIcon className="w-5 h-5" />
                        </button>
                        {lead.email && (
                            <button onClick={() => onOpenEmail(lead)} aria-label={`Enviar Email a ${lead.first_name}`} className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded-md">
                                <EnvelopeIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    let rowClasses = "group hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-200 border-b border-transparent dark:border-slate-800";

    // Base styles for the sticky cell: Opaque background to hide scrolled content, relative for pseudo-positioning
    // [FIX] Changed dark:bg-slate-900 to dark:bg-slate-800 to match LeadTable tbody color
    const stickyBase = "sticky left-0 z-20 bg-white dark:bg-slate-800 border-r border-transparent shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]";

    // Dynamic overlay styles using 'before' pseudo-element to match row background without losing opacity
    let stickyOverlay = "before:absolute before:inset-0 before:transition-colors before:duration-200 before:pointer-events-none";

    // Helper to constructing hover classes: Light hover | Dark hover
    // We use dark:group-hover:before:... to ensure specific dark mode handling

    if (urgencyLevel === 3) {
        rowClasses = "group bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 border-l-4 border-red-500";
        stickyOverlay += " group-hover:before:bg-red-50 dark:group-hover:before:bg-red-900/20";
    } else if (urgencyLevel === 2) {
        rowClasses = "group bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-l-4 border-amber-400";
        stickyOverlay += " group-hover:before:bg-amber-50 dark:group-hover:before:bg-amber-900/20";
    } else {
        rowClasses += " border-l-4 border-transparent";
        // Standard hover: Gray-50 in light | Slate-700/50 in dark
        stickyOverlay += " group-hover:before:bg-gray-50 dark:group-hover:before:bg-slate-700/50";
    }

    if (isSelected) {
        rowClasses += " bg-blue-50 dark:bg-blue-900/20";
        // Override overlay for selected state
        stickyOverlay = "before:absolute before:inset-0 before:transition-colors before:duration-200 before:pointer-events-none before:bg-blue-50 before:dark:bg-blue-900/20";
    }

    return (
        <tr className={rowClasses}>
            <td className="px-4 py-4 whitespace-nowrap">
                <input
                    type="checkbox"
                    id={`checkbox-${lead.id}`}
                    name={`checkbox-${lead.id}`}
                    aria-label={`Seleccionar lead ${lead.first_name}`}
                    checked={isSelected}
                    onChange={() => onSelectOne(lead.id)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                />
            </td>

            {columns.filter(c => c.visible).map(col => (
                <td
                    key={col.id}
                    className={`px-6 py-4 whitespace-nowrap ${col.id === 'name' ? `${stickyBase} ${stickyOverlay}` : ''}`}
                >
                    {renderCell(lead, col.id)}
                </td>
            ))}

            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(lead)} aria-label={`Editar ${lead.first_name}`} className="text-gray-400 dark:text-gray-500 hover:text-brand-secondary dark:hover:text-blue-400 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"><EditIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDeleteClick(lead.id)} aria-label={`Eliminar ${lead.first_name}`} className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><TrashIcon className="w-4 h-4" /></button>
                </div>
            </td>
            <td></td>
        </tr>
    );
});

export default LeadRow;
