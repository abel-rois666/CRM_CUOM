import React, { useState, useMemo, useEffect } from 'react';
import { View, Views } from 'react-big-calendar';
import { Lead, Profile, Status, Licenciatura, StatusCategory, WhatsAppTemplate, EmailTemplate, DashboardMetrics, Source, QuickFilterType, StatusCategoryMetadata } from '../types';
import { DataFilters } from '../hooks/useCRMData';
import ConfirmationModal from './common/ConfirmationModal';
import LeadListSkeleton, { LeadTableSkeleton, LeadKanbanSkeleton } from './LeadListSkeleton';
import KanbanBoard from './KanbanBoard';
import DashboardStats from './DashboardStats';
import CalendarView from './CalendarView';
import FilterDrawer from './FilterDrawer';
import BulkTransferModal from './BulkTransferModal';
import { supabase } from '../lib/supabase';
import BulkMessageModal from './BulkMessageModal';
import { calculateLeadScore } from '../utils/leadScoring';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useKanbanData } from '../hooks/useKanbanData';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArrowRightIcon from './icons/ChevronRightIcon';
import TagIcon from './icons/TagIcon';
import TrashIcon from './icons/TrashIcon';
import XMarkIcon from './icons/XIcon';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select } from './common/FormElements';
import CategorySettingsModal from './CategorySettingsModal';

import LeadHeader from './lead-list/LeadHeader';
import LeadToolbar, { ViewMode } from './lead-list/LeadToolbar';
import LeadTable, { SortableColumn, SortDirection } from './lead-list/LeadTable';
import LeadPagination from './lead-list/LeadPagination';

interface LeadListProps {
    loading: boolean;
    leads: Lead[];
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
    sources: Source[];
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
    metrics: DashboardMetrics | null;
    lastUpdatedLead?: Lead | null;
    statusCategories: StatusCategoryMetadata[]; // [NEW]
    onRefreshCatalogs: () => void; // [NEW]
}

