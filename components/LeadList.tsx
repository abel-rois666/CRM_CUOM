// components/LeadList.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Profile, Status, Licenciatura, StatusCategory } from '../types';
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

interface LeadListProps {
  loading: boolean;
  leads: Lead[];
  advisors: Profile[];
  statuses: Status[];
  licenciaturas: Licenciatura[];
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
  // NUEVA PROP
  onLocalDeleteMany?: (ids: string[]) => void;
}

type SortableColumn = 'name' | 'advisor_id' | 'status_id' | 'program_id' | 'registration_date' | 'urgency';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'kanban';

const normalizeText = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const LeadList: React.FC<LeadListProps> = ({ 
  loading, leads, advisors, statuses, licenciaturas, 
  onAddNew, onEdit, onDelete, onViewDetails, 
  onOpenReports, onOpenImport, onOpenWhatsApp, 
  onOpenEmail, onUpdateLead, userRole, onRefresh, onLocalDeleteMany 
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeCategoryTab, setActiveCategoryTab] = useState<StatusCategory>('active');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>(null);
  
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<string>('');
  const [processingBulk, setProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    advisorId: 'all',
    statusId: 'all',
    programId: 'all',
    startDate: '',
    endDate: ''
  });

  const [sortColumn, setSortColumn] = useState<SortableColumn>('registration_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const advisorMap = useMemo(() => new Map(advisors.map(a => [a.id, a.full_name])), [advisors]);
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.id, { name: s.name, color: s.color, category: s.category || 'active' }])), [statuses]);
  const licenciaturaMap = useMemo(() => new Map(licenciaturas.map(l => [l.id, l.name])), [licenciaturas]);

  const activeFilterCount = useMemo(() => {
      let count = 0;
      if (filters.advisorId !== 'all') count++;
      if (filters.statusId !== 'all') count++;
      if (filters.programId !== 'all') count++;
      if (filters.startDate) count++;
      if (filters.endDate) count++;
      return count;
  }, [filters]);

  const getLeadUrgency = (lead: Lead) => {
    const status = statusMap.get(lead.status_id);
    if (status?.category !== 'active') return 0;

    if(lead.appointments?.some(a => a.status === 'scheduled')) {
        const activeAppt = lead.appointments.find(a => a.status === 'scheduled');
        if(activeAppt) {
            const apptDate = new Date(activeAppt.date);
            const now = new Date();
            const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            if(hoursDiff > 0 && hoursDiff <= 48) return 3; 
            return 1; 
        }
    }

    const regDate = new Date(lead.registration_date);
    const now = new Date();
    const daysSinceReg = (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if ((!lead.follow_ups || lead.follow_ups.length === 0) && daysSinceReg > 3) {
        return 2; 
    }

    if (lead.follow_ups && lead.follow_ups.length > 0) {
        const lastFollowUp = [...lead.follow_ups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const daysSinceFollowUp = (now.getTime() - new Date(lastFollowUp.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceFollowUp > 7) return 2; 
    }

    return 0; 
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set()); 
  }, [filters, searchTerm, itemsPerPage, quickFilter, activeCategoryTab]);

  const handleDashboardCardClick = (filter: QuickFilterType) => {
    setQuickFilter(filter);
    if (filter !== null) {
        setActiveCategoryTab('active');
        setCurrentPage(1);
    }
  };

  const filteredAndSortedLeads = useMemo(() => {
    const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00.000Z`) : null;
    const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const normalizedSearchTerms = normalizeText(searchTerm).split(/\s+/).filter(t => t.length > 0);

    return leads.filter(lead => {
        const status = statusMap.get(lead.status_id);
        const category = status ? status.category : 'active';
        if (category !== activeCategoryTab) return false;

        if (filters.advisorId !== 'all' && lead.advisor_id !== filters.advisorId) return false;
        if (filters.statusId !== 'all' && lead.status_id !== filters.statusId) return false;
        if (filters.programId !== 'all' && lead.program_id !== filters.programId) return false;

        const regDate = new Date(lead.registration_date);
        if (start && regDate < start) return false;
        if (end && regDate > end) return false;

        if (quickFilter) {
            if (quickFilter === 'appointments_today') {
                const hasAppt = lead.appointments?.some(appt => {
                    const apptDate = new Date(appt.date);
                    apptDate.setHours(0,0,0,0);
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

        if (normalizedSearchTerms.length > 0) {
            const leadFullName = normalizeText(`${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name || ''}`);
            const leadEmail = normalizeText(lead.email || '');
            const leadPhone = lead.phone;
            const leadProgram = normalizeText(licenciaturaMap.get(lead.program_id) || '');
            const leadStatus = normalizeText(statusMap.get(lead.status_id)?.name || '');
            const leadAdvisor = normalizeText(advisorMap.get(lead.advisor_id) || '');
            
            const searchableText = `${leadFullName} ${leadEmail} ${leadPhone} ${leadProgram} ${leadStatus} ${leadAdvisor}`;
            if (!normalizedSearchTerms.every(term => searchableText.includes(term))) return false;
        }

        return true;
    }).sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

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
        default:
          return 0;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  }, [leads, filters, searchTerm, sortColumn, sortDirection, advisorMap, statusMap, licenciaturaMap, quickFilter, activeCategoryTab]);
  
  const totalItems = filteredAndSortedLeads.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const paginatedLeads = useMemo(() => {
    if (viewMode === 'kanban') return filteredAndSortedLeads;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, itemsPerPage, filteredAndSortedLeads, viewMode]);

  // --- LÓGICA DE SELECCIÓN (SOLO PÁGINA ACTUAL) ---

  const handleSelectAll = () => {
      const allPageSelected = paginatedLeads.length > 0 && paginatedLeads.every(lead => selectedIds.has(lead.id));
      const newSelected = new Set(selectedIds);
      
      if (allPageSelected) {
          paginatedLeads.forEach(lead => newSelected.delete(lead.id));
      } else {
          paginatedLeads.forEach(lead => newSelected.add(lead.id));
      }
      setSelectedIds(newSelected);
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  // --- ACCIONES MASIVAS (HARD DELETE con Optimistic UI) ---

  const executeBulkDelete = async () => {
      setProcessingBulk(true);
      setBulkProgress(0);
      const ids = Array.from(selectedIds);
      const BATCH_SIZE = 50; 
      let errorOccurred = false;

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const chunk = ids.slice(i, i + BATCH_SIZE);
          const { error } = await supabase
              .from('leads')
              .delete() // Hard Delete
              .in('id', chunk);
          
          if (error) {
              alert(`Error al eliminar lote ${i}-${i + chunk.length}: ${error.message}`);
              errorOccurred = true;
              break; 
          }
          setBulkProgress(Math.round(((i + chunk.length) / ids.length) * 100));
      }
      
      if (!errorOccurred) {
          // 1. Actualización Optimista (Instantánea)
          if (onLocalDeleteMany) {
              onLocalDeleteMany(ids);
          }
          
          // 2. Refresco en segundo plano
          if (onRefresh) onRefresh();

          // 3. Limpieza
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

          const historyEntries = chunk.map(id => ({
              lead_id: id,
              new_status_id: bulkTargetStatus,
              old_status_id: null,
              date: new Date().toISOString(),
          }));

          await supabase.from('status_history').insert(historyEntries);
          setBulkProgress(Math.round(((i + chunk.length) / ids.length) * 100));
      }

      if(!errorOccurred) {
          if (onRefresh) onRefresh();
          else window.location.reload();
          setSelectedIds(new Set());
          setIsBulkStatusOpen(false);
          setBulkTargetStatus('');
      }
      setProcessingBulk(false);
      setBulkProgress(0);
  };

  const confirmIndividualDelete = async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) {
          alert("Error al eliminar: " + error.message);
      } else {
          onDelete(id); 
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

  const handleExportCSV = () => {
    const headers = ['Nombre Completo', 'Email', 'Teléfono', 'Asesor', 'Estado', 'Licenciatura', 'Fecha Registro'];
    const rows = filteredAndSortedLeads.map(lead => [
        escapeCsvField(`${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name || ''}`.trim()),
        escapeCsvField(lead.email),
        escapeCsvField(lead.phone),
        escapeCsvField(advisorMap.get(lead.advisor_id)),
        escapeCsvField(statusMap.get(lead.status_id)?.name),
        escapeCsvField(licenciaturaMap.get(lead.program_id)),
        escapeCsvField(new Date(lead.registration_date).toLocaleDateString())
    ].join(','));
    
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
        <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer group ${className}`} onClick={() => handleSort(column)}>
            <div className="flex items-center gap-1">
                <span className="group-hover:text-gray-800 transition-colors">{label}</span>
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

  if (loading) return <LeadListSkeleton viewMode={viewMode} />;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-8xl relative min-h-screen">
      
      <DashboardStats 
        leads={leads.filter(lead => filters.advisorId === 'all' || lead.advisor_id === filters.advisorId)} 
        statuses={statuses}
        advisors={advisors}
        activeFilter={quickFilter} 
        onFilterChange={handleDashboardCardClick} 
      />

      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Clientes Potenciales</h2>
                 <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                    {quickFilter ? (
                        <span className="text-brand-secondary font-semibold flex items-center gap-1 bg-brand-secondary/5 px-3 py-1 rounded-full animate-fade-in">
                            Filtrado por resumen
                            <button onClick={() => handleDashboardCardClick(null)} className="ml-1 text-gray-400 hover:text-gray-600" title="Quitar filtro">
                                <XIcon className="w-3 h-3" />
                            </button>
                        </span>
                    ) : (
                        "Gestiona, filtra y contacta a tus leads de manera eficiente."
                    )}
                </p>
            </div>
             <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {userRole === 'admin' && (
                    <Button onClick={() => setIsBulkTransferOpen(true)} variant="secondary" size="sm" className="px-3 sm:px-4 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300" title="Reasignar Leads">
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
                        <ArrowDownTrayIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Exportar</span>
                    </Button>
                )}
                <Button onClick={onAddNew} leftIcon={<PlusIcon className="w-5 h-5"/>} className="shadow-lg shadow-brand-secondary/20 hidden md:flex">
                    Nuevo Lead
                </Button>
            </div>
          </div>

          {/* Filters & Tabs */}
          <div className="flex flex-col gap-4">
            <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
                <nav className="-mb-px flex space-x-8 px-2 min-w-max" aria-label="Tabs">
                {[
                    { id: 'active', label: 'En Proceso (Activos)', color: 'border-brand-secondary text-brand-secondary' },
                    { id: 'won', label: 'Inscritos (Ganados)', color: 'border-green-500 text-green-600' },
                    { id: 'lost', label: 'Bajas / Archivo', color: 'border-red-500 text-red-600' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveCategoryTab(tab.id as StatusCategory); setQuickFilter(null); }}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeCategoryTab === tab.id ? tab.color : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        {tab.label}
                    </button>
                ))}
                </nav>
            </div>

            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-grow w-full sm:w-auto group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 group-focus-within:text-brand-secondary transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 border-0 bg-gray-50 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-brand-secondary/50 focus:bg-white transition-all sm:text-sm"
                        placeholder="Buscar por nombre, email, programa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center w-full sm:w-auto gap-3 justify-between sm:justify-end">
                    <button 
                        onClick={() => setIsFilterDrawerOpen(true)}
                        className={`relative inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                            activeFilterCount > 0 
                            ? 'bg-brand-secondary/10 text-brand-secondary ring-1 ring-brand-secondary/20' 
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <FunnelIcon className="w-4 h-4 mr-2" />
                        Filtros
                        {activeFilterCount > 0 && <span className="ml-2 bg-brand-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
                    </button>

                    <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

                    <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Squares2x2Icon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
          </div>
      </div>
      
      {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(filters).map(([key, value]) => {
                  if (value === 'all' || !value) return null;
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
               <button onClick={() => setFilters({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' })} className="text-xs text-gray-500 hover:text-red-600 hover:underline ml-2 transition-colors">
                   Limpiar todo
               </button>
          </div>
      )}
      
      <div key={`${viewMode}-${activeCategoryTab}`} className="animate-fade-in">
        {viewMode === 'list' ? (
          <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200 flex flex-col">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                  <tr>
                      {/* CHECKBOX HEADER (Solo Admin) */}
                      {userRole === 'admin' && (
                          <th scope="col" className="px-4 py-4 text-left w-10">
                              <input 
                                  type="checkbox" 
                                  checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.has(l.id))}
                                  onChange={handleSelectAll}
                                  className="w-4 h-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                              />
                          </th>
                      )}
                      
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
                  <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedLeads.map((lead) => {
                      const urgencyLevel = getLeadUrgency(lead);
                      const status = statusMap.get(lead.status_id);
                      
                      let rowClasses = "group hover:bg-gray-50 transition-colors duration-200";
                      let urgencyIndicator = null;

                      if (urgencyLevel === 3) {
                          rowClasses = "group bg-red-50/40 hover:bg-red-50 border-l-4 border-red-500";
                          urgencyIndicator = <BellAlertIcon className="w-5 h-5 text-red-600 animate-pulse" title="Cita inminente (<48h)"/>;
                      } else if (urgencyLevel === 2) {
                          rowClasses = "group bg-amber-50/30 hover:bg-amber-50 border-l-4 border-amber-400";
                          urgencyIndicator = <ExclamationCircleIcon className="w-5 h-5 text-amber-500" title="Requiere Atención (Sin seguimiento)"/>;
                      } else {
                          rowClasses += " border-l-4 border-transparent";
                      }
                      
                      if (selectedIds.has(lead.id)) {
                          rowClasses += " bg-blue-50";
                      }

                      return (
                      <tr key={lead.id} className={rowClasses}>
                          {/* CHECKBOX ROW (Solo Admin) */}
                          {userRole === 'admin' && (
                              <td className="px-4 py-4 whitespace-nowrap">
                                  <input 
                                      type="checkbox" 
                                      checked={selectedIds.has(lead.id)}
                                      onChange={() => handleSelectOne(lead.id)}
                                      className="w-4 h-4 rounded border-gray-300 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                                  />
                              </td>
                          )}

                          <td className="px-2 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center">{urgencyIndicator}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <div className="h-9 w-9 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary font-bold text-sm mr-3">
                                    {lead.first_name.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900 cursor-pointer hover:text-brand-secondary transition-colors" onClick={() => onViewDetails(lead)}>
                                        {`${lead.first_name} ${lead.paternal_last_name}`}
                                    </div>
                                    <div className="text-xs text-gray-500">{lead.email || lead.phone}</div>
                                </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {advisorMap.get(lead.advisor_id) || <span className="text-gray-400 italic">Sin asignar</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                             <Badge color={status?.color} size="sm">
                                {status?.name || 'Desconocido'}
                             </Badge>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate">
                             {licenciaturaMap.get(lead.program_id) || '-'}
                          </td>
                          <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3"/>
                                {new Date(lead.registration_date).toLocaleDateString()}
                              </div>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-center">
                          {lead.appointments?.some(a => a.status === 'scheduled') ? (
                              <button onClick={() => onViewDetails(lead, 'appointments')} className="text-emerald-500 hover:scale-110 transition-transform" title="Cita Programada">
                                <CalendarIcon className="w-5 h-5 inline-block" />
                              </button>
                          ) : (
                              <span className="text-gray-300 text-xs">•</span>
                          )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-3 opacity-100 sm:opacity-70 sm:group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => onOpenWhatsApp(lead)} className="text-gray-400 hover:text-green-600 transition-colors hover:bg-green-50 p-1 rounded-md">
                                      <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                  </button>
                                  {lead.email && (
                                      <button onClick={() => onOpenEmail(lead)} className="text-gray-400 hover:text-blue-600 transition-colors hover:bg-blue-50 p-1 rounded-md">
                                          <EnvelopeIcon className="w-5 h-5" />
                                      </button>
                                  )}
                              </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(lead)} className="text-gray-400 hover:text-brand-secondary p-1 rounded hover:bg-gray-100"><EditIcon className="w-4 h-4"/></button>
                                <button onClick={() => setLeadToDelete(lead.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                          </td>
                      </tr>
                      )
                  })}
                  {paginatedLeads.length === 0 && (
                      <tr>
                          <td colSpan={10} className="text-center py-16">
                              <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="text-lg font-medium text-gray-900">No se encontraron leads</p>
                              <p className="text-sm text-gray-500 mt-1">Intenta ajustar los filtros o buscar con otros términos.</p>
                              <Button variant="ghost" className="mt-4 text-brand-secondary font-medium" onClick={() => { setSearchTerm(''); setFilters({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' }); }}>
                                  Limpiar todos los filtros
                              </Button>
                          </td>
                      </tr>
                      )}
                  </tbody>
              </table>
              </div>
              
              {/* PAGINACIÓN FOOTER MEJORADO */}
              {totalItems > 0 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-500 order-2 sm:order-1">
                        Mostrando <span className="font-medium text-gray-900">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> a <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de <span className="font-medium text-gray-900">{totalItems}</span> resultados
                    </div>

                    <div className="flex items-center gap-4 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">
                        <select 
                            value={itemsPerPage} 
                            onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                            className="pl-3 pr-8 py-1.5 text-xs sm:text-sm border-gray-300 bg-white rounded-lg focus:ring-brand-secondary focus:border-brand-secondary cursor-pointer shadow-sm"
                        >
                            <option value={10}>10 por pág</option>
                            <option value={25}>25 por pág</option>
                            <option value={50}>50 por pág</option>
                            <option value={100}>100 por pág</option>
                        </select>

                        <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm p-0.5">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white transition-colors text-gray-600"
                            >
                                <ChevronLeftIcon className="w-4 h-4"/>
                            </button>
                            <span className="px-4 text-sm font-medium text-gray-700 border-x border-gray-100 h-full flex items-center">
                                {currentPage}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white transition-colors text-gray-600"
                            >
                                <ChevronRightIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                </div>
              )}
          </div>
        ) : (
          <KanbanBoard 
              leads={paginatedLeads} 
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

      {/* BARRA FLOTANTE DE ACCIONES MASIVAS (Admin Only) */}
      {userRole === 'admin' && selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white shadow-2xl rounded-full px-6 py-3 border border-gray-200 flex items-center gap-4 animate-slide-up">
              <span className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                  {selectedIds.size} seleccionados
              </span>
              
              <div className="h-6 w-px bg-gray-200"></div>

              <button 
                  onClick={() => setIsBulkStatusOpen(true)}
                  className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-brand-secondary transition-colors"
              >
                  <TagIcon className="w-5 h-5"/>
                  Cambiar Estado
              </button>

              <button 
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
              >
                  <TrashIcon className="w-5 h-5"/>
                  Eliminar
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

      {/* MODALES DE ACCIÓN MASIVA */}
      
      {/* 1. Modal Confirmación Borrado Masivo (HARD DELETE) */}
      <ConfirmationModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={executeBulkDelete}
        title={`¿Eliminar ${selectedIds.size} leads?`}
        message={
            <>
                Estás a punto de eliminar permanentemente <strong>{selectedIds.size} leads</strong>.
                <br/>
                <span className="text-red-600 font-bold">Esta acción no se puede deshacer.</span>
                {processingBulk && <div className="mt-2 text-xs text-gray-500">Procesando lote... {bulkProgress}%</div>}
            </>
        }
        confirmButtonText={processingBulk ? `Eliminando...` : "Sí, Eliminar Todo"}
        confirmButtonVariant="danger"
      />

      {/* 2. Modal Cambio Estado Masivo */}
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

      <FilterDrawer 
        isOpen={isFilterDrawerOpen} 
        onClose={() => setIsFilterDrawerOpen(false)}
        advisors={advisors}
        statuses={statuses}
        licenciaturas={licenciaturas}
        currentFilters={filters}
        onApplyFilters={setFilters}
        onClearFilters={() => setFilters({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' })}
      />

      {/* Modal Eliminación Individual (HARD DELETE) */}
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
            if(onRefresh) onRefresh();
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