// components/LeadList.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Profile, Status, Licenciatura, StatusCategory, WhatsAppTemplate, EmailTemplate } from '../types';
import { DataFilters } from '../hooks/useCRMData';
import Button from './common/Button';
import Badge from './common/Badge';
import ConfirmationModal from './common/ConfirmationModal';
import Modal from './common/Modal';
import { Select } from './common/FormElements';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import CalendarIcon from './icons/CalendarIcon';
import ChevronUpDownIcon from './icons/ChevronUpDownIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import LeadListSkeleton from './LeadListSkeleton';
import BellAlertIcon from './icons/BellAlertIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import ArrowUpTrayIcon from './icons/ArrowUpTrayIcon';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import KanbanBoard from './KanbanBoard';
import ListBulletIcon from './icons/ListBulletIcon';
import Squares2x2Icon from './icons/Squares2x2Icon';
import DashboardStats, { QuickFilterType } from './DashboardStats';
import CalendarView from './CalendarView';
import XIcon from './icons/XIcon';
import FilterDrawer, { FilterState } from './FilterDrawer';
import FunnelIcon from './icons/FunnelIcon';
import MagnifyingGlassIcon from './icons/MagnifyingGlassIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import ClockIcon from './icons/ClockIcon';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import BulkTransferModal from './BulkTransferModal';
import TransferIcon from './icons/TransferIcon';
import TagIcon from './icons/TagIcon';
import { supabase } from '../lib/supabase';
import BulkMessageModal from './BulkMessageModal';
import ArrowPathIcon from './icons/ArrowPathIcon';

interface LeadListProps {
    loading: boolean;
    leads: Lead[];
    // Props de Paginación Server-Side (NUEVOS)
    totalLeads: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    onFilterChange: (filters: Partial<DataFilters>) => void;
    currentFilters: DataFilters;

    advisors: Profile[];
    statuses: Status[];
    licenciaturas: Licenciatura[];
    whatsappTemplates: WhatsAppTemplate[];
    emailTemplates: EmailTemplate[];
    onAddNew: () => void;
    onEdit: (lead: Lead) => void;
    onDelete: (leadId: string) => void;
    onViewDetails: (lead: Lead, tab?: 'info' | 'activity' | 'appointments') => void;
    onOpenReports: () => void;
    onOpenImport: () => void;
    onOpenWhatsApp: (lead: Lead) => void;
    onOpenEmail: (lead: Lead) => void;
    onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
    userRole?: 'admin' | 'advisor' | 'moderator';
    onRefresh?: () => void;
    onLocalDeleteMany?: (ids: string[]) => void;
    currentUser?: Profile | null;
}

type SortableColumn = 'name' | 'advisor_id' | 'status_id' | 'program_id' | 'registration_date' | 'urgency';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'kanban' | 'calendar';

