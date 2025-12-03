// components/LeadDetailModal.tsx
import React, { useState, useMemo } from 'react';
import { Lead, Profile, Status, FollowUp, Source, Appointment, Licenciatura } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select, TextArea, Input } from './common/FormElements';
import CalendarIcon from './icons/CalendarIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './common/ConfirmationModal';
import ArrowPathIcon from './icons/ArrowPathIcon';
import BellAlertIcon from './icons/BellAlertIcon';
import TransferIcon from './icons/TransferIcon';
import TransferLeadModal from './TransferLeadModal';
import FollowUpFormModal from './FollowUpFormModal';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import UserIcon from './icons/UserIcon';
import ListBulletIcon from './icons/ListBulletIcon';
import ClockIcon from './icons/ClockIcon';
import TagIcon from './icons/TagIcon';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  advisors: Profile[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
  onAddFollowUp: (leadId: string, followUp: Omit<FollowUp, 'id' | 'lead_id'>) => void;
  onDeleteFollowUp: (leadId: string, followUpId: string) => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
  onSaveAppointment: (leadId: string, appointment: Omit<Appointment, 'id' | 'status' | 'lead_id'>, appointmentIdToEdit?: string) => void;
  onUpdateAppointmentStatus: (leadId: string, appointmentId: string, status: 'completed' | 'canceled') => void;
  onDeleteAppointment: (leadId: string, appointmentId: string) => void;
  onTransferLead: (leadId: string, newAdvisorId: string, reason: string) => void;
  currentUser: Profile | null;
  initialTab?: 'info' | 'activity' | 'appointments';
}

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  appointment: Appointment | undefined;
  onSave: (appointmentData: Omit<Appointment, 'id' | 'status' | 'lead_id'>) => void;
  onDelete: () => void;
  existingAppointments: Appointment[];
  canDelete: boolean;
}

// --- SUB-COMPONENT: Appointment Modal ---
const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({ isOpen, onClose, lead, appointment, onSave, onDelete, existingAppointments, canDelete }) => {
  const fullNameForAppointment = `${lead.first_name} ${lead.paternal_last_name}`.trim();
  const [formData, setFormData] = useState({
    title: appointment?.title || `Cita con ${fullNameForAppointment}`,
    date: appointment ? new Date(appointment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    time: appointment ? new Date(appointment.date).toTimeString().substring(0, 5) : '10:00',
    duration: appointment?.duration || 60,
    details: appointment?.details || `Discutir el programa de interés.`,
  });
  
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setShowDuplicateWarning(false);
  };
  
  const handlePreSave = () => {
    const newDateTimeStr = `${formData.date}T${formData.time}`;
    const newDate = new Date(newDateTimeStr); 

    const isDuplicate = existingAppointments.some(appt => {
        if (appointment && appt.id === appointment.id) return false;
        const apptDate = new Date(appt.date);
        return Math.abs(apptDate.getTime() - newDate.getTime()) < 60000;
    });

    if (isDuplicate && !showDuplicateWarning) {
        setShowDuplicateWarning(true);
        return;
    }

    handleSave();
  };

  const handleSave = () => {
    const appointmentDateTime = new Date(`${formData.date}T${formData.time}`);
    onSave({
        title: formData.title,
        date: appointmentDateTime.toISOString(),
        duration: Number(formData.duration),
        details: formData.details
    });
    onClose();
  };
  
  const createGoogleCalendarLink = () => {
    const { title, date, time, duration, details } = formData;
    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + Number(duration) * 60000);
    const formatDate = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    
    const url = new URL('https://www.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', title);
    url.searchParams.set('dates', `${formatDate(startTime)}/${formatDate(endTime)}`);
    url.searchParams.set('details', details);
    if(lead.email) url.searchParams.set('add', lead.email);
    
    window.open(url.toString(), '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={appointment ? 'Editar Cita' : 'Programar Cita'} size="md">
        <div className="space-y-5">
            {showDuplicateWarning && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 animate-fade-in">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <ExclamationCircleIcon className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-700">
                                Ya existe una cita registrada para esta fecha y hora.
                                <br />
                                <strong>¿Deseas sobrescribir/agendar de todos modos?</strong>
                            </p>
                            <div className="mt-2">
                                <button onClick={handleSave} className="text-sm font-bold text-amber-800 underline hover:text-amber-900">
                                    Sí, guardar de todos modos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Input label="Título de la Cita" name="title" value={formData.title} onChange={handleChange} />
            
            <div className="grid grid-cols-2 gap-4">
                <Input label="Fecha" type="date" name="date" value={formData.date} onChange={handleChange} />
                <Input label="Hora" type="time" name="time" value={formData.time} onChange={handleChange} />
            </div>
            
            <Input label="Duración (min)" type="number" name="duration" value={formData.duration} onChange={handleChange} />
            <TextArea label="Detalles / Notas" name="details" value={formData.details} onChange={handleChange} rows={3} />

            <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                <Button variant="ghost" onClick={createGoogleCalendarLink} className="text-blue-600 hover:text-blue-800">
                    <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4"/> Google Cal</span>
                </Button>
                <div className="flex gap-2">
                    {appointment && canDelete && (
                        <Button variant="danger" onClick={onDelete} title="Eliminar cita">
                            <TrashIcon className="w-4 h-4" />
                        </Button>
                    )}
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handlePreSave}>{appointment ? 'Guardar' : 'Programar'}</Button>
                </div>
            </div>
        </div>
    </Modal>
  );
};

