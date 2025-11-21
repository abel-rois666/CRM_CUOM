// components/LeadList.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Profile, Status, Licenciatura, StatusCategory } from '../types';
import Button from './common/Button';
import Badge from './common/Badge'; // Nuevo import
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

interface LeadListProps {
  loading: boolean;
  leads: Lead[];
  advisors: Profile[];
  statuses: Status[];
  licenciaturas: Licenciatura[];
  onAddNew: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onViewDetails: (lead: Lead) => void;
  onOpenReports: () => void;
  onOpenImport: () => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onOpenEmail: (lead: Lead) => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
}

type SortableColumn = 'name' | 'advisor_id' | 'status_id' | 'program_id' | 'registration_date';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'kanban';

const LeadList: React.FC<LeadListProps> = ({ loading, leads, advisors, statuses, licenciaturas, onAddNew, onEdit, onDelete, onViewDetails, onOpenReports, onOpenImport, onOpenWhatsApp, onOpenEmail, onUpdateLead }) => {
  // UI States
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeCategoryTab, setActiveCategoryTab] = useState<StatusCategory>('active');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>(null);
  
  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    advisorId: 'all',
    statusId: 'all',
    programId: 'all',
    startDate: '',
    endDate: ''
  });

  // Sorting & Pagination
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

  const isAppointmentUrgent = (lead: Lead): boolean => {
    if(!lead.appointments) return false;
    const activeAppointment = lead.appointments.find(a => a.status === 'scheduled');
    if (!activeAppointment) return false;

    const appointmentDate = new Date(activeAppointment.date);
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    return appointmentDate > now && appointmentDate <= fortyEightHoursFromNow;
  };
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm, itemsPerPage, quickFilter, activeCategoryTab]);

  const filteredAndSortedLeads = useMemo(() => {
    const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00.000Z`) : null;
    const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : null;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    const filtered = leads
      .filter(lead => {
          const status = statusMap.get(lead.status_id);
          const category = status ? status.category : 'active';
          return category === activeCategoryTab;
      })
      .filter(lead => filters.advisorId === 'all' || lead.advisor_id === filters.advisorId)
      .filter(lead => filters.statusId === 'all' || lead.status_id === filters.statusId)
      .filter(lead => filters.programId === 'all' || lead.program_id === filters.programId)
      .filter(lead => {
        if (!start && !end) return true;
        const regDate = new Date(lead.registration_date);
        if (start && regDate < start) return false;
        if (end && regDate > end) return false;
        return true;
      })
      .filter(lead => {
          if (searchTerms.length === 0) return true;
          const leadFullName = `${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name || ''}`.toLowerCase();
          const leadEmail = (lead.email || '').toLowerCase();
          const leadPhone = lead.phone.toLowerCase();
          const leadProgram = (licenciaturaMap.get(lead.program_id) || '').toLowerCase();
          const leadStatus = (statusMap.get(lead.status_id)?.name || '').toLowerCase();
          const leadAdvisor = (advisorMap.get(lead.advisor_id) || '').toLowerCase();
          const searchableText = `${leadFullName} ${leadEmail} ${leadPhone} ${leadProgram} ${leadStatus} ${leadAdvisor}`;
          return searchTerms.every(term => searchableText.includes(term));
      })
      .filter(lead => {
        if (!quickFilter) return true;
        if (quickFilter === 'appointments_today') {
            return lead.appointments?.some(appt => {
                const apptDate = new Date(appt.date);
                apptDate.setHours(0,0,0,0);
                return appt.status === 'scheduled' && apptDate.getTime() === today.getTime();
            });
        }
        if (quickFilter === 'no_followup') {
             const regDate = new Date(lead.registration_date);
             const hasNoFollowUps = !lead.follow_ups || lead.follow_ups.length === 0;
             return hasNoFollowUps && regDate < threeDaysAgo;
        }
        if (quickFilter === 'stale_followup') {
            if (!lead.follow_ups || lead.follow_ups.length === 0) return false;
            const lastFollowUp = [...lead.follow_ups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            const lastDate = new Date(lastFollowUp.date);
            return lastDate < sevenDaysAgo;
        }
        return true;
      });

    return filtered.sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

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
  
  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    if (viewMode === 'kanban') return filteredAndSortedLeads;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, itemsPerPage, filteredAndSortedLeads, viewMode]);

  const handleSort = (column: SortableColumn) => {
    if (column === sortColumn) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
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
    document.body.removeChild(link);
  };
  
  const SortableHeader: React.FC<{ column: SortableColumn; label: string; className?: string }> = ({ column, label, className }) => {
    const isSorted = sortColumn === column;
    const icon = isSorted 
        ? <ChevronDownIcon className={`w-4 h-4 text-brand-secondary transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
        : <ChevronUpDownIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />;

    return (
        <th scope="col" className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${className}`}>
            <button onClick={() => handleSort(column)} className="flex items-center gap-1 group hover:bg-gray-100 px-2 py-1 rounded-md transition-colors">
                <span className="group-hover:text-gray-800">{label}</span>
                {icon}
            </button>
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-8xl">
      
      <DashboardStats 
        leads={leads.filter(lead => filters.advisorId === 'all' || lead.advisor_id === filters.advisorId)} 
        statuses={statuses}
        advisors={advisors}
        activeFilter={quickFilter} 
        onFilterChange={setQuickFilter} 
      />

      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Clientes Potenciales</h2>
                 <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                    {quickFilter ? (
                        <span className="text-brand-secondary font-semibold flex items-center gap-1 bg-brand-secondary/5 px-3 py-1 rounded-full">
                            Filtrado por resumen
                            <button onClick={() => setQuickFilter(null)} className="ml-1 text-gray-400 hover:text-gray-600" title="Quitar filtro">
                                <XIcon className="w-3 h-3" />
                            </button>
                        </span>
                    ) : (
                        "Gestiona, filtra y contacta a tus leads de manera eficiente."
                    )}
                </p>
            </div>
             <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onOpenImport} variant="secondary" size="sm" leftIcon={<ArrowUpTrayIcon className="w-4 h-4"/>} className="hidden sm:flex">Importar</Button>
                <Button onClick={onOpenReports} variant="secondary" size="sm" leftIcon={<ChartBarIcon className="w-4 h-4"/>} className="hidden sm:flex">Reporte</Button>
                <Button onClick={handleExportCSV} variant="secondary" size="sm" leftIcon={<ArrowDownTrayIcon className="w-4 h-4"/>} className="hidden sm:flex">Exportar</Button>
                <Button onClick={onAddNew} leftIcon={<PlusIcon className="w-5 h-5"/>} className="shadow-lg shadow-brand-secondary/20">Nuevo Lead</Button>
            </div>
          </div>

          {/* Filters & Tabs */}
          <div className="flex flex-col gap-4">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-2" aria-label="Tabs">
                {[
                    { id: 'active', label: 'En Proceso (Activos)', color: 'border-brand-secondary text-brand-secondary' },
                    { id: 'won', label: 'Inscritos (Ganados)', color: 'border-green-500 text-green-600' },
                    { id: 'lost', label: 'Bajas / Archivo', color: 'border-red-500 text-red-600' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveCategoryTab(tab.id as StatusCategory)}
                        className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                        ${activeCategoryTab === tab.id ? tab.color : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
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
                        {activeFilterCount > 0 && (
                            <span className="ml-2 bg-brand-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

                    <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1">
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setViewMode('kanban')} 
                            className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-brand-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Squares2x2Icon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
          </div>
      </div>
      
      {/* Active Filters Pills */}
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
               <button 
                  onClick={() => setFilters({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' })}
                  className="text-xs text-gray-500 hover:text-red-600 hover:underline ml-2 transition-colors"
               >
                   Limpiar todo
               </button>
          </div>
      )}
      
      <div key={`${viewMode}-${activeCategoryTab}`} className="animate-fade-in">
        {viewMode === 'list' ? (
          <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50/50">
                  <tr>
                      <SortableHeader column="name" label="Nombre" />
                      <SortableHeader column="advisor_id" label="Asesor" />
                      <SortableHeader column="status_id" label="Estado" />
                      <SortableHeader column="program_id" label="Licenciatura" />
                      <SortableHeader column="registration_date" label="Registro" />
                      <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Agenda</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones Rápidas</th>
                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">Editar</span></th>
                  </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedLeads.map((lead) => {
                      const isUrgent = isAppointmentUrgent(lead);
                      const status = statusMap.get(lead.status_id);
                      return (
                      <tr key={lead.id} className={`group hover:bg-blue-50/30 transition-colors duration-200 ${isUrgent ? 'bg-red-50/30' : ''}`}>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {advisorMap.get(lead.advisor_id) || <span className="text-gray-400 italic">Sin asignar</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                             <Badge color={status?.color} size="sm">
                                {status?.name || 'Desconocido'}
                             </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate">
                             {licenciaturaMap.get(lead.program_id) || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(lead.registration_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isUrgent ? (
                              <button onClick={() => onViewDetails(lead)} className="text-red-500 hover:scale-110 transition-transform" title="Cita Urgente">
                                <BellAlertIcon className="w-5 h-5 inline-block animate-pulse" />
                              </button>
                          ) : lead.appointments?.some(a => a.status === 'scheduled') ? (
                              <button onClick={() => onViewDetails(lead)} className="text-emerald-500 hover:scale-110 transition-transform" title="Cita Programada">
                                <CalendarIcon className="w-5 h-5 inline-block" />
                              </button>
                          ) : (
                              <span className="text-gray-300 text-xs">•</span>
                          )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-3 opacity-70 group-hover:opacity-100 transition-opacity">
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
                            <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onEdit(lead)} className="text-gray-400 hover:text-brand-secondary p-1 rounded hover:bg-gray-100"><EditIcon className="w-4 h-4"/></button>
                                <button onClick={() => onDelete(lead.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                          </td>
                      </tr>
                      )
                  })}
                  {paginatedLeads.length === 0 && (
                      <tr>
                          <td colSpan={8} className="text-center py-16">
                              <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="text-lg font-medium text-gray-900">No se encontraron leads</p>
                              <p className="text-sm text-gray-500 mt-1">Intenta ajustar los filtros o buscar con otros términos.</p>
                              <Button 
                                  variant="ghost" 
                                  className="mt-4 text-brand-secondary font-medium" 
                                  onClick={() => {
                                      setSearchTerm('');
                                      setFilters({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' });
                                  }}
                              >
                                  Limpiar todos los filtros
                              </Button>
                          </td>
                      </tr>
                      )}
                  </tbody>
              </table>
              </div>
          </div>
        ) : (
          <KanbanBoard 
              leads={paginatedLeads} 
              statuses={relevantStatuses} 
              advisors={advisors}
              licenciaturas={licenciaturas}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
              onOpenWhatsApp={onOpenWhatsApp}
              onOpenEmail={onOpenEmail}
              onLeadMove={handleLeadMove}
          />
        )}
      </div>
      
      {viewMode === 'list' && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Filas por página:</span>
                <select 
                    value={itemsPerPage} 
                    onChange={e => setItemsPerPage(Number(e.target.value))} 
                    className="pl-3 pr-8 py-1.5 text-sm border-gray-300 bg-gray-50 rounded-lg focus:ring-brand-secondary focus:border-brand-secondary cursor-pointer"
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                </select>
            </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              leftIcon={<ChevronLeftIcon className="w-4 h-4"/>}
            >
              Anterior
            </Button>
            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
                Siguiente
                <ChevronRightIcon className="w-4 h-4 ml-2"/>
            </Button>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default LeadList;