const LeadList: React.FC<LeadListProps> = ({
    loading, leads, totalLeads, page, pageSize, onPageChange, onPageSizeChange, onFilterChange, currentFilters,
    advisors, statuses, licenciaturas,
    whatsappTemplates, emailTemplates,
    onAddNew, onEdit, onDelete, onViewDetails,
    onOpenReports, onOpenImport, onOpenWhatsApp,
    onOpenEmail, onUpdateLead, userRole, onRefresh, onLocalDeleteMany, currentUser
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [activeCategoryTab, setActiveCategoryTab] = useState<StatusCategory>('active');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);

    // Debounce Local para Búsqueda (Para no saturar el servidor con cada tecla)
    const [localSearchTerm, setLocalSearchTerm] = useState<string>(currentFilters.searchTerm);
    const [isSearching, setIsSearching] = useState(false);

    const [quickFilter, setQuickFilter] = useState<QuickFilterType>(null);
    const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
    const [bulkTargetStatus, setBulkTargetStatus] = useState<string>('');
    const [processingBulk, setProcessingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);

    const [isBulkMessageOpen, setIsBulkMessageOpen] = useState(false);
    const [bulkMessageMode, setBulkMessageMode] = useState<'whatsapp' | 'email'>('whatsapp');

    const [sortColumn, setSortColumn] = useState<SortableColumn>('registration_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Helpers de Mapas para renderizado rápido
    const advisorMap = React.useMemo(() => new Map(advisors.map(a => [a.id, a.full_name])), [advisors]);
    const statusMap = React.useMemo(() => new Map(statuses.map(s => [s.id, { name: s.name, color: s.color, category: s.category || 'active' }])), [statuses]);
    const licenciaturaMap = React.useMemo(() => new Map(licenciaturas.map(l => [l.id, l.name])), [licenciaturas]);

    // Efecto de Debounce para búsqueda Server-Side
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchTerm !== currentFilters.searchTerm) {
                onFilterChange({ searchTerm: localSearchTerm });
            }
            setIsSearching(false);
        }, 600); // Espera 600ms después de dejar de escribir para pedir al servidor

        return () => clearTimeout(timer);
    }, [localSearchTerm, onFilterChange, currentFilters.searchTerm]);

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSearchTerm(e.target.value);
        setIsSearching(true);
    };

    // Contar filtros activos visualmente
    const activeFilterCount = React.useMemo(() => {
        let count = 0;
        if (currentFilters.advisorId !== 'all') count++;
        if (currentFilters.statusId !== 'all') count++;
        if (currentFilters.programId !== 'all') count++;
        if (currentFilters.startDate) count++;
        if (currentFilters.endDate) count++;
        return count;
    }, [currentFilters]);

    // Función de urgencia (Cálculo visual)
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

    const handleDashboardCardClick = (filter: QuickFilterType) => {
        setQuickFilter(filter);
        // Al filtrar desde el dashboard, reseteamos a la pestaña activa principal y página 1
        if (filter !== null) {
            setActiveCategoryTab('active');
            onPageChange(1);
        }
    };

    // Filtrado CLIENT-SIDE adicional (solo para la vista actual, ej: tabs de categoría)
    // El filtrado "pesado" ya se hizo en el servidor (useCRMData)
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const status = statusMap.get(lead.status_id);
            const category = status ? status.category : 'active';

            // Filtro por pestaña (Activos / Ganados / Perdidos)
            if (category !== activeCategoryTab) return false;

            // Filtro Rápido (Dashboard) sobre la página actual
            if (quickFilter) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const regDate = new Date(lead.registration_date);

                if (quickFilter === 'appointments_today') {
                    const hasAppt = lead.appointments?.some(appt => {
                        const apptDate = new Date(appt.date);
                        apptDate.setHours(0, 0, 0, 0);
                        return appt.status === 'scheduled' && apptDate.getTime() === today.getTime();
                    });
                    if (!hasAppt) return false;
                }
                if (quickFilter === 'no_followup') {
                    const hasNoFollowUps = !lead.follow_ups || lead.follow_ups.length === 0;
                    if (!(hasNoFollowUps && regDate < threeDaysAgo)) return false;
                }
                if (quickFilter === 'stale_followup') {
                    if (!lead.follow_ups || lead.follow_ups.length === 0) return false;
                    const lastFollowUp = [...lead.follow_ups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    const lastDate = new Date(lastFollowUp.date);
                    if (!(lastDate < sevenDaysAgo)) return false;
                }
            }
            return true;
        });
    }, [leads, activeCategoryTab, quickFilter, statusMap]);

    // Ordenamiento local de la página actual (Visual)
    const sortedLeads = useMemo(() => {
        return [...filteredLeads].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';
            if (sortColumn === 'urgency') {
                valA = getLeadUrgency(a);
                valB = getLeadUrgency(b);
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            switch (sortColumn) {
                case 'name':
                    valA = `${a.first_name} ${a.paternal_last_name}`.toLowerCase();
                    valB = `${b.first_name} ${b.paternal_last_name}`.toLowerCase();
                    break;
                case 'advisor_id':
                    valA = advisorMap.get(a.advisor_id)?.toLowerCase() || '';
                    valB = advisorMap.get(b.advisor_id)?.toLowerCase() || '';
                    break;
                case 'status_id':
                    valA = statusMap.get(a.status_id)?.name.toLowerCase() || '';
                    valB = statusMap.get(b.status_id)?.name.toLowerCase() || '';
                    break;
                case 'program_id':
                    valA = licenciaturaMap.get(a.program_id)?.toLowerCase() || '';
                    valB = licenciaturaMap.get(b.program_id)?.toLowerCase() || '';
                    break;
                case 'registration_date':
                    valA = new Date(a.registration_date).getTime();
                    valB = new Date(b.registration_date).getTime();
                    break;
            }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredLeads, sortColumn, sortDirection, advisorMap, statusMap, licenciaturaMap]);

    const totalPages = Math.ceil(totalLeads / pageSize);

    // Manejo de selección múltiple
    const handleSelectAll = () => {
        const allPageSelected = sortedLeads.length > 0 && sortedLeads.every(lead => selectedIds.has(lead.id));
        const newSelected = new Set(selectedIds);
        if (allPageSelected) {
            sortedLeads.forEach(lead => newSelected.delete(lead.id));
        } else {
            sortedLeads.forEach(lead => newSelected.add(lead.id));
        }
        setSelectedIds(newSelected);
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    // --- LOGICA DE ACCIONES MASIVAS (Usando Supabase Directo para grandes volúmenes) ---
    const executeBulkDelete = async () => {
        setProcessingBulk(true);
        setBulkProgress(0);
        const ids = Array.from(selectedIds);
        const BATCH_SIZE = 50;
        let errorOccurred = false;

        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const chunk = ids.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('leads').delete().in('id', chunk);
            if (error) {
                alert(`Error: ${error.message}`);
                errorOccurred = true;
                break;
            }
            setBulkProgress(Math.round(((i + chunk.length) / ids.length) * 100));
        }

        if (!errorOccurred) {
            if (onLocalDeleteMany) onLocalDeleteMany(ids);
            if (onRefresh) onRefresh(); // Refrescar la paginación del servidor
            setSelectedIds(new Set());
            setIsBulkDeleteOpen(false);
        }
        setProcessingBulk(false);
        setBulkProgress(0);
    };

    const executeBulkStatusChange = async () => {
        if (!bulkTargetStatus) return;
        setProcessingBulk(true);
        setBulkProgress(0);
        const ids = Array.from(selectedIds);
        const BATCH_SIZE = 50;
        let errorOccurred = false;

        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const chunk = ids.slice(i, i + BATCH_SIZE);
            const { error: updateError } = await supabase
                .from('leads')
                .update({ status_id: bulkTargetStatus })
                .in('id', chunk);

            if (updateError) {
                alert(`Error al actualizar lote ${i}: ` + updateError.message);
                errorOccurred = true;
                break;
            }

            // Insertar historial para cada lead actualizado
            const historyEntries = chunk.map(id => ({
                lead_id: id,
                new_status_id: bulkTargetStatus,
                old_status_id: null,
                date: new Date().toISOString(),
            }));

            await supabase.from('status_history').insert(historyEntries);
            setBulkProgress(Math.round(((i + chunk.length) / ids.length) * 100));
        }

        if (!errorOccurred) {
            if (onRefresh) onRefresh();
            setSelectedIds(new Set());
            setIsBulkStatusOpen(false);
            setBulkTargetStatus('');
        }
        setProcessingBulk(false);
        setBulkProgress(0);
    };

    const confirmIndividualDelete = async (id: string) => {
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) { alert("Error al eliminar: " + error.message); }
        else {
            onDelete(id);
            if (onRefresh) onRefresh();
        }
        setLeadToDelete(null);
    };

    const handleSort = (column: SortableColumn) => {
        if (column === sortColumn) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
            if (column === 'urgency') setSortDirection('desc');
        }
    };

    const escapeCsvField = (field: string | undefined | null): string => {
        if (field === null || field === undefined) return '""';
        const stringField = String(field);
        if (/[",\n]/.test(stringField)) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    // --- EXPORTACIÓN ---
    const handleExportCSV = () => {
        // NOTA: Exportamos los datos de la PÁGINA ACTUAL + Filtros locales.
        // Para exportar TODO (100k leads) se necesitaría un proceso de backend dedicado.
        const dataToExport = sortedLeads;
        const maxNotes = dataToExport.reduce((max, lead) => Math.max(max, lead.follow_ups?.length || 0), 0);
        const maxAppts = dataToExport.reduce((max, lead) => Math.max(max, lead.appointments?.length || 0), 0);

        let headers = ['Nombre Completo', 'Email', 'Teléfono', 'Asesor', 'Estado', 'Licenciatura', 'Fecha Registro'];

        for (let i = 1; i <= maxNotes; i++) {
            headers.push(`Fecha Nota ${i}`, `Nota ${i}`);
        }
        for (let i = 1; i <= maxAppts; i++) {
            headers.push(`Fecha Cita ${i}`, `Detalle Cita ${i}`);
        }

        const rows = dataToExport.map(lead => {
            const baseData = [
                escapeCsvField(`${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name || ''}`.trim()),
                escapeCsvField(lead.email),
                escapeCsvField(lead.phone),
                escapeCsvField(advisorMap.get(lead.advisor_id)),
                escapeCsvField(statusMap.get(lead.status_id)?.name),
                escapeCsvField(licenciaturaMap.get(lead.program_id)),
                escapeCsvField(new Date(lead.registration_date).toLocaleDateString())
            ];

            const sortedNotes = lead.follow_ups
                ? [...lead.follow_ups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                : [];

            const noteCols: string[] = [];
            for (let i = 0; i < maxNotes; i++) {
                if (i < sortedNotes.length) {
                    const note = sortedNotes[i];
                    noteCols.push(
                        escapeCsvField(new Date(note.date).toLocaleDateString()),
                        escapeCsvField(note.notes)
                    );
                } else {
                    noteCols.push('""', '""');
                }
            }

            const sortedAppts = lead.appointments
                ? [...lead.appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                : [];

            const apptCols: string[] = [];
            for (let i = 0; i < maxAppts; i++) {
                if (i < sortedAppts.length) {
                    const appt = sortedAppts[i];
                    const apptDetails = `${appt.title} (${appt.status}) - ${appt.details || ''}`;
                    apptCols.push(
                        escapeCsvField(new Date(appt.date).toLocaleString()),
                        escapeCsvField(apptDetails)
                    );
                } else {
                    apptCols.push('""', '""');
                }
            }

            return [...baseData, ...noteCols, ...apptCols].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
    };

    const SortableHeader: React.FC<{ column: SortableColumn; label: string; className?: string }> = ({ column, label, className }) => {
        const isSorted = sortColumn === column;
        const icon = isSorted
            ? <ChevronDownIcon className={`w-4 h-4 text-brand-secondary transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
            : <ChevronUpDownIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />;

        return (
            <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group ${className}`} onClick={() => handleSort(column)}>
                <div className="flex items-center gap-1">
                    <span className="group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">{label}</span>
                    {icon}
                </div>
            </th>
        )
    }

    const handleLeadMove = (leadId: string, newStatusId: string) => {
        onUpdateLead(leadId, { status_id: newStatusId });
    };

    const relevantStatuses = useMemo(() => {
        return statuses.filter(s => (s.category || 'active') === activeCategoryTab);
    }, [statuses, activeCategoryTab]);

    if (loading && leads.length === 0) return <LeadListSkeleton viewMode={viewMode} />;

    return (

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-8xl relative min-h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-300">


            {/* Dashboard Stats */}
            <DashboardStats
                leads={leads}
                statuses={statuses}
                advisors={advisors}
                activeFilter={quickFilter}
                onFilterChange={handleDashboardCardClick}
            />

            {/* Header Section */}
            <div className="mb-8 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Clientes Potenciales</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            Total en Base: <span className="font-bold text-brand-primary dark:text-blue-400">{totalLeads}</span> | Cargados: <span className="font-bold text-gray-700 dark:text-gray-300">{leads.length}</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {userRole === 'admin' && (
                            <Button onClick={() => setIsBulkTransferOpen(true)} variant="secondary" size="sm" className="px-3 sm:px-4 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-900/20 dark:hover:text-white dark:text-white dark:border-amber-800 dark:hover:bg-amber-900/40 dark:hover:border-shadow-lg dark:hover:shadow-brand-secondary/20 dark:hover:hidden dark:hover:md:flex" title="Reasignar Leads">
                                <TransferIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Reasignar</span>
                            </Button>
                        )}
                        <Button onClick={onOpenImport} variant="secondary" size="sm" className="px-3 sm:px-4">
                            <ArrowUpTrayIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Importar</span>
                        </Button>
                        <Button onClick={onOpenReports} variant="secondary" size="sm" className="px-3 sm:px-4">
                            <ChartBarIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Reporte</span>
                        </Button>
                        {userRole === 'admin' && (
                            <Button onClick={handleExportCSV} variant="secondary" size="sm" className="px-3 sm:px-4">
                                <ArrowDownTrayIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Exportar (Pagina)</span>
                            </Button>
                        )}
                        <Button onClick={onAddNew} leftIcon={<PlusIcon className="w-5 h-5" />} className="shadow-lg shadow-brand-secondary/20 hidden md:flex">
                            Nuevo Lead
                        </Button>
                    </div>
                </div>

                {/* Filters & Tabs */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-center">
                        <div className="relative flex-grow w-full sm:w-auto group">

                            {isSearching ? (
                                // Icono de carga (Spinner) - Se muestra si hay texto
                                <ArrowPathIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-secondary animate-spin" />
                            ) : (
                                // Icono de lupa - Se muestra si el campo está vacío
                                <MagnifyingGlassIcon className="absolute top-1/2 left-1/45 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            )}

                            <input
                                type="text"
                                className="block w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-brand-secondary/10 focus:border-brand-secondary transition-all text-sm"
                                placeholder="Buscar en el servidor (Nombre, Email, Tel)..."
                                value={localSearchTerm}
                                onChange={handleSearchInput}
                            />
                        </div>

                        <div className="flex items-center w-full sm:w-auto gap-3 justify-between sm:justify-end">
                            <button
                                onClick={() => setIsFilterDrawerOpen(true)}
                                className={`relative inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${activeFilterCount > 0
                                    ? 'bg-brand-secondary/10 text-brand-secondary ring-1 ring-brand-secondary/20 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                                    }`}
                            >
                                <FunnelIcon className="w-4 h-4 mr-2" />
                                Filtros
                                {activeFilterCount > 0 && <span className="ml-2 bg-brand-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
                            </button>

                            <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>

                            <div className="bg-gray-100 dark:bg-slate-700 p-1 rounded-lg flex items-center gap-1">
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <ListBulletIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Squares2x2Icon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                                    <CalendarIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs de Estado */}
                    <div className="border-b border-gray-200 dark:border-slate-700 overflow-x-auto scrollbar-hide">
                        <nav className="-mb-px flex space-x-8 px-2 min-w-max" aria-label="Tabs">
                            {[
                                { id: 'active', label: 'En Proceso (Activos)', color: 'border-brand-secondary text-brand-secondary dark:text-blue-400' },
                                { id: 'won', label: 'Inscritos (Ganados)', color: 'border-green-500 text-green-600 dark:text-green-400' },
                                { id: 'lost', label: 'Bajas / Archivo', color: 'border-red-500 text-red-600 dark:text-red-400' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveCategoryTab(tab.id as StatusCategory); setQuickFilter(null); }}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeCategoryTab === tab.id ? tab.color : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>

            {/* Visualización de Filtros Activos */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {Object.entries(currentFilters).map(([key, value]) => {
                        if (value === 'all' || !value || key === 'searchTerm') return null;
                        let label = '';
                        if (key === 'advisorId') label = `Asesor: ${advisorMap.get(value)}`;
                        if (key === 'statusId') label = `Estado: ${statusMap.get(value)?.name}`;
                        if (key === 'programId') label = `Programa: ${licenciaturaMap.get(value)}`;
                        if (key === 'startDate') label = `Desde: ${value}`;
                        if (key === 'endDate') label = `Hasta: ${value}`;
                        return (
                            <span key={key} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-700/10 animate-fade-in">
                                {label}
                            </span>
                        )
                    })}
                    <button onClick={() => onFilterChange({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' })} className="text-xs text-gray-500 hover:text-red-600 hover:underline ml-2 transition-colors">
                        Limpiar todo
                    </button>
                </div>
            )}

            <div key={`${viewMode}-${activeCategoryTab}`} className="animate-fade-in">
                {viewMode === 'list' ? (
                    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 flex flex-col">
                        <div className="overflow-x-auto">
                            {/* CORRECCIÓN APLICADA: dark:divide-transparent en la tabla */}
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-transparent">
                                <thead className="bg-gray-50/50 dark:bg-slate-700/50">
                                    <tr>
                                        {/* CHECKBOX HEADER (Visible para todos) */}
                                        <th scope="col" className="px-4 py-4 text-left w-10">
                                            <input
                                                type="checkbox"
                                                checked={sortedLeads.length > 0 && sortedLeads.every(l => selectedIds.has(l.id))}
                                                onChange={handleSelectAll}
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

                                {/* CORRECCIÓN APLICADA: dark:divide-none en el tbody */}
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-none">
                                    {sortedLeads.map((lead) => {
                                        const urgencyLevel = getLeadUrgency(lead);
                                        const status = statusMap.get(lead.status_id);

                                        // Ajuste: Aseguramos que el borde en modo oscuro sea transparente o del mismo color del fondo
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
                                                {/* CHECKBOX ROW (Visible para todos) */}
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(lead.id)}
                                                        onChange={() => handleSelectOne(lead.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                                                    />
                                                </td>

                                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                                    <div className="flex justify-center">{urgencyIndicator}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center cursor-pointer" onClick={() => onViewDetails(lead)}>
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
                                                        <button onClick={() => setLeadToDelete(lead.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {sortedLeads.length === 0 && (
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
                                                            onClick={() => {
                                                                setLocalSearchTerm('');
                                                                onFilterChange({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' });
                                                                setQuickFilter(null);
                                                            }}
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

                        {/* PAGINACIÓN SERVER-SIDE - Footer */}
                        <div className="bg-gray-50 dark:bg-slate-800 px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1">
                                Mostrando <span className="font-medium text-gray-900 dark:text-white">{Math.min((page - 1) * pageSize + 1, totalLeads)}</span> a <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * pageSize, totalLeads)}</span> de <span className="font-medium text-gray-900 dark:text-white">{totalLeads}</span> resultados
                            </div>

                            <div className="flex items-center gap-4 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">
                                <select
                                    value={pageSize}
                                    onChange={e => onPageSizeChange(Number(e.target.value))}
                                    className="pl-3 pr-8 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 rounded-lg focus:ring-4 focus:ring-brand-secondary/10 focus:border-brand-secondary cursor-pointer shadow-sm focus:outline-none"
                                >
                                    <option value={10}>10 por pág</option>
                                    <option value={25}>25 por pág</option>
                                    <option value={50}>50 por pág</option>
                                    <option value={100}>100 por pág</option>
                                </select>

                                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm p-0.5">
                                    <button
                                        onClick={() => onPageChange(Math.max(page - 1, 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 transition-colors text-gray-600 dark:text-gray-400"
                                    >
                                        <ChevronLeftIcon className="w-4 h-4" />
                                    </button>
                                    <span className="px-4 text-sm font-medium text-gray-700 dark:text-gray-200 border-x border-gray-100 dark:border-slate-700 h-full flex items-center">
                                        {page}
                                    </span>
                                    <button
                                        onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                                        disabled={page >= totalPages}
                                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 transition-colors text-gray-600 dark:text-gray-400"
                                    >
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : viewMode === 'kanban' ? (  // <--- AGREGAMOS ESTA CONDICIÓN
                    <KanbanBoard
                        leads={sortedLeads}
                        statuses={relevantStatuses}
                        advisors={advisors}
                        licenciaturas={licenciaturas}
                        onEdit={onEdit}
                        onDelete={(id) => setLeadToDelete(id)}
                        onViewDetails={onViewDetails}
                        onOpenWhatsApp={onOpenWhatsApp}
                        onOpenEmail={onOpenEmail}
                        onLeadMove={handleLeadMove}
                    />
                ) : (

                    <CalendarView
                        appointments={leads.flatMap(l => l.appointments || [])}
                        leads={leads}
                        onEventClick={(lead) => onViewDetails(lead, 'appointments')}
                    />
                )}
            </div>

            {/* BARRA FLOTANTE DE ACCIONES MASIVAS */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-slate-800 shadow-2xl rounded-full px-6 py-3 border border-gray-200 dark:border-slate-600 flex items-center gap-4 animate-slide-up">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                        {selectedIds.size} seleccionados
                    </span>

                    <div className="h-6 w-px bg-gray-200 dark:bg-slate-600"></div>

                    <button
                        onClick={() => setIsBulkStatusOpen(true)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-brand-secondary dark:hover:text-blue-400 transition-colors"
                    >
                        <TagIcon className="w-5 h-5" />
                        Cambiar Estado
                    </button>

                    {userRole === 'admin' && (
                        <button
                            onClick={() => setIsBulkDeleteOpen(true)}
                            className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
                        >
                            <TrashIcon className="w-5 h-5" />
                            Eliminar
                        </button>
                    )}

                    <button
                        onClick={() => {
                            setBulkMessageMode('whatsapp');
                            setIsBulkMessageOpen(true);
                        }}
                        className="flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-800 transition-colors"
                    >
                        <ChatBubbleLeftRightIcon className="w-5 h-5" /> WhatsApp
                    </button>

                    <button
                        onClick={() => {
                            setBulkMessageMode('email');
                            setIsBulkMessageOpen(true);
                        }}
                        className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <EnvelopeIcon className="w-5 h-5" /> Correo
                    </button>

                    <div className="h-6 w-px bg-gray-200"></div>

                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {/* --- MODALES --- */}

            <ConfirmationModal
                isOpen={isBulkDeleteOpen}
                onClose={() => setIsBulkDeleteOpen(false)}
                onConfirm={executeBulkDelete}
                title={`¿Eliminar ${selectedIds.size} leads?`}
                message={
                    <>
                        Estás a punto de eliminar permanentemente <strong>{selectedIds.size} leads</strong>.
                        <br />
                        <span className="text-red-600 font-bold">Esta acción no se puede deshacer.</span>
                        {processingBulk && <div className="mt-2 text-xs text-gray-500">Procesando lote... {bulkProgress}%</div>}
                    </>
                }
                confirmButtonText={processingBulk ? `Eliminando...` : "Sí, Eliminar Todo"}
                confirmButtonVariant="danger"
            />

            <Modal
                isOpen={isBulkStatusOpen}
                onClose={() => setIsBulkStatusOpen(false)}
                title="Cambio de Estado Masivo"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Selecciona el nuevo estado para los <strong>{selectedIds.size} leads</strong> seleccionados.
                    </p>

                    <Select
                        label="Nuevo Estado"
                        value={bulkTargetStatus}
                        onChange={e => setBulkTargetStatus(e.target.value)}
                        options={[{ value: '', label: '-- Seleccionar --' }, ...statuses.map(s => ({ value: s.id, label: s.name }))]}
                    />

                    {processingBulk && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div className="bg-brand-secondary h-1.5 rounded-full transition-all duration-300" style={{ width: `${bulkProgress}%` }}></div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setIsBulkStatusOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={executeBulkStatusChange}
                            disabled={!bulkTargetStatus || processingBulk}
                        >
                            {processingBulk ? 'Actualizando...' : 'Confirmar Cambio'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <BulkMessageModal
                isOpen={isBulkMessageOpen}
                onClose={() => setIsBulkMessageOpen(false)}
                mode={bulkMessageMode}
                leads={leads.filter(l => selectedIds.has(l.id))}
                whatsappTemplates={whatsappTemplates}
                emailTemplates={emailTemplates}
                onComplete={() => {
                    // Opcional
                }}
                currentUser={currentUser || null}
            />

            <FilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                advisors={advisors}
                statuses={statuses}
                licenciaturas={licenciaturas}
                currentFilters={currentFilters}
                onApplyFilters={(f) => onFilterChange(f)}
                onClearFilters={() => onFilterChange({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' })}
            />

            <ConfirmationModal
                isOpen={!!leadToDelete}
                onClose={() => setLeadToDelete(null)}
                onConfirm={() => {
                    if (leadToDelete) confirmIndividualDelete(leadToDelete);
                }}
                title="¿Eliminar Lead?"
                message="Estás a punto de eliminar este lead permanentemente. ¿Estás seguro?"
                confirmButtonText="Sí, Eliminar"
                confirmButtonVariant="danger"
            />

            <BulkTransferModal
                isOpen={isBulkTransferOpen}
                onClose={() => setIsBulkTransferOpen(false)}
                advisors={advisors}
                onSuccess={() => {
                    if (onRefresh) onRefresh();
                    else window.location.reload();
                }}
            />

            <button
                onClick={onAddNew}
                className="fixed bottom-6 right-6 md:hidden z-30 bg-brand-secondary text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary"
                aria-label="Crear Nuevo Lead"
            >
                <PlusIcon className="w-6 h-6" />
            </button>

        </div>
    );
};

export default LeadList;