// --- SUB-COMPONENT: Expandable Text ---
const ExpandableText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldTruncate = text.length > 150 || text.split('\n').length > 3;

    return (
        <div className={`relative ${className}`}>
            <p className={`whitespace-pre-wrap break-words text-sm transition-all duration-200 ${!isExpanded && shouldTruncate ? 'line-clamp-3' : ''}`}>
                {text}
            </p>
            {shouldTruncate && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="mt-1 text-xs font-semibold text-brand-secondary hover:underline focus:outline-none"
                >
                    {isExpanded ? 'Ver menos' : 'Ver más...'}
                </button>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: Collapsible Section ---
const CollapsibleSection: React.FC<{ 
    title: React.ReactNode; 
    icon: React.ReactNode; 
    children: React.ReactNode;
    defaultOpen?: boolean;
    count?: number;
}> = ({ title, icon, children, defaultOpen = false, count }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden transition-all duration-300">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="text-gray-500">{icon}</div>
                    <span className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</span>
                    {count !== undefined && count > 0 && (
                        <span className="bg-gray-200 text-gray-600 text-xs py-0.5 px-2 rounded-full font-bold">
                            {count}
                        </span>
                    )}
                </div>
                <div className="text-gray-400">
                    {isOpen ? <ChevronDownIcon className="w-5 h-5"/> : <ChevronRightIcon className="w-5 h-5"/>}
                </div>
            </button>
            
            {isOpen && (
                <div className="p-3 sm:p-4 border-t border-gray-200 bg-white animate-slide-up">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ isOpen, onClose, lead, advisors, statuses, sources, licenciaturas, onAddFollowUp, onDeleteFollowUp, onUpdateLead, onSaveAppointment, onUpdateAppointmentStatus, onDeleteAppointment, onTransferLead, currentUser, initialTab = 'info' }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'appointments'>(initialTab);
  
  const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [isFollowUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [isCancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  
  // NUEVO: Estado para confirmar eliminación de nota
  const [followUpToDelete, setFollowUpToDelete] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const sourceMap = useMemo(() => new Map(sources.map(s => [s.id, s.name])), [sources]);
  const licenciaturaMap = useMemo(() => new Map(licenciaturas.map(l => [l.id, l.name])), [licenciaturas]);
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.id, { name: s.name, color: s.color }])), [statuses]);

  const { activeAppointment, pastAppointments } = useMemo(() => {
    if (!lead?.appointments) return { activeAppointment: undefined, pastAppointments: [] };
    const sorted = [...lead.appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { 
        activeAppointment: sorted.find(a => a.status === 'scheduled'),
        pastAppointments: sorted.filter(a => a.status !== 'scheduled')
    };
  }, [lead]);

  // --- LÓGICA DE BITÁCORA ---
  const activitySections = useMemo(() => {
      // 1. Cambios en Leads
      const leadChanges: any[] = [];
      if (lead?.follow_ups) {
          lead.follow_ups.filter(f => f.notes.includes('TRANSICIÓN DE ASESOR')).forEach(f => {
              leadChanges.push({
                  type: 'transfer',
                  actionDate: new Date(f.created_at || f.date),
                  user: f.created_by?.full_name || 'Desconocido',
                  data: f
              });
          });
      }
      if (lead?.status_history) {
          lead.status_history.forEach(h => {
              leadChanges.push({ 
                  type: 'status_change', 
                  actionDate: new Date(h.date), 
                  user: h.created_by?.full_name || 'Sistema',
                  data: h 
              });
          });
      }
      leadChanges.sort((a, b) => b.actionDate.getTime() - a.actionDate.getTime());

      // 2. Notas
      const notes: any[] = [];
      if (lead?.follow_ups) {
          lead.follow_ups.filter(f => !f.notes.includes('TRANSICIÓN DE ASESOR')).forEach(f => {
              const contactDateStr = f.date;
              let contactDateDisplay: Date;
              
              if (contactDateStr.includes('T')) {
                  contactDateDisplay = new Date(contactDateStr);
              } else {
                  const [y, m, d] = contactDateStr.split('-').map(Number);
                  contactDateDisplay = new Date(y, m - 1, d, 12, 0, 0); 
              }

              notes.push({
                  type: 'note',
                  actionDate: new Date(f.created_at || f.date),
                  contactDate: contactDateDisplay,
                  user: f.created_by?.full_name || 'Desconocido',
                  data: f
              });
          });
      }
      notes.sort((a, b) => b.actionDate.getTime() - a.actionDate.getTime());

      // 3. Histórico de Citas
      const appointmentsHistory: any[] = [];
      if (lead?.appointments) {
          lead.appointments.forEach(a => {
              const actionTimestamp = a.updated_at || a.created_at || a.date;
              appointmentsHistory.push({ 
                  type: 'appointment', 
                  actionDate: new Date(actionTimestamp), 
                  eventDate: new Date(a.date), 
                  user: a.created_by?.full_name || 'Desconocido',
                  data: a 
              });
          });
      }
      appointmentsHistory.sort((a, b) => b.actionDate.getTime() - a.actionDate.getTime());

      return { leadChanges, notes, appointmentsHistory };
  }, [lead?.follow_ups, lead?.appointments, lead?.status_history]);

  const isUrgentAppointment = useMemo(() => {
    if (!activeAppointment) return false;
    const apptDate = new Date(activeAppointment.date);
    const now = new Date();
    return apptDate > now && apptDate <= new Date(now.getTime() + 48 * 60 * 60 * 1000);
  }, [activeAppointment]);

  if (!lead) return null;
  
  const fullName = `${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name || ''}`.trim();

  const handleDetailChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateLead(lead.id, { [e.target.name]: e.target.value });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Expediente del Alumno" size="3xl">
        <div className="flex flex-col h-full min-h-[500px] max-h-[85vh]">
            
            {/* Header del Expediente - RESPONSIVE MEJORADO Y COMPACTO */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 pb-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3 w-full sm:flex-1 sm:min-w-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-primary text-white flex-shrink-0 flex items-center justify-center text-xl sm:text-2xl font-bold shadow-md ring-2 sm:ring-4 ring-gray-50">
                        {lead.first_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight truncate" title={fullName}>
                            {fullName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 flex-shrink-0">
                                <ClockIcon className="w-3 h-3"/> 
                                {new Date(lead.registration_date).toLocaleDateString()}
                            </span>
                            {activeAppointment && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                                    <CalendarIcon className="w-3 h-3 mr-1" />
                                    <span className="hidden sm:inline">Cita Programada</span>
                                    <span className="sm:hidden">Cita</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="w-full sm:w-auto flex-shrink-0">
                     <Select 
                        name="status_id"
                        value={lead.status_id}
                        onChange={handleDetailChange}
                        options={statuses.map(s => ({ value: s.id, label: s.name }))}
                        className="w-full sm:w-48 text-sm"
                    />
                </div>
            </div>

            {/* Sistema de Pestañas - Scrollable en móvil */}
            <div className="flex border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0 flex-shrink-0">
                {[
                    { id: 'info', label: 'Información', icon: <UserIcon className="w-4 h-4"/> },
                    { id: 'activity', label: 'Historial', icon: <ListBulletIcon className="w-4 h-4"/> },
                    { id: 'appointments', label: 'Agenda', icon: <CalendarIcon className="w-4 h-4"/> }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex-shrink-0 flex items-center gap-2 py-2.5 px-4 sm:px-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                            ${activeTab === tab.id 
                                ? 'border-brand-secondary text-brand-secondary bg-blue-50/50 rounded-t-lg' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
                            }
                        `}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Contenido de las Pestañas - SCROLLABLE AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 pb-8">
                
                {/* TAB 1: INFORMACIÓN GENERAL - Diseño Compacto Móvil */}
                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 animate-fade-in">
                        <div className="space-y-4 sm:space-y-6">
                            <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200">
                                <h5 className="font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2 text-sm sm:text-base">Datos de Contacto</h5>
                                <div className="space-y-2 text-sm">
                                    <div className="flex flex-col sm:grid sm:grid-cols-3 sm:gap-2">
                                        <span className="text-gray-500 font-medium sm:font-normal text-xs sm:text-sm">Email:</span>
                                        <span className="text-gray-900 sm:col-span-2 break-all">{lead.email || '-'}</span>
                                    </div>
                                    <div className="flex flex-col sm:grid sm:grid-cols-3 sm:gap-2">
                                        <span className="text-gray-500 font-medium sm:font-normal text-xs sm:text-sm">Teléfono:</span>
                                        <span className="text-gray-900 sm:col-span-2">{lead.phone}</span>
                                    </div>
                                    <div className="flex flex-col sm:grid sm:grid-cols-3 sm:gap-2">
                                        <span className="text-gray-500 font-medium sm:font-normal text-xs sm:text-sm">Origen:</span>
                                        <span className="text-gray-900 sm:col-span-2">{sourceMap.get(lead.source_id)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-4 sm:p-5 rounded-xl border border-blue-100">
                                <h5 className="font-bold text-blue-900 mb-3 border-b border-blue-200 pb-2 text-sm sm:text-base">Interés Académico</h5>
                                <div className="text-center py-1">
                                    <p className="text-xs text-blue-500 uppercase tracking-wide font-bold mb-1">Licenciatura</p>
                                    <p className="text-base sm:text-lg font-bold text-brand-primary">{licenciaturaMap.get(lead.program_id)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h5 className="font-bold text-gray-800 mb-4 text-sm sm:text-base">Gestión de Asignación</h5>
                                <div className="space-y-4">
                                    <Select 
                                        label="Asesor Responsable"
                                        name="advisor_id"
                                        value={lead.advisor_id}
                                        onChange={handleDetailChange}
                                        disabled={true} 
                                        className="bg-gray-100 cursor-not-allowed" 
                                        options={advisors.map(a => ({ value: a.id, label: a.full_name }))}
                                    />
                                    <Button 
                                        variant="secondary" 
                                        onClick={() => setTransferModalOpen(true)}
                                        className="w-full justify-center"
                                        leftIcon={<TransferIcon className="w-4 h-4"/>}
                                    >
                                        Transferir Lead (Cambiar Asesor)
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: BITÁCORA DIVIDIDA (SECCIONES PLEGABLES) */}
                {activeTab === 'activity' && (
                    <div className="animate-fade-in flex flex-col space-y-4 sm:space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                            <h3 className="font-bold text-gray-800 text-sm sm:text-base">Bitácora de Seguimiento</h3>
                            <Button size="sm" className="w-full sm:w-auto" leftIcon={<PlusIcon className="w-4 h-4"/>} onClick={() => setFollowUpModalOpen(true)}>
                                Agregar Nota
                            </Button>
                        </div>

                        {/* SECCIÓN 1: NOTAS DE SEGUIMIENTO */}
                        <CollapsibleSection 
                            title="Notas de Seguimiento" 
                            icon={<DocumentTextIcon className="w-5 h-5 text-gray-500"/>} 
                            count={activitySections.notes.length}
                            defaultOpen={false}
                        >
                            <div className="space-y-4">
                                {activitySections.notes.length > 0 ? activitySections.notes.map((item, idx) => (
                                    <div key={`note-${idx}`} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative pl-3 group">
                                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand-secondary rounded-r-md"></div>
                                        
                                        <div className="flex justify-between items-center mb-2 border-b border-gray-50 pb-1">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {item.actionDate.toLocaleDateString()} {item.actionDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                </span>
                                                <span className="text-xs text-gray-500">Por: <span className="text-brand-secondary font-semibold">{item.user}</span></span>
                                            </div>
                                            {isAdmin && (
                                                // CAMBIO AQUÍ: Ahora llama a setFollowUpToDelete
                                                <button onClick={() => setFollowUpToDelete(item.data.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <TrashIcon className="w-3 h-3"/>
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold mb-2 border border-blue-100">
                                                <CalendarIcon className="w-3 h-3"/>
                                                Contacto: {item.contactDate.toLocaleDateString()}
                                            </div>
                                            <ExpandableText text={item.data.notes} className="text-gray-700 text-sm ml-1" />
                                        </div>
                                    </div>
                                )) : <p className="text-center text-gray-400 text-sm italic py-2">No hay notas registradas.</p>}
                            </div>
                        </CollapsibleSection>

                        {/* SECCIÓN 2: CAMBIOS EN LEADS */}
                        <CollapsibleSection 
                            title="Cambios en Leads" 
                            icon={<TagIcon className="w-5 h-5 text-orange-500"/>} 
                            count={activitySections.leadChanges.length}
                            defaultOpen={false}
                        >
                            <div className="relative border-l-2 border-gray-200 ml-2 space-y-4 pb-1 pl-4">
                                {activitySections.leadChanges.length > 0 ? activitySections.leadChanges.map((item, idx) => (
                                    <div key={`change-${idx}`} className="relative">
                                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-orange-400 border-2 border-white shadow-sm"></div>
                                        <div className="text-sm">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>{item.actionDate.toLocaleDateString()} {item.actionDate.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</span>
                                                <span className="font-semibold text-brand-secondary">{item.user}</span>
                                            </div>
                                            
                                            {item.type === 'status_change' ? (
                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-100">
                                                    <span className="text-gray-500 line-through text-xs">
                                                        {item.data.old_status_id ? statusMap.get(item.data.old_status_id)?.name : 'Inicio'}
                                                    </span>
                                                    <ArrowPathIcon className="w-3 h-3 text-orange-400" />
                                                    <span className="font-bold text-gray-800">
                                                        {statusMap.get(item.data.new_status_id)?.name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="bg-blue-50 text-blue-900 p-2 rounded border border-blue-100 text-xs">
                                                    <strong>Transferencia:</strong> {item.data.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : <p className="text-gray-400 text-xs italic">Sin cambios de estado.</p>}
                            </div>
                        </CollapsibleSection>

                        {/* SECCIÓN 3: HISTÓRICO DE CITAS */}
                        <CollapsibleSection 
                            title="Histórico de Citas" 
                            icon={<CalendarIcon className="w-5 h-5 text-purple-500"/>} 
                            count={activitySections.appointmentsHistory.length}
                            defaultOpen={false}
                        >
                            <div className="space-y-3">
                                {activitySections.appointmentsHistory.length > 0 ? activitySections.appointmentsHistory.map((item, idx) => (
                                    <div key={`appt-${idx}`} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col gap-2">
                                        <div className="flex justify-between items-start border-b border-gray-50 pb-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {item.actionDate.toLocaleDateString()} {item.actionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                                <span className="text-xs text-gray-500">Por: <span className="text-brand-secondary">{item.user}</span></span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.data.status === 'completed' ? 'bg-green-100 text-green-700' : (item.data.status === 'canceled' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700')}`}>
                                                {item.data.status === 'completed' ? 'Completada' : (item.data.status === 'canceled' ? 'Cancelada' : 'Programada')}
                                            </span>
                                        </div>
                                        
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm mb-1">{item.data.title}</p>
                                            <div className="bg-purple-50 p-2 rounded text-xs text-purple-900 mb-2 border border-purple-100 inline-block w-full sm:w-auto">
                                                📅 <strong>Fecha Cita:</strong> {item.eventDate?.toLocaleDateString()} a las {item.eventDate?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </div>
                                            <p className="text-xs text-gray-600 italic border-l-2 border-gray-200 pl-2">{item.data.details}</p>
                                        </div>
                                        
                                        {isAdmin && (
                                            <div className="flex justify-end pt-1">
                                                <button onClick={() => onDeleteAppointment(lead.id, item.data.id)} className="text-gray-300 hover:text-red-500">
                                                    <TrashIcon className="w-3 h-3"/>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )) : <p className="text-gray-400 text-xs italic text-center py-2">No hay historial de citas.</p>}
                            </div>
                        </CollapsibleSection>
                    </div>
                )}

                {/* TAB 3: AGENDA Y CITAS (WIDGET PRINCIPAL) */}
                {activeTab === 'appointments' && (
                    <div className="animate-fade-in space-y-6">
                        {/* Próxima Cita */}
                        <div className={`rounded-xl p-6 border-2 ${activeAppointment ? (isUrgentAppointment ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100') : 'bg-gray-50 border-dashed border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h5 className="font-bold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-2">
                                    {activeAppointment ? 'Próxima Cita Programada' : 'Sin Citas Pendientes'}
                                    {isUrgentAppointment && <BellAlertIcon className="w-5 h-5 text-red-500 animate-bounce" />}
                                </h5>
                                {activeAppointment && (
                                    <button onClick={() => setAppointmentModalOpen(true)} className="text-xs text-blue-600 hover:underline">
                                        Editar Cita
                                    </button>
                                )}
                            </div>
                            
                            {activeAppointment ? (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                                        <p className="font-black text-gray-900 text-4xl">{new Date(activeAppointment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        <p className="text-lg text-gray-600 font-medium">{new Date(activeAppointment.date).toLocaleDateString([], {weekday: 'long', day: 'numeric', month: 'long'})}</p>
                                    </div>
                                    <p className="text-sm text-gray-600 bg-white/50 p-3 rounded-lg border border-black/5">{activeAppointment.details}</p>
                                    
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <Button className="flex-1 justify-center" onClick={() => onUpdateAppointmentStatus(lead.id, activeAppointment.id, 'completed')}>
                                            Marcar como Completada
                                        </Button>
                                        <Button variant="ghost" className="flex-1 justify-center text-red-600 hover:bg-red-50" onClick={() => setCancelConfirmOpen(true)}>
                                            Cancelar Cita
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 mb-4">Agenda una cita para avanzar en el proceso.</p>
                                    <Button onClick={() => setAppointmentModalOpen(true)}>
                                        Programar Nueva Cita
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
      </Modal>

      {/* MODALES AUXILIARES */}
      <ConfirmationModal
        isOpen={isCancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={() => {
            if (activeAppointment) onUpdateAppointmentStatus(lead.id, activeAppointment.id, 'canceled');
        }}
        title="Cancelar Cita"
        message="¿Confirmas que deseas cancelar esta cita? Quedará registrada en el historial como cancelada."
        confirmButtonVariant="danger"
      />

      {/* NUEVO MODAL: Confirmación para eliminar NOTAS */}
      <ConfirmationModal
        isOpen={!!followUpToDelete}
        onClose={() => setFollowUpToDelete(null)}
        onConfirm={() => {
            if (followUpToDelete) {
                onDeleteFollowUp(lead.id, followUpToDelete);
                setFollowUpToDelete(null);
            }
        }}
        title="¿Eliminar Nota?"
        message="Esta acción no se puede deshacer. ¿Seguro que deseas eliminar esta nota de seguimiento?"
        confirmButtonVariant="danger"
      />

      {isAppointmentModalOpen && (
          <AppointmentFormModal
            isOpen={isAppointmentModalOpen}
            onClose={() => setAppointmentModalOpen(false)}
            lead={lead}
            appointment={activeAppointment}
            existingAppointments={lead.appointments || []} 
            canDelete={isAdmin}
            onSave={(data) => onSaveAppointment(lead.id, data, activeAppointment?.id)}
            onDelete={() => {
                if(activeAppointment) {
                    onDeleteAppointment(lead.id, activeAppointment.id);
                    setAppointmentModalOpen(false);
                }
            }}
           />
      )}
      
      {isFollowUpModalOpen && (
          <FollowUpFormModal 
            isOpen={isFollowUpModalOpen} 
            onClose={() => setFollowUpModalOpen(false)} 
            onSave={(data) => { 
                const [year, month, day] = data.date.split('-').map(Number);
                const localDate = new Date(year, month - 1, day); 
                localDate.setHours(12, 0, 0, 0); 
                
                onAddFollowUp(lead.id, { 
                    date: localDate.toISOString(), 
                    notes: data.notes 
                }); 
                setFollowUpModalOpen(false); 
            }}
          />
      )}
      
      {isTransferModalOpen && (
        <TransferLeadModal 
          isOpen={isTransferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          onTransfer={(newAdvisorId, reason) => onTransferLead(lead.id, newAdvisorId, reason)}
          advisors={advisors}
          currentAdvisorId={lead.advisor_id}
        />
      )}
    </>
  );
};

export default LeadDetailModal;