
import React, { useState, useMemo } from 'react';
import { Lead, Advisor, Status, FollowUp, Source, Appointment, Licenciatura } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import CalendarIcon from './icons/CalendarIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import FollowUpFormModal from './FollowUpFormModal';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ConfirmationModal from './common/ConfirmationModal';
import ArrowPathIcon from './icons/ArrowPathIcon';
import BellAlertIcon from './icons/BellAlertIcon';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  advisors: Advisor[];
  statuses: Status[];
  sources: Source[];
  licenciaturas: Licenciatura[];
  onAddFollowUp: (leadId: string, followUp: Omit<FollowUp, 'id'>) => void;
  onDeleteFollowUp: (leadId: string, followUpId: string) => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
  onSaveAppointment: (leadId: string, appointment: Omit<Appointment, 'id' | 'status'>, appointmentIdToEdit?: string) => void;
  onUpdateAppointmentStatus: (leadId: string, appointmentId: string, status: 'completed' | 'canceled') => void;
  onDeleteAppointment: (leadId: string, appointmentId: string) => void;
}

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  appointment: Appointment | undefined;
  onSave: (appointmentData: Omit<Appointment, 'id' | 'status'>) => void;
  onDelete: () => void;
}

const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({ isOpen, onClose, lead, appointment, onSave, onDelete }) => {
  const fullNameForAppointment = `${lead.firstName} ${lead.paternalLastName}`.trim();
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
  
  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar permanentemente esta cita?')) {
        onDelete();
    }
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
    if(lead.email) {
      url.searchParams.set('add', lead.email);
    }
    
    window.open(url.toString(), '_blank');
  };
  
  const inputFieldClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={appointment ? 'Editar Cita' : 'Programar Cita'} size="md">
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Título</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className={inputFieldClasses} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className={inputFieldClasses} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Hora</label>
                    <input type="time" name="time" value={formData.time} onChange={handleChange} className={inputFieldClasses} />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Duración (minutos)</label>
                <input type="number" name="duration" value={formData.duration} onChange={handleChange} className={inputFieldClasses} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Detalles</label>
                <textarea name="details" value={formData.details} onChange={handleChange} rows={3} className={inputFieldClasses} />
            </div>
            <div className="pt-4 flex justify-between items-center">
                <div>
                    {appointment && (
                        <Button variant="danger" onClick={handleDelete} leftIcon={<TrashIcon className="w-4 h-4" />}>
                            Borrar Cita
                        </Button>
                    )}
                </div>
                <div className="flex space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="secondary" onClick={createGoogleCalendarLink} leftIcon={<CalendarIcon />}>
                        Calendario
                    </Button>
                    <Button onClick={handleSave}>
                        {appointment ? 'Guardar Cambios' : 'Programar'}
                    </Button>
                </div>
            </div>
        </div>
    </Modal>
  );
};

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ isOpen, onClose, lead, advisors, statuses, sources, licenciaturas, onAddFollowUp, onDeleteFollowUp, onUpdateLead, onSaveAppointment, onUpdateAppointmentStatus, onDeleteAppointment }) => {
  const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [isFollowUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [isFollowUpHistoryOpen, setFollowUpHistoryOpen] = useState(true);
  const [isAppointmentHistoryOpen, setAppointmentHistoryOpen] = useState(false);
  const [isStatusHistoryOpen, setStatusHistoryOpen] = useState(false);
  const [isCancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const sourceMap = useMemo(() => new Map(sources.map(s => [s.id, s.name])), [sources]);
  const licenciaturaMap = useMemo(() => new Map(licenciaturas.map(l => [l.id, l.name])), [licenciaturas]);
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.id, { name: s.name, color: s.color }])), [statuses]);

  const { activeAppointment, pastAppointments } = useMemo(() => {
    if (!lead?.appointments) return { activeAppointment: undefined, pastAppointments: [] };
    
    const sortedAppointments = [...lead.appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const active = sortedAppointments.find(a => a.status === 'scheduled');
    const past = sortedAppointments.filter(a => a.status !== 'scheduled');

    return { activeAppointment: active, pastAppointments: past };
  }, [lead]);

  const isUrgentAppointment = useMemo(() => {
    if (!activeAppointment) return false;

    const appointmentDate = new Date(activeAppointment.date);
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    return appointmentDate > now && appointmentDate <= fortyEightHoursFromNow;
  }, [activeAppointment]);


  if (!lead) return null;
  
  const fullName = `${lead.firstName} ${lead.paternalLastName} ${lead.maternalLastName || ''}`.trim();

  const handleSaveFollowUp = (data: { date: string; notes: string }) => {
    onAddFollowUp(lead.id, {
      date: new Date(data.date).toISOString(),
      notes: data.notes,
    });
    setFollowUpModalOpen(false);
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    onUpdateLead(lead.id, { [name]: value });
  };
  
  const handleDeleteActiveAppointment = () => {
    if (activeAppointment) {
      onDeleteAppointment(lead.id, activeAppointment.id);
      setAppointmentModalOpen(false);
    }
  };
  
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Detalles del Lead" size="xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <h4 className="text-lg font-bold text-gray-800">{fullName}</h4>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-gray-900">{lead.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Teléfono</p>
              <p className="text-gray-900">{lead.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Fecha de Registro</p>
              <p className="text-gray-900">{new Date(lead.registrationDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Licenciatura de Interés</p>
              <p className="text-gray-900">{licenciaturaMap.get(lead.programId) || 'N/A'}</p>
            </div>
             <div>
              <p className="text-sm font-medium text-gray-500">Origen del Lead</p>
              <p className="text-gray-900">{sourceMap.get(lead.sourceId) || 'N/A'}</p>
            </div>
            <div>
              <label htmlFor="advisorId" className="text-sm font-medium text-gray-500">Asesor</label>
              <select
                id="advisorId"
                name="advisorId"
                value={lead.advisorId}
                onChange={handleDetailChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md"
              >
                {advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="statusId" className="text-sm font-medium text-gray-500">Estado</label>
              <select
                id="statusId"
                name="statusId"
                value={lead.statusId}
                onChange={handleDetailChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm rounded-md"
              >
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Cita Próxima</p>
                {isUrgentAppointment && (
                    <div className="flex items-center gap-3 p-3 mb-2 rounded-md bg-yellow-100 border border-yellow-200 text-yellow-800">
                        <BellAlertIcon className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-semibold">¡Atención! Esta cita es en menos de 48 horas.</p>
                    </div>
                )}
                {activeAppointment ? (
                    <div className="text-sm text-gray-900 bg-blue-50 p-3 rounded-md border border-blue-200">
                        <p className="font-semibold">{activeAppointment.title}</p>
                        <p>{new Date(activeAppointment.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        <p className="text-xs mt-1 italic">"{activeAppointment.details}"</p>
                        <div className="flex justify-end mt-2 space-x-2">
                           <Button size="sm" variant="ghost" className="bg-red-100 text-red-700 hover:bg-red-200" onClick={() => setCancelConfirmOpen(true)}>
                            Cancelar
                          </Button>
                          <Button size="sm" variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200" onClick={() => onUpdateAppointmentStatus(lead.id, activeAppointment.id, 'completed')}>
                            Completada
                          </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-600">No hay cita programada.</p>
                )}
                <Button onClick={() => setAppointmentModalOpen(true)} leftIcon={<CalendarIcon />} className="w-full">
                  {activeAppointment ? 'Ver/Editar Cita' : 'Programar Cita'}
                </Button>
                 {pastAppointments.length > 0 && (
                  <div className="mt-2 text-sm">
                    <button onClick={() => setAppointmentHistoryOpen(!isAppointmentHistoryOpen)} className="flex items-center justify-between w-full text-left text-gray-500 hover:text-gray-800">
                      <span>Historial de Citas</span>
                      <ChevronDownIcon className={`w-4 h-4 transition-transform ${isAppointmentHistoryOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isAppointmentHistoryOpen && (
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto pr-1">
                        {pastAppointments.map(appt => {
                          const isCompleted = appt.status === 'completed';
                          const statusClasses = isCompleted ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50';
                          const statusText = isCompleted ? 'Completada' : 'Cancelada';
                          const statusTextClasses = isCompleted ? 'text-green-700' : 'text-red-700';

                          return (
                            <div key={appt.id} className={`p-2 rounded border ${statusClasses} text-xs`}>
                              <div className="flex justify-between items-center">
                                <p className="font-semibold text-gray-800">{appt.title}</p>
                                <div className="flex items-center gap-1">
                                    <span className={`font-semibold px-1.5 py-0.5 rounded-full text-xs ${statusTextClasses} ${isCompleted ? 'bg-green-200' : 'bg-red-200'}`}>{statusText}</span>
                                    <Button variant="ghost" size="sm" onClick={() => { if(window.confirm('¿Seguro que quieres borrar esta cita?')) onDeleteAppointment(lead.id, appt.id) }}>
                                        <TrashIcon className="w-3 h-3 text-gray-400 hover:text-red-500"/>
                                    </Button>
                                </div>
                              </div>
                               <p className="text-gray-600">{new Date(appt.date).toLocaleDateString()}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
                <button 
                    className="flex items-center gap-2 w-full text-left"
                    onClick={() => setFollowUpHistoryOpen(!isFollowUpHistoryOpen)}
                    aria-expanded={isFollowUpHistoryOpen}
                >
                    <h4 className="text-lg font-bold text-gray-800">Historial de Seguimiento</h4>
                     <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isFollowUpHistoryOpen ? 'rotate-180' : ''}`} />
                </button>
                <Button onClick={() => setFollowUpModalOpen(true)} size="sm" leftIcon={<PlusIcon className="w-4 h-4" />}>
                    Añadir
                </Button>
            </div>
            {isFollowUpHistoryOpen && (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 border-t pt-4 mt-2">
                {lead.followUps.length > 0 ? (
                    lead.followUps.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(followUp => (
                    <div key={followUp.id} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-semibold text-brand-secondary">{new Date(followUp.date).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</p>
                            <Button variant="ghost" size="sm" onClick={() => onDeleteFollowUp(lead.id, followUp.id)}>
                                <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-500"/>
                            </Button>
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{followUp.notes}</p>
                    </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No hay seguimientos registrados.</p>
                )}
                </div>
            )}
            
            <div className="mt-6">
                <button 
                    className="flex items-center gap-2 w-full text-left mb-2"
                    onClick={() => setStatusHistoryOpen(!isStatusHistoryOpen)}
                    aria-expanded={isStatusHistoryOpen}
                >
                    <ArrowPathIcon className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-bold text-gray-800">Historial de Cambios de Estado</h4>
                     <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isStatusHistoryOpen ? 'rotate-180' : ''}`} />
                </button>
                {isStatusHistoryOpen && (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 border-t pt-4 mt-2">
                        {(lead.statusHistory || []).length > 0 ? (
                            [...lead.statusHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(change => {
                                const oldStatus = change.oldStatusId ? statusMap.get(change.oldStatusId) : null;
                                const newStatus = statusMap.get(change.newStatusId);
                                return (
                                    <div key={change.id} className="bg-gray-50 p-3 rounded-md border border-gray-200 text-sm">
                                        <p className="text-xs font-semibold text-brand-secondary">{new Date(change.date).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {oldStatus ? (
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${oldStatus.color}`}>{oldStatus.name}</span>
                                            ) : (
                                                <span className="text-xs text-gray-500 italic">Creado</span>
                                            )}
                                            <span className="text-gray-500 font-semibold">&rarr;</span>
                                            {newStatus && (
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${newStatus.color}`}>{newStatus.name}</span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No hay cambios de estado registrados.</p>
                        )}
                    </div>
                )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={isCancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={() => {
            if (activeAppointment) {
                onUpdateAppointmentStatus(lead.id, activeAppointment.id, 'canceled');
            }
        }}
        title="Confirmar Cancelación de Cita"
        message="¿Estás seguro de que quieres cancelar esta cita? La cita se moverá al historial como cancelada."
        confirmButtonText="Sí, Cancelar Cita"
        confirmButtonVariant="danger"
      />

      {isAppointmentModalOpen && (
          <AppointmentFormModal
            isOpen={isAppointmentModalOpen}
            onClose={() => setAppointmentModalOpen(false)}
            lead={lead}
            appointment={activeAppointment}
            onSave={(data) => onSaveAppointment(lead.id, data, activeAppointment?.id)}
            onDelete={handleDeleteActiveAppointment}
           />
      )}
      {isFollowUpModalOpen && (
          <FollowUpFormModal 
            isOpen={isFollowUpModalOpen} 
            onClose={() => setFollowUpModalOpen(false)} 
            onSave={handleSaveFollowUp}
          />
      )}
    </>
  );
};

export default LeadDetailModal;
