import React, { useMemo } from 'react';
import { Lead, Status, Profile, Licenciatura } from '../../types';
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

export type SortableColumn = 'name' | 'advisor_id' | 'status_id' | 'program_id' | 'registration_date' | 'urgency';
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
    onViewDetails,
    onOpenWhatsApp,
    onOpenEmail,
    onEdit,
    onDeleteClick,
    localSearchTerm,
    activeFilterCount,
    onClearFilters
}) => {

    const SortableHeader: React.FC<{ column: SortableColumn; label: string; className?: string }> = ({ column, label, className }) => {
        const isSorted = sortColumn === column;
        const icon = isSorted
            ? <ChevronDownIcon className={`w-4 h-4 text-brand-secondary transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
            : <ChevronUpDownIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />;

        return (
            <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group ${className}`} onClick={() => onSort(column)}>
                <div className="flex items-center gap-1">
                    <span className="group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">{label}</span>
                    {icon}
                </div>
            </th>
        )
    }

    // Función de urgencia (Duplicada logicamente aquí para renderizado)
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

    return (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 flex flex-col">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-transparent">
                    <thead className="bg-gray-50/50 dark:bg-slate-700/50">
                        <tr>
                            <th scope="col" className="px-4 py-4 text-left w-10">
                                <input
                                    type="checkbox"
                                    checked={leads.length > 0 && leads.every(l => selectedIds.has(l.id))}
                                    onChange={onSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                                />
                            </th>

                            <SortableHeader column="urgency" label="!" className="w-10 text-center" />
                            <SortableHeader column="name" label="Nombre" />
                            <SortableHeader column="advisor_id" label="Asesor" className="hidden md:table-cell" />
                            <SortableHeader column="status_id" label="Estado" />
                            <SortableHeader column="program_id" label="Licenciatura" className="hidden sm:table-cell" />
                            <SortableHeader column="registration_date" label="Registro" className="hidden lg:table-cell" />
                            <th scope="col" className="hidden sm:table-cell px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Agenda</th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Editar</span></th>
                        </tr>
                    </thead>

                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-none">
                        {leads.map((lead) => {
                            const urgencyLevel = getLeadUrgency(lead);
                            const status = statusMap.get(lead.status_id);

                            let rowClasses = "group hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-200 border-b border-transparent dark:border-slate-800";
                            let urgencyIndicator = null;

                            if (urgencyLevel === 3) {
                                rowClasses = "group bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 border-l-4 border-red-500";
                                urgencyIndicator = <BellAlertIcon className="w-5 h-5 text-red-600 animate-pulse" title="Cita inminente (<48h)" />;
                            } else if (urgencyLevel === 2) {
                                rowClasses = "group bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-l-4 border-amber-400";
                                urgencyIndicator = <ExclamationCircleIcon className="w-5 h-5 text-amber-500" title="Requiere Atención (Sin seguimiento)" />;
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

                                    <td className="px-2 py-4 whitespace-nowrap text-center">
                                        <div className="flex justify-center">{urgencyIndicator}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center cursor-pointer" onClick={() => onViewDetails(lead, 'info')}>
                                            <div className="h-9 w-9 rounded-full bg-brand-secondary/10 dark:bg-blue-900/30 flex items-center justify-center text-brand-secondary dark:text-blue-400 font-bold text-sm mr-3">
                                                {lead.first_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{lead.first_name} {lead.paternal_last_name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{lead.email || lead.phone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                        {advisorMap.get(lead.advisor_id) || <span className="text-gray-400 dark:text-gray-500 italic">Sin asignar</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge color={status?.color} size="sm">
                                            {status?.name || 'Desconocido'}
                                        </Badge>
                                    </td>
                                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                                        {licenciaturaMap.get(lead.program_id) || '-'}
                                    </td>
                                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <ClockIcon className="w-3 h-3" />
                                            {new Date(lead.registration_date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-center">
                                        {lead.appointments?.some(a => a.status === 'scheduled') ? (
                                            <button onClick={() => onViewDetails(lead, 'appointments')} className="text-emerald-500 hover:scale-110 transition-transform" title="Cita Programada">
                                                <CalendarIcon className="w-5 h-5 inline-block" />
                                            </button>
                                        ) : (
                                            <span className="text-gray-300 dark:text-gray-600 text-xs">•</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
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
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEdit(lead)} className="text-gray-400 dark:text-gray-500 hover:text-brand-secondary dark:hover:text-blue-400 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"><EditIcon className="w-4 h-4" /></button>
                                            <button onClick={() => onDeleteClick(lead.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan={10} className="text-center py-20">
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
