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
}

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  appointment: Appointment | undefined;
  onSave: (appointmentData: Omit<Appointment, 'id' | 'status' | 'lead_id'>) => void;
  onDelete: () => void;
}

const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({ isOpen, onClose, lead, appointment, onSave, onDelete }) => {
  const fullNameForAppointment = `${lead.first_name} ${lead.paternal_last_name}`.trim();
  const [formData, setFormData] = useState({
    title: appointment?.title || `Cita con ${fullNameForAppointment}`,
    date: appointment ? new Date(appointment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    time: appointment ? new Date(appointment.date).toTimeString().substring(0, 5) : '10:00',
    duration: appointment?.duration || 60,
    details: appointment?.details || `Discutir el programa de interés.`,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>{appointment ? 'Guardar' : 'Programar'}</Button>
                </div>
            </div>
        </div>
    </Modal>
  );
};

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ isOpen, onClose, lead, advisors, statuses, sources, licenciaturas, onAddFollowUp, onDeleteFollowUp, onUpdateLead, onSaveAppointment, onUpdateAppointmentStatus, onDeleteAppointment, onTransferLead, currentUser }) => {
  const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [isFollowUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [isCancelConfirmOpen, setCancelConfirmOpen] = useState(false);

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

  // --- NUEVA LÓGICA: Combinar Actividad ---
  const allActivity = useMemo(() => {
      const activities: { type: 'followup' | 'appointment'; date: string; data: any }[] = [];
      
      // 1. Agregar Seguimientos
      if (lead?.follow_ups) {
          lead.follow_ups.forEach(f => activities.push({ type: 'followup', date: f.date, data: f }));
      }
      
      // 2. Agregar Citas Pasadas (Histórico)
      if (pastAppointments) {
          pastAppointments.forEach(a => activities.push({ type: 'appointment', date: a.date, data: a }));
      }

      // Ordenar descendente (más reciente arriba)
      return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [lead?.follow_ups, pastAppointments]);

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
      <Modal isOpen={isOpen} onClose={onClose} title="Expediente del Alumno" size="4xl">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* COLUMNA IZQUIERDA: Info Clave */}
          <div className="w-full lg:w-1/3 space-y-6">
            
            {/* Tarjeta de Perfil */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-brand-secondary text-white flex items-center justify-center text-xl font-bold shadow-md">
                        {lead.first_name.charAt(0)}
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 leading-tight">{fullName}</h4>
                        <p className="text-xs text-gray-500 mt-1">Registrado: {new Date(lead.registration_date).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-200/60">
                        <span className="text-gray-500">Email</span>
                        <span className="font-medium text-gray-900 truncate max-w-[180px]" title={lead.email}>{lead.email || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200/60">
                        <span className="text-gray-500">Teléfono</span>
                        <span className="font-medium text-gray-900">{lead.phone}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200/60">
                        <span className="text-gray-500">Interés</span>
                        <span className="font-medium text-brand-secondary text-right">{licenciaturaMap.get(lead.program_id)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-gray-500">Origen</span>
                        <span className="font-medium text-gray-900">{sourceMap.get(lead.source_id)}</span>
                    </div>
                </div>
            </div>

            {/* Gestión de Estado y Asesor */}
            <div className="space-y-4">
                <Select 
                    label="Estado Actual"
                    name="status_id"
                    value={lead.status_id}
                    onChange={handleDetailChange}
                    options={statuses.map(s => ({ value: s.id, label: s.name }))}
                    className="bg-white"
                />
                
                <div className="relative">
                    <Select 
                        label="Asesor Responsable"
                        name="advisor_id"
                        value={lead.advisor_id}
                        onChange={handleDetailChange}
                        disabled={currentUser?.role !== 'admin'}
                        options={advisors.map(a => ({ value: a.id, label: a.full_name }))}
                        className="bg-white pr-12" 
                    />
                    <button 
                        onClick={() => setTransferModalOpen(true)}
                        className="absolute right-2 bottom-1.5 p-1.5 text-gray-400 hover:text-brand-secondary hover:bg-blue-50 rounded-lg transition-colors"
                        title="Transferir Lead"
                    >
                        <TransferIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Próxima Cita Widget */}
            <div className={`rounded-xl p-4 border ${activeAppointment ? (isUrgentAppointment ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100') : 'bg-gray-50 border-dashed border-gray-200'}`}>
                <div className="flex justify-between items-center mb-3">
                    <h5 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Próxima Cita</h5>
                    {isUrgentAppointment && <BellAlertIcon className="w-5 h-5 text-red-500 animate-bounce" />}
                </div>
                
                {activeAppointment ? (
                    <div className="space-y-2">
                        <p className="font-bold text-gray-900 text-lg">{new Date(activeAppointment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        <p className="text-sm text-gray-600 font-medium">{new Date(activeAppointment.date).toLocaleDateString([], {weekday: 'long', day: 'numeric', month: 'long'})}</p>
                        <p className="text-xs text-gray-500 italic border-l-2 border-gray-300 pl-2">{activeAppointment.details}</p>
                        
                        <div className="flex gap-2 mt-3 pt-2 border-t border-black/5">
                            <Button size="sm" variant="secondary" className="w-full text-xs" onClick={() => onUpdateAppointmentStatus(lead.id, activeAppointment.id, 'completed')}>
                                Completar
                            </Button>
                            <Button size="sm" variant="ghost" className="w-full text-xs text-red-600 hover:bg-red-50" onClick={() => setCancelConfirmOpen(true)}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-2">
                        <p className="text-sm text-gray-400 mb-3">No hay citas programadas</p>
                        <Button size="sm" variant="secondary" className="w-full" onClick={() => setAppointmentModalOpen(true)}>
                            Agendar Cita
                        </Button>
                    </div>
                )}
            </div>
          </div>

          {/* COLUMNA DERECHA: Línea de Tiempo y Actividad */}
          <div className="w-full lg:w-2/3 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Historial de Actividad</h3>
                <Button size="sm" leftIcon={<PlusIcon className="w-4 h-4"/>} onClick={() => setFollowUpModalOpen(true)}>
                    Nuevo Seguimiento
                </Button>
            </div>

            {/* Timeline Container */}
            <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6 shadow-sm overflow-y-auto max-h-[500px] custom-scrollbar">
                <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                    
                    {allActivity.map((item, idx) => {
                        const isAppointment = item.type === 'appointment';
                        const isFollowUp = item.type === 'followup';
                        const isTransfer = isFollowUp && item.data.notes.includes('TRANSICIÓN DE ASESOR');
                        
                        return (
                            <div key={`${item.type}-${item.data.id}`} className="relative pl-8 group">
                                {/* Icono en la línea de tiempo */}
                                <div className={`absolute -left-[13px] top-0 w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${isAppointment ? 'bg-purple-100 text-purple-600' : (isTransfer ? 'bg-blue-100 text-blue-600' : 'bg-brand-secondary/10 text-brand-secondary')}`}>
                                    {isAppointment ? <CalendarIcon className="w-4 h-4" /> : <ChatBubbleLeftRightIcon className="w-4 h-4"/>}
                                </div>
                                
                                <div className="flex justify-between items-start">
                                    <div className="w-full">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            {isAppointment && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.data.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.data.status === 'completed' ? 'Cita Completada' : 'Cita Cancelada'}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {isAppointment ? (
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <p className="font-semibold text-gray-800 text-sm">{item.data.title}</p>
                                                <p className="text-xs text-gray-600 mt-1">{item.data.details}</p>
                                            </div>
                                        ) : (
                                            <p className={`mt-1 text-sm ${isTransfer ? 'text-blue-800 font-medium bg-blue-50 p-3 rounded-lg border border-blue-100' : 'text-gray-700 bg-white'}`}>
                                                {item.data.notes}
                                            </p>
                                        )}
                                    </div>
                                    
                                    {/* Botón de eliminar (solo para seguimientos o citas pasadas) */}
                                    <button 
                                        onClick={() => isAppointment ? onDeleteAppointment(lead.id, item.data.id) : onDeleteFollowUp(lead.id, item.data.id)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity p-1 ml-2"
                                        title="Eliminar registro"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {allActivity.length === 0 && (
                        <div className="pl-8 text-gray-400 italic text-sm">
                            No hay registros de actividad aún.
                        </div>
                    )}
                </div>
                
                {/* Sección Colapsable: Historial de Estados */}
                <div className="mt-10 pt-6 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Auditoría de Cambios de Estado</h4>
                    <div className="space-y-3">
                        {(lead.status_history || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(change => {
                             const oldStatus = change.old_status_id ? statusMap.get(change.old_status_id) : null;
                             const newStatus = statusMap.get(change.new_status_id);
                             return (
                                <div key={change.id} className="flex items-center text-xs text-gray-600 gap-2">
                                    <span className="text-gray-400 w-24">{new Date(change.date).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                        <span>{oldStatus?.name || 'Inicio'}</span>
                                        <ArrowPathIcon className="w-3 h-3 text-gray-400" />
                                        <span className="font-bold text-gray-800">{newStatus?.name}</span>
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={isCancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={() => {
            if (activeAppointment) onUpdateAppointmentStatus(lead.id, activeAppointment.id, 'canceled');
        }}
        title="Cancelar Cita"
        message="¿Confirmas que deseas cancelar esta cita? Quedará registrada en el historial."
        confirmButtonVariant="danger"
      />

      {isAppointmentModalOpen && (
          <AppointmentFormModal
            isOpen={isAppointmentModalOpen}
            onClose={() => setAppointmentModalOpen(false)}
            lead={lead}
            appointment={activeAppointment}
            onSave={(data) => onSaveAppointment(lead.id, data, activeAppointment?.id)}
            onDelete={() => activeAppointment && onDeleteAppointment(lead.id, activeAppointment.id)}
           />
      )}
      {isFollowUpModalOpen && (
          <FollowUpFormModal 
            isOpen={isFollowUpModalOpen} 
            onClose={() => setFollowUpModalOpen(false)} 
            onSave={(data) => { onAddFollowUp(lead.id, { date: new Date(data.date).toISOString(), notes: data.notes }); setFollowUpModalOpen(false); }}
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