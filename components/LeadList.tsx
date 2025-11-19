
import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Profile, Status, Licenciatura } from '../types';
import Button from './common/Button';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import CalendarIcon from './icons/CalendarIcon';
import ChartBarIcon from './icons/ChartBarIcon';
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
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
}

type SortableColumn = 'name' | 'advisor_id' | 'status_id' | 'program_id' | 'registration_date';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'kanban';

const LeadList: React.FC<LeadListProps> = ({ loading, leads, advisors, statuses, licenciaturas, onAddNew, onEdit, onDelete, onViewDetails, onOpenReports, onOpenImport, onOpenWhatsApp, onUpdateLead }) => {
  // UI States
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>(null);
  
  // Filter State (Moved to object for Drawer)
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
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.id, { name: s.name, color: s.color }])), [statuses]);
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
  }, [filters, searchTerm, itemsPerPage, quickFilter]);

  const filteredAndSortedLeads = useMemo(() => {
    const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00.000Z`) : null;
    const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`) : null;
    
    // Quick Filter Logic Dates
    const today = new Date();
    today.setHours(0,0,0,0);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fuzzy Search / Global Search Terms
    const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    const filtered = leads
      // 1. Strict Dropdown Filters
      .filter(lead => filters.advisorId === 'all' || lead.advisor_id === filters.advisorId)
      .filter(lead => filters.statusId === 'all' || lead.status_id === filters.statusId)
      .filter(lead => filters.programId === 'all' || lead.program_id === filters.programId)
      
      // 2. Date Range Filter
      .filter(lead => {
        if (!start && !end) return true;
        const regDate = new Date(lead.registration_date);
        if (start && regDate < start) return false;
        if (end && regDate > end) return false;
        return true;
      })

      // 3. Global "Fuzzy" Search
      .filter(lead => {
          if (searchTerms.length === 0) return true;
          
          const leadFullName = `${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name || ''}`.toLowerCase();
          const leadEmail = (lead.email || '').toLowerCase();
          const leadPhone = lead.phone.toLowerCase();
          const leadProgram = (licenciaturaMap.get(lead.program_id) || '').toLowerCase();
          const leadStatus = (statusMap.get(lead.status_id)?.name || '').toLowerCase();
          const leadAdvisor = (advisorMap.get(lead.advisor_id) || '').toLowerCase();

          // Combine all searchable text into one "document"
          const searchableText = `${leadFullName} ${leadEmail} ${leadPhone} ${leadProgram} ${leadStatus} ${leadAdvisor}`;

          // Check if EVERY term in the search query exists somewhere in the lead's data
          return searchTerms.every(term => searchableText.includes(term));
      })

      // 4. Dashboard Quick Filters
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

    // Sorting
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

  }, [leads, filters, searchTerm, sortColumn, sortDirection, advisorMap, statusMap, licenciaturaMap, quickFilter]);
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    if (viewMode === 'kanban') return filteredAndSortedLeads;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, itemsPerPage, filteredAndSortedLeads, viewMode]);

  const startItem = filteredAndSortedLeads.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, filteredAndSortedLeads.length);


  const handleSort = (column: SortableColumn) => {
    if (column === sortColumn) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const escapeCsvField = (field: string | undefined | null): string => {
    if (field === null || field === undefined) {
      return '""';
    }
    const stringField = String(field);
    if (/[",\n]/.test(stringField)) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const handleExportCSV = () => {
    const headers = [
        'Nombre Completo', 'Email', 'Teléfono', 'Asesor', 
        'Estado', 'Licenciatura', 'Fecha Registro'
    ];

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
    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const SortableHeader: React.FC<{ column: SortableColumn; label: string; className?: string }> = ({ column, label, className }) => {
    const isSorted = sortColumn === column;
    const icon = isSorted 
        ? <ChevronDownIcon className={`w-4 h-4 text-gray-700 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
        : <ChevronUpDownIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />;

    return (
        <th scope="col" className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
            <button onClick={() => handleSort(column)} className="flex items-center gap-1 group">
                <span className="group-hover:text-gray-800">{label}</span>
                {icon}
            </button>
        </th>
    )
  }

  const handleLeadMove = (leadId: string, newStatusId: string) => {
      onUpdateLead(leadId, { status_id: newStatusId });
  };

  if (loading) {
    return <LeadListSkeleton viewMode={viewMode} />;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Dashboard Summary */}
      <DashboardStats 
        leads={leads.filter(lead => filters.advisorId === 'all' || lead.advisor_id === filters.advisorId)} 
        activeFilter={quickFilter} 
        onFilterChange={setQuickFilter} 
      />

      {/* Header & Toolbar */}
      <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">Clientes Potenciales</h2>
                 <p className="mt-1 text-sm text-gray-500">
                    {quickFilter ? (
                        <span className="text-brand-secondary font-semibold flex items-center gap-1">
                            <span className="bg-brand-secondary/10 px-2 py-0.5 rounded">Filtrado por resumen</span>
                            <button onClick={() => setQuickFilter(null)} className="ml-2 text-gray-400 hover:text-gray-600" title="Quitar filtro rápido">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </span>
                    ) : (
                        "Gestiona y da seguimiento a todos los leads de estudiantes."
                    )}
                </p>
            </div>
             <div className="flex flex-wrap items-center gap-2">
                <Button onClick={onOpenImport} leftIcon={<ArrowUpTrayIcon className="w-5 h-5"/>} variant="secondary" className="hidden sm:flex">Importar</Button>
                <Button onClick={onOpenReports} leftIcon={<ChartBarIcon className="w-5 h-5"/>} variant="secondary" className="hidden sm:flex">Reporte</Button>
                <Button onClick={handleExportCSV} leftIcon={<ArrowDownTrayIcon className="w-5 h-5"/>} variant="secondary" className="hidden sm:flex">Exportar</Button>
                <Button onClick={onAddNew} leftIcon={<PlusIcon />}>Nuevo Lead</Button>
            </div>
          </div>

          {/* Main Toolbar: Search + Filters + View Toggle */}
          <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-3 items-center">
             {/* Global Search */}
             <div className="relative flex-grow w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm transition duration-150 ease-in-out"
                    placeholder="Buscar por nombre, email, programa, estado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>

             <div className="flex items-center w-full sm:w-auto gap-3 justify-between sm:justify-end">
                 {/* Filter Button */}
                 <button 
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition-colors ${
                        activeFilterCount > 0 
                        ? 'bg-blue-50 text-brand-secondary border-blue-200 hover:bg-blue-100' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                 >
                    <FunnelIcon className="w-4 h-4 mr-2" />
                    Filtros
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
                            {activeFilterCount}
                        </span>
                    )}
                 </button>

                 <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

                 {/* View Toggle */}
                <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                    <button 
                        onClick={() => setViewMode('list')} 
                        className={`p-1.5 rounded-md transition-all shadow-sm ${viewMode === 'list' ? 'bg-white text-brand-secondary shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 shadow-none'}`}
                        title="Vista de Lista"
                    >
                        <ListBulletIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setViewMode('kanban')} 
                        className={`p-1.5 rounded-md transition-all shadow-sm ${viewMode === 'kanban' ? 'bg-white text-brand-secondary shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200 shadow-none'}`}
                        title="Vista Kanban"
                    >
                        <Squares2x2Icon className="w-5 h-5" />
                    </button>
                </div>
             </div>
          </div>
      </div>
      
      {/* Active Filters Pills */}
      {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
              {filters.advisorId !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Asesor: {advisorMap.get(filters.advisorId)}
                  </span>
              )}
              {filters.statusId !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Estado: {statusMap.get(filters.statusId)?.name}
                  </span>
              )}
               {filters.programId !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Programa: {licenciaturaMap.get(filters.programId)}
                  </span>
              )}
               {(filters.startDate || filters.endDate) && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Fecha: {filters.startDate} - {filters.endDate}
                  </span>
              )}
               <button 
                  onClick={() => setFilters({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' })}
                  className="text-xs text-gray-500 hover:text-red-600 underline ml-2"
               >
                   Limpiar filtros
               </button>
          </div>
      )}
      
      {/* Conditional Rendering based on viewMode with Animation */}
      <div key={viewMode} className="animate-fade-in">
        {viewMode === 'list' ? (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                  <tr>
                      <SortableHeader column="name" label="Nombre" />
                      <SortableHeader column="advisor_id" label="Asesor" />
                      <SortableHeader column="status_id" label="Estado" />
                      <SortableHeader column="program_id" label="Licenciatura" />
                      <SortableHeader column="registration_date" label="Fecha Registro" />
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cita</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                  </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLeads.map((lead) => {
                      const isUrgent = isAppointmentUrgent(lead);
                      return (
                      <tr key={lead.id} className={`hover:bg-gray-50 transition-colors duration-150 ${isUrgent ? 'bg-yellow-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-brand-secondary" onClick={() => onViewDetails(lead)}>{`${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name || ''}`}</div>
                          <div className="text-sm text-gray-500">{lead.email || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{advisorMap.get(lead.advisor_id) || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${statusMap.get(lead.status_id)?.color || 'bg-gray-400'}`}>
                              {statusMap.get(lead.status_id)?.name || 'Unknown'}
                          </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{licenciaturaMap.get(lead.program_id)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(lead.registration_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isUrgent ? (
                              <button
                              onClick={() => onViewDetails(lead)}
                              className="text-red-500 hover:text-red-700 transition-colors animate-pulse"
                              aria-label={`Cita urgente para ${lead.first_name}`}
                              >
                              <BellAlertIcon className="w-5 h-5 inline-block" />
                              </button>
                          ) : lead.appointments?.some(a => a.status === 'scheduled') ? (
                              <button
                              onClick={() => onViewDetails(lead)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              aria-label={`Ver detalles para ${lead.first_name}`}
                              >
                              <CalendarIcon className="w-5 h-5 inline-block" />
                              </button>
                          ) : (
                              <span className="text-sm text-gray-400">-</span>
                          )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-2">
                                  <button 
                                      onClick={() => onOpenWhatsApp(lead)}
                                      className="text-green-500 hover:text-green-700 transition-colors"
                                      title="Enviar WhatsApp"
                                  >
                                      <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                  </button>
                                  {lead.email && (
                                      <a 
                                          href={`mailto:${lead.email}`}
                                          className="text-blue-500 hover:text-blue-700 transition-colors"
                                          title="Enviar Correo"
                                      >
                                          <EnvelopeIcon className="w-5 h-5" />
                                      </a>
                                  )}
                              </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button onClick={() => onEdit(lead)} className="text-indigo-600 hover:text-indigo-900"><EditIcon /></button>
                          <button onClick={() => onDelete(lead.id)} className="text-red-600 hover:text-red-900"><TrashIcon /></button>
                          </td>
                      </tr>
                      )
                  })}
                  {paginatedLeads.length === 0 && (
                      <tr>
                          <td colSpan={8} className="text-center py-16 text-gray-500">
                              <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                              <p className="text-lg font-medium text-gray-900">No se encontraron resultados</p>
                              <p className="text-sm text-gray-500">Intenta ajustar tus términos de búsqueda o filtros.</p>
                              <Button 
                                  variant="ghost" 
                                  className="mt-4 text-brand-secondary" 
                                  onClick={() => {
                                      setSearchTerm('');
                                      setFilters({ advisorId: 'all', statusId: 'all', programId: 'all', startDate: '', endDate: '' });
                                  }}
                              >
                                  Limpiar búsqueda
                              </Button>
                          </td>
                      </tr>
                      )}
                  </tbody>
              </table>
              </div>
          </div>
        ) : (
          /* Kanban View */
          <KanbanBoard 
              leads={paginatedLeads} 
              statuses={statuses} 
              advisors={advisors}
              licenciaturas={licenciaturas}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
              onOpenWhatsApp={onOpenWhatsApp}
              onLeadMove={handleLeadMove}
          />
        )}
      </div>
      
      {/* Pagination Controls (Only for List View) */}
      {viewMode === 'list' && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Mostrar:</span>
                <select 
                    value={itemsPerPage} 
                    onChange={e => setItemsPerPage(Number(e.target.value))} 
                    className="pl-2 pr-8 py-1 text-sm border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary rounded-md"
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
            <span className="text-sm text-gray-700">
              Página {currentPage} de {totalPages}
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

      {/* Filter Drawer */}
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
