// components/LeadList.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Profile, Status, Licenciatura, StatusCategory, WhatsAppTemplate, EmailTemplate, DashboardMetrics } from '../types';
import { DataFilters } from '../hooks/useCRMData';
import ConfirmationModal from './common/ConfirmationModal';
import LeadListSkeleton from './LeadListSkeleton';
import KanbanBoard from './KanbanBoard';
import DashboardStats, { QuickFilterType } from './DashboardStats';
import CalendarView from './CalendarView';
import FilterDrawer from './FilterDrawer';
import BulkTransferModal from './BulkTransferModal';
import { supabase } from '../lib/supabase';
import BulkMessageModal from './BulkMessageModal';

// Components Refactorizados
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
    metrics: DashboardMetrics | null; // <--- NEW PROP
}

const LeadList: React.FC<LeadListProps> = ({
    loading, leads, totalLeads, page, pageSize, onPageChange, onPageSizeChange, onFilterChange, currentFilters,
    advisors, statuses, licenciaturas,
    whatsappTemplates, emailTemplates,
    onAddNew, onEdit, onDelete, onViewDetails,
    onOpenReports, onOpenImport, onOpenWhatsApp,
    onOpenEmail, onUpdateLead, userRole, onRefresh, onLocalDeleteMany, currentUser, metrics
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [activeCategoryTab, setActiveCategoryTab] = useState<StatusCategory>('active');
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);

    // Debounce Local para Búsqueda
    const [localSearchTerm, setLocalSearchTerm] = useState<string>(currentFilters.searchTerm);
    const [isSearching, setIsSearching] = useState(false);

    const [quickFilter, setQuickFilter] = useState<QuickFilterType>(null);
    const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    // States unused in refactor but kept for completeness of logic if needed later or removing if dead code
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
    const [bulkTargetStatus, setBulkTargetStatus] = useState<string>('');
    const [processingBulk, setProcessingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);

    const [isBulkMessageOpen, setIsBulkMessageOpen] = useState(false);
    const [bulkMessageMode, setBulkMessageMode] = useState<'whatsapp' | 'email'>('whatsapp');

    const [sortColumn, setSortColumn] = useState<SortableColumn>('registration_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Helpers Maps
    const advisorMap = React.useMemo(() => new Map(advisors.map(a => [a.id, a.full_name])), [advisors]);
    const statusMap = React.useMemo(() => new Map(statuses.map(s => [s.id, { name: s.name, color: s.color, category: s.category || 'active' }])), [statuses]);
    const licenciaturaMap = React.useMemo(() => new Map(licenciaturas.map(l => [l.id, l.name])), [licenciaturas]);

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
            onPageChange(1);
        }
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const status = statusMap.get(lead.status_id);
            const category = status ? status.category : 'active';

            if (category !== activeCategoryTab) return false;

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
        if (/[",\n]/.test(stringField)) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    const handleExportCSV = () => {
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

    const handleLeadMove = (leadId: string, newStatusId: string) => {
        onUpdateLead(leadId, { status_id: newStatusId });
    };

    const relevantStatuses = useMemo(() => {
        return statuses.filter(s => (s.category || 'active') === activeCategoryTab);
    }, [statuses, activeCategoryTab]);

    if (loading && leads.length === 0) return <LeadListSkeleton viewMode={viewMode} />;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-8xl relative min-h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-300">

            <DashboardStats
                leads={leads}
                metrics={metrics} // <--- Pass server-side metrics
                statuses={statuses}
                advisors={advisors}
                activeFilter={quickFilter}
                onFilterChange={handleDashboardCardClick}
            />

            {/* Header Section */}
            <div className="mb-8 flex flex-col gap-6">
                <LeadHeader
                    totalLeads={totalLeads}
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
                    onCategoryTabChange={(category) => { setActiveCategoryTab(category); setQuickFilter(null); }}
                />
            </div>

            {/* Visualización de Filtros Activos (Simplificado o mover a Toolbar también? Dejarlo aquí por ahora) */}
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
                            onViewDetails={onViewDetails}
                            onOpenWhatsApp={onOpenWhatsApp}
                            onOpenEmail={onOpenEmail}
                            onEdit={onEdit}
                            onDeleteClick={setLeadToDelete}
                            localSearchTerm={localSearchTerm}
                            activeFilterCount={activeFilterCount}
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
                ) : viewMode === 'kanban' ? (
                    <KanbanBoard
                        leads={filteredLeads}
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
                        leads={filteredLeads}
                        onEventClick={(lead) => onViewDetails(lead)}
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
        </div>
    );
};

export default LeadList;