const LeadList: React.FC<LeadListProps> = ({
    loading, leads, totalLeads, page, pageSize, onPageChange, onPageSizeChange, onFilterChange, currentFilters,
    advisors, statuses, licenciaturas, sources,
    whatsappTemplates, emailTemplates,
    onAddNew, onEdit, onDelete, onViewDetails,
    onOpenReports, onOpenImport, onOpenWhatsApp,
    onOpenEmail, onUpdateLead, userRole, onRefresh, onLocalDeleteMany, currentUser, metrics,
    lastUpdatedLead,
    statusCategories = [], // Default empty array to prevent crashes
    onRefreshCatalogs // [NEW]
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // [FIX] Initialize from server filter properly
    const [activeCategoryTab, setActiveCategoryTab] = useState<StatusCategory>((currentFilters.category as StatusCategory) || 'active');

    // [FIX] Sync tab if external filters change
    useEffect(() => {
        if (currentFilters.category && currentFilters.category !== activeCategoryTab) {
            setActiveCategoryTab(currentFilters.category as StatusCategory);
        }
    }, [currentFilters.category, activeCategoryTab]);

    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
    const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false); // [NEW]

    // Debounce Local para Búsqueda
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

    const { events: calendarEvents, currentDate, setCurrentDate, loading: calendarLoading } = useCalendarEvents(new Date(), currentFilters.advisorId);
    const [currentCalendarView, setCurrentCalendarView] = useState<View>(Views.MONTH);

    // KANBAN DATA HOOK
    const { leads: kanbanLeads, loading: kanbanLoading, updateLocalLead: updateKanbanLead } = useKanbanData({
        advisorId: currentFilters.advisorId,
        programId: currentFilters.programId,
        searchTerm: currentFilters.searchTerm,
        quickFilter: quickFilter, // [NEW] Pass quick filter
        userId: currentUser?.id // [NEW] Pass user ID for RPC security
    }, viewMode === 'kanban');

    // [FIX] Sync external updates to Kanban state
    useEffect(() => {
        if (lastUpdatedLead && viewMode === 'kanban') {
            updateKanbanLead(lastUpdatedLead.id, lastUpdatedLead);
        }
    }, [lastUpdatedLead, viewMode, updateKanbanLead]);

    // Helpers Maps
    const advisorMap = React.useMemo(() => new Map(advisors.map(a => [a.id, a.full_name])), [advisors]);
    const statusMap = React.useMemo(() => new Map(statuses.map(s => [s.id, { name: s.name, color: s.color, category: s.category || 'active' }])), [statuses]);
    const licenciaturaMap = React.useMemo(() => new Map(licenciaturas.map(l => [l.id, l.name])), [licenciaturas]);
    const sourceMap = React.useMemo(() => new Map(sources.map(s => [s.id, s.name])), [sources]);

    // Efecto de Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchTerm !== currentFilters.searchTerm) {
                onFilterChange({ searchTerm: localSearchTerm });
            }
            setIsSearching(false);
        }, 600);

        return () => clearTimeout(timer);
    }, [localSearchTerm, onFilterChange, currentFilters.searchTerm]);

    const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSearchTerm(e.target.value);
        setIsSearching(true);
    };

    // Filtros activos count
    const activeFilterCount = React.useMemo(() => {
        let count = 0;
        if (currentFilters.advisorId !== 'all') count++;
        if (currentFilters.statusId !== 'all') count++;
        if (currentFilters.programId !== 'all') count++;
        if (currentFilters.startDate) count++;
        if (currentFilters.endDate) count++;
        return count;
    }, [currentFilters]);

    // Urgency Logic (Needed for sorting)
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
        if (filter !== null) {
            setActiveCategoryTab('active');
            onFilterChange({ category: 'active', statusId: 'all', quickFilter: filter });
            onPageChange(1);
        } else {
            onFilterChange({ quickFilter: null });
        }
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const status = statusMap.get(lead.status_id);
            const category = status ? status.category : 'active';

            // [FIX] Ensure local updates respect the current category tab
            if (category !== activeCategoryTab) return false;

            // [REF] Server-side filtering handles quickFilter now.
            return true;
        });
    }, [leads, activeCategoryTab, statusMap]);

    const filteredKanbanLeads = useMemo(() => {
        return kanbanLeads.filter(lead => {
            const status = statusMap.get(lead.status_id);
            const category = status ? status.category : 'active';

            if (category !== activeCategoryTab) return false;

            // [REF] Server-side filtering handles quickFilter now.
            return true;
        });
    }, [kanbanLeads, activeCategoryTab, quickFilter, statusMap]);

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
                    valA = (a.first_name + ' ' + a.paternal_last_name).toLowerCase();
                    valB = (b.first_name + ' ' + b.paternal_last_name).toLowerCase();
                    break;
                case 'advisor_id':
                    valA = (advisorMap.get(a.advisor_id) || '').toLowerCase();
                    valB = (advisorMap.get(b.advisor_id) || '').toLowerCase();
                    break;
                case 'status_id':
                    valA = (statusMap.get(a.status_id)?.name || '').toLowerCase();
                    valB = (statusMap.get(b.status_id)?.name || '').toLowerCase();
                    break;
                case 'program_id':
                    valA = (licenciaturaMap.get(a.program_id) || '').toLowerCase();
                    valB = (licenciaturaMap.get(b.program_id) || '').toLowerCase();
                    break;
                case 'registration_date':
                    valA = new Date(a.registration_date).getTime();
                    valB = new Date(b.registration_date).getTime();
                    break;
                case 'score':
                    valA = calculateLeadScore(a, statuses);
                    valB = calculateLeadScore(b, statuses);
                    break;
            }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredLeads, sortColumn, sortDirection, advisorMap, statusMap, licenciaturaMap]);

    // Handlers Selection
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

    // Logic for Bulk Actions & Export reused/adapted
    const escapeCsvField = (field: string | undefined | null): string => {
        if (field === null || field === undefined) return '""';
        const stringField = String(field);
        const re = new RegExp('"', 'g');
        if (/[",\n]/.test(stringField)) {
            return '"' + stringField.replace(re, '""') + '"';
        }
        return stringField;
    };

    const handleExportCSV = () => {
        // ... (Export logic retained)
        const dataToExport = sortedLeads;
        const maxNotes = dataToExport.reduce((max, lead) => Math.max(max, lead.follow_ups?.length || 0), 0);
        const maxAppts = dataToExport.reduce((max, lead) => Math.max(max, lead.appointments?.length || 0), 0);

        let headers = ['Nombre Completo', 'Email', 'Teléfono', 'Asesor', 'Estado', 'Licenciatura', 'Fecha Registro'];

        for (let i = 1; i <= maxNotes; i++) {
            headers.push('Fecha Nota ' + i, 'Nota ' + i);
        }
        for (let i = 1; i <= maxAppts; i++) {
            headers.push('Fecha Cita ' + i, 'Detalle Cita ' + i);
        }

        const rows = dataToExport.map(lead => {
            const baseData = [
                escapeCsvField((lead.first_name + ' ' + lead.paternal_last_name + ' ' + (lead.maternal_last_name || '')).trim()),
                escapeCsvField(lead.email),
                escapeCsvField(lead.phone),
                escapeCsvField(advisorMap.get(lead.advisor_id)),
                escapeCsvField(statusMap.get(lead.status_id)?.name),
                escapeCsvField(licenciaturaMap.get(lead.program_id)),
                escapeCsvField(new Date(lead.registration_date).toLocaleDateString())
            ];
            // ... (Notes and Appts logic)
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
                    const apptDetails = `${appt.title} (${appt.status}) - ${appt.details || ''} `;
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
        const blob = new Blob([`\uFEFF${csvContent} `], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
    };

    const handleLeadMove = (leadId: string, newStatusId: string) => {
        if (viewMode === 'kanban') {
            updateKanbanLead(leadId, { status_id: newStatusId });
        }
        onUpdateLead(leadId, { status_id: newStatusId });
    };

    const relevantStatuses = useMemo(() => {
        return statuses.filter(s => (s.category || 'active') === activeCategoryTab);
    }, [statuses, activeCategoryTab]);



    // [FIX] Default categories fallback if DB is empty
    const defaultCategories: StatusCategoryMetadata[] = [
        { key: 'active', label: 'En Proceso', icon: '⚡', color: 'text-brand-primary dark:text-blue-300', order_index: 1 },
        { key: 'won', label: 'Inscritos', icon: '🎓', color: 'text-green-600 dark:text-green-400', order_index: 2 },
        { key: 'lost', label: 'Bajas', icon: '❌', color: 'text-red-600 dark:text-red-400', order_index: 3 }
    ];

    const effectiveCategories = statusCategories && statusCategories.length > 0 ? statusCategories : defaultCategories;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-8xl relative min-h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-300">

            <DashboardStats
                leads={leads}
                metrics={metrics}
                statuses={statuses}
                advisors={advisors}
                activeFilter={quickFilter}
                onFilterChange={handleDashboardCardClick}
            />

            {/* Header Section */}
            <div className="mb-8 flex flex-col gap-6">
                <LeadHeader
                    totalLeads={totalLeads}
                    globalTotal={metrics?.totalLeads || 0}
                    loadedLeadsCount={leads.length}
                    userRole={userRole}
                    onOpenImport={onOpenImport}
                    onOpenReports={onOpenReports}
                    onExportCSV={handleExportCSV}
                    onAddNew={onAddNew}
                    onOpenBulkTransfer={() => setIsBulkTransferOpen(true)}
                />

                <LeadToolbar
                    localSearchTerm={localSearchTerm}
                    isSearching={isSearching}
                    onSearchChange={handleSearchInput}
                    activeFilterCount={activeFilterCount}
                    onToggleFilters={() => setIsFilterDrawerOpen(true)}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    activeCategoryTab={activeCategoryTab}
                    onCategoryTabChange={(category) => {
                        setActiveCategoryTab(category);
                        setQuickFilter(null);
                        onFilterChange({ category, statusId: 'all', quickFilter: null });
                    }}
                    currentCalendarView={currentCalendarView as any}
                    statusCategories={effectiveCategories}
                    onOpenSettings={() => setIsCategorySettingsOpen(true)}
                />
            </div>

            {/* Visualización de Filtros Activos (Simplificado o mover a Toolbar también? Dejarlo aquí por ahora) */}
            {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {Object.entries(currentFilters).map(([key, value]) => {
                        if (value === 'all' || !value || key === 'searchTerm' || key === 'category') return null;
                        let label = '';
                        if (key === 'advisorId') label = `Asesor: ${advisorMap.get(value)} `;
                        if (key === 'statusId') label = `Estado: ${statusMap.get(value)?.name} `;
                        if (key === 'programId') label = `Programa: ${licenciaturaMap.get(value)} `;
                        if (key === 'startDate') label = `Desde: ${value} `;
                        if (key === 'endDate') label = `Hasta: ${value} `;
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

            <div key={`${viewMode} -${activeCategoryTab} `} className="animate-fade-in">
                {viewMode === 'list' ? (
                    <>
                        {/* [FIX] Show Table Skeleton only in content area */}
                        {loading && leads.length === 0 ? (
                            <LeadTableSkeleton />
                        ) : (
                            <>
                                <LeadTable
                                    leads={sortedLeads}
                                    selectedIds={selectedIds}
                                    onSelectAll={handleSelectAll}
                                    onSelectOne={handleSelectOne}
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                    onSort={handleSort}
                                    advisorMap={advisorMap}
                                    statusMap={statusMap}
                                    licenciaturaMap={licenciaturaMap}
                                    sourceMap={sourceMap}
                                    onViewDetails={onViewDetails}
                                    onOpenWhatsApp={onOpenWhatsApp}
                                    onOpenEmail={onOpenEmail}
                                    onEdit={onEdit}
                                    onDeleteClick={setLeadToDelete}
                                    localSearchTerm={localSearchTerm}
                                    activeFilterCount={activeFilterCount}
                                    loading={loading} // [NEW] Pass loading state
                                    onClearFilters={() => {
                                        setLocalSearchTerm('');
                                        onFilterChange({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' });
                                        setQuickFilter(null);
                                    }}
                                />

                                <LeadPagination
                                    totalLeads={totalLeads}
                                    page={page}
                                    pageSize={pageSize}
                                    onPageChange={onPageChange}
                                    onPageSizeChange={onPageSizeChange}
                                />
                            </>
                        )}
                    </>
                ) : viewMode === 'kanban' ? (
                    <div className="h-full">
                        {/* [FIX] Show Skeleton instead of Spinner for initial load */}
                        {loading && leads.length === 0 ? (
                            <LeadKanbanSkeleton />
                        ) : (
                            <KanbanBoard
                                leads={filteredKanbanLeads}
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
                        )}
                    </div>
                ) : (
                    <CalendarView
                        events={calendarEvents}
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                        view={currentCalendarView}
                        onViewChange={setCurrentCalendarView}
                        onEventClick={(lead) => onViewDetails(lead)}
                        loading={calendarLoading}
                    />
                )}
            </div>

            {/* Modales y Drawers */}
            <FilterDrawer
                isOpen={isFilterDrawerOpen}
                onClose={() => setIsFilterDrawerOpen(false)}
                currentFilters={currentFilters}
                onApplyFilters={onFilterChange}
                onClearFilters={() => {
                    setLocalSearchTerm('');
                    onFilterChange({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' });
                    setQuickFilter(null);
                }}
                advisors={advisors}
                statuses={statuses}
                licenciaturas={licenciaturas}
            />

            {/* Modal de Confirmación de Eliminación Individual */}
            <ConfirmationModal
                isOpen={!!leadToDelete}
                onClose={() => setLeadToDelete(null)}
                onConfirm={() => leadToDelete && confirmIndividualDelete(leadToDelete)}
                title="Eliminar Lead"
                message="¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer."
                confirmButtonText="Eliminar"
                cancelButtonText="Cancelar"
                confirmButtonVariant="danger"
            />

            {/* Modal de Confirmación de Eliminación BULK */}
            <ConfirmationModal
                isOpen={isBulkDeleteOpen}
                onClose={() => setIsBulkDeleteOpen(false)}
                onConfirm={async () => {
                    setProcessingBulk(true);
                    try {
                        const ids = Array.from(selectedIds);
                        const { error } = await supabase.from('leads').delete().in('id', ids);
                        if (error) throw error;

                        if (onLocalDeleteMany) onLocalDeleteMany(ids);
                        setSelectedIds(new Set());
                        setIsBulkDeleteOpen(false);
                        alert(`Se eliminaron ${ids.length} prospectos correctamente.`);
                    } catch (err: any) {
                        alert("Error al eliminar masivamente: " + err.message);
                    } finally {
                        setProcessingBulk(false);
                    }
                }}
                title={`Eliminar ${selectedIds.size} Leads`}
                message={`¿Estás seguro de que deseas eliminar ${selectedIds.size} prospectos seleccionados ? ESTA ACCIÓN ES IRREVERSIBLE.`}
                confirmButtonText={processingBulk ? "Eliminando..." : "Eliminar Todos"}
                cancelButtonText="Cancelar"
                confirmButtonVariant="danger"
            />

            {/* Modal de Cambio de Estado BULK */}
            <Modal
                isOpen={isBulkStatusOpen}
                onClose={() => setIsBulkStatusOpen(false)}
                title={`Cambiar Estado a ${selectedIds.size} Leads`}
                size="md"
            >
                <div className="p-4">
                    <p className="text-sm text-gray-500 mb-4">Selecciona el nuevo estado para los prospectos seleccionados.</p>
                    <Select
                        label="Nuevo Estado"
                        value={bulkTargetStatus}
                        onChange={(e) => setBulkTargetStatus(e.target.value)}
                        options={statuses.map(s => ({ value: s.id, label: s.name }))}
                    />
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="ghost" onClick={() => setIsBulkStatusOpen(false)}>Cancelar</Button>
                        <Button
                            variant="primary"
                            disabled={!bulkTargetStatus || processingBulk}
                            onClick={async () => {
                                setProcessingBulk(true);
                                try {
                                    const ids = Array.from(selectedIds);
                                    const { error } = await supabase.from('leads').update({ status_id: bulkTargetStatus }).in('id', ids);
                                    if (error) throw error;

                                    // Actualizar localmente si es posible, si no Refresh
                                    if (onRefresh) onRefresh();

                                    // Feedback visual rápido
                                    ids.forEach(id => onUpdateLead(id, { status_id: bulkTargetStatus }));

                                    setSelectedIds(new Set());
                                    setIsBulkStatusOpen(false);
                                } catch (err: any) {
                                    alert("Error al actualizar estados: " + err.message);
                                } finally {
                                    setProcessingBulk(false);
                                }
                            }}
                        >
                            {processingBulk ? "Guardando..." : "Aplicar Cambio"}
                        </Button>
                    </div>
                </div>
            </Modal>


            <BulkTransferModal
                isOpen={isBulkTransferOpen}
                onClose={() => setIsBulkTransferOpen(false)}
                advisors={advisors}
                onSuccess={() => {
                    if (onRefresh) onRefresh();
                    setIsBulkTransferOpen(false);
                }}
            />

            <BulkMessageModal
                isOpen={isBulkMessageOpen}
                onClose={() => setIsBulkMessageOpen(false)}
                mode={bulkMessageMode}
                leads={leads.filter(l => selectedIds.has(l.id))}
                whatsappTemplates={whatsappTemplates}
                emailTemplates={emailTemplates}
                onComplete={() => {
                    setSelectedIds(new Set());
                    setIsBulkMessageOpen(false);
                }}
                currentUser={currentUser || null}
            />

            {/* BARRA FLOTANTE DE ACCIONES MASIVAS */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 shadow-2xl rounded-full px-6 py-3 z-50 flex items-center gap-4 border border-gray-200 dark:border-slate-700 animate-slide-up">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {selectedIds.size} seleccionados
                    </span>
                    <div className="h-4 w-px bg-gray-300 dark:bg-slate-600 mx-2"></div>

                    <button onClick={() => setIsBulkStatusOpen(true)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                        <TagIcon className="w-4 h-4" /> <span className="hidden sm:inline">Estado</span>
                    </button>

                    <button onClick={() => { setBulkMessageMode('whatsapp'); setIsBulkMessageOpen(true); }} className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400 font-medium transition-colors">
                        <ChatBubbleLeftRightIcon className="w-4 h-4" /> <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    <button onClick={() => { setBulkMessageMode('email'); setIsBulkMessageOpen(true); }} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 font-medium transition-colors">
                        <EnvelopeIcon className="w-4 h-4" /> <span className="hidden sm:inline">Email</span>
                    </button>

                    <div className="h-4 w-px bg-gray-300 dark:bg-slate-600 mx-2"></div>

                    <button onClick={() => setIsBulkDeleteOpen(true)} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                        <TrashIcon className="w-4 h-4" /> <span className="hidden sm:inline">Eliminar</span>
                    </button>

                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-400 transition-colors" title="Cancelar selección">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* NEW: Category Settings Modal */}
            <CategorySettingsModal
                isOpen={isCategorySettingsOpen}
                onClose={() => setIsCategorySettingsOpen(false)}
                categories={effectiveCategories}
                onUpdate={onRefreshCatalogs}
            />
        </div>
    );
};

export default LeadList;