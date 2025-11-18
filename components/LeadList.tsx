
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
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';

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
  onOpenWhatsApp: (lead: Lead) => void;
}

type SortableColumn = 'name' | 'advisor_id' | 'status_id' | 'program_id' | 'registration_date';
type SortDirection = 'asc' | 'desc';

const LeadList: React.FC<LeadListProps> = ({ loading, leads, advisors, statuses, licenciaturas, onAddNew, onEdit, onDelete, onViewDetails, onOpenReports, onOpenWhatsApp }) => {
  const [filterAdvisor, setFilterAdvisor] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortableColumn>('registration_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const advisorMap = useMemo(() => new Map(advisors.map(a => [a.id, a.full_name])), [advisors]);
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.id, { name: s.name, color: s.color }])), [statuses]);
  const licenciaturaMap = useMemo(() => new Map(licenciaturas.map(l => [l.id, l.name])), [licenciaturas]);

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
  }, [filterAdvisor, filterStatus, filterProgram, searchTerm, startDate, endDate, itemsPerPage]);

  const filteredAndSortedLeads = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

    const filtered = leads
      .filter(lead => filterAdvisor === 'all' || lead.advisor_id === filterAdvisor)
      .filter(lead => filterStatus === 'all' || lead.status_id === filterStatus)
      .filter(lead => filterProgram === 'all' || lead.program_id === filterProgram)
      .filter(lead => {
          const fullName = `${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name || ''}`.toLowerCase();
          return fullName.includes(searchTerm.toLowerCase()) || (lead.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        }
      ).filter(lead => {
        if (!start && !end) return true;
        const regDate = new Date(lead.registration_date);
        if (start && regDate < start) return false;
        if (end && regDate > end) return false;
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

  }, [leads, filterAdvisor, filterStatus, filterProgram, searchTerm, startDate, endDate, sortColumn, sortDirection, advisorMap, statusMap, licenciaturaMap]);
  
  // Pagination derived state
  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, itemsPerPage, filteredAndSortedLeads]);
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
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
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

  if (loading) {
    return <LeadListSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">Clientes Potenciales</h2>
          <p className="mt-1 text-sm text-gray-500">Gestiona y da seguimiento a todos los leads de estudiantes.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center space-x-2">
          <Button onClick={onOpenReports} leftIcon={<ChartBarIcon className="w-5 h-5"/>} variant="secondary">Generar Reporte</Button>
          <Button onClick={handleExportCSV} leftIcon={<ArrowDownTrayIcon className="w-5 h-5"/>} variant="secondary">Exportar Datos</Button>
          <Button onClick={onAddNew} leftIcon={<PlusIcon />}>Añadir Nuevo Lead</Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
          />
          <select value={filterAdvisor} onChange={e => setFilterAdvisor(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            <option value="all">Todos los Asesores</option>
            {advisors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            <option value="all">Todos los Estados</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            <option value="all">Todas las Licenciaturas</option>
            {licenciaturas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
           <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md">
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="md:col-span-1">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Registrado desde</label>
                <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
                />
            </div>
            <div className="md:col-span-1">
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Registrado hasta</label>
                <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
                />
            </div>
        </div>
      </div>
      
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
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
                    <td colSpan={8} className="text-center py-10 text-gray-500">
                        No se encontraron leads con los criterios seleccionados.
                    </td>
                </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{startItem}</span> a <span className="font-medium">{endItem}</span> de <span className="font-medium">{filteredAndSortedLeads.length}</span> resultados
          </p>
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
    </div>
  );
};

export default LeadList;
