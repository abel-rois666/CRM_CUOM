import React, { useMemo } from 'react';
import { Lead, Status, Profile, Licenciatura } from '../types';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import CalendarIcon from './icons/CalendarIcon';
import BellAlertIcon from './icons/BellAlertIcon';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface KanbanBoardProps {
  leads: Lead[];
  statuses: Status[];
  advisors: Profile[];
  licenciaturas: Licenciatura[];
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onViewDetails: (lead: Lead) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onOpenEmail: (lead: Lead) => void;
  onLeadMove: (leadId: string, newStatusId: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  statuses,
  advisors,
  licenciaturas,
  onEdit,
  onDelete,
  onViewDetails,
  onOpenWhatsApp,
  onOpenEmail,
  onLeadMove,
}) => {
  const advisorMap = useMemo(() => new Map(advisors.map(a => [a.id, a.full_name])), [advisors]);
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

  const onDragEnd = (result: DropResult) => {
      const { destination, source, draggableId } = result;

      if (!destination) return;

      if (
          destination.droppableId === source.droppableId &&
          destination.index === source.index
      ) {
          return;
      }

      // If dropped in a different column
      if (destination.droppableId !== source.droppableId) {
          onLeadMove(draggableId, destination.droppableId);
      }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex overflow-x-auto pb-4 h-[calc(100vh-220px)] space-x-4">
        {statuses.map((status) => {
            const statusLeads = leads.filter((l) => l.status_id === status.id);
            
            return (
            <div key={status.id} className="flex-shrink-0 w-80 flex flex-col bg-gray-100 rounded-lg border border-gray-200 max-h-full">
                {/* Column Header */}
                <div className={`p-3 rounded-t-lg border-b border-gray-200 bg-white flex justify-between items-center sticky top-0 z-10`}>
                <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${status.color}`}></span>
                    <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider truncate" title={status.name}>
                        {status.name}
                    </h3>
                </div>
                <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                    {statusLeads.length}
                </span>
                </div>

                {/* Cards Container (Droppable) */}
                <Droppable droppableId={status.id}>
                    {(provided, snapshot) => (
                        <div 
                            className={`p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/80' : ''}`}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{ minHeight: '100px' }} 
                        >
                            {statusLeads.map((lead, index) => {
                                const isUrgent = isAppointmentUrgent(lead);
                                const hasAppointment = lead.appointments?.some(a => a.status === 'scheduled');

                                return (
                                    <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div 
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{ ...provided.draggableProps.style }}
                                                className={`bg-white p-3 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group relative ${isUrgent ? 'ring-2 ring-red-300' : ''} ${snapshot.isDragging ? 'shadow-lg rotate-2 z-50' : ''}`}
                                            >
                                                {/* Card Color Indicator */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${status.color}`}></div>

                                                <div className="pl-2 cursor-pointer" onClick={() => onViewDetails(lead)}>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-bold text-gray-800 text-sm hover:text-brand-secondary line-clamp-1">
                                                            {lead.first_name} {lead.paternal_last_name}
                                                        </h4>
                                                        {isUrgent && (
                                                            <span title="Cita Urgente">
                                                                <BellAlertIcon className="w-4 h-4 text-red-500 animate-pulse" />
                                                            </span>
                                                        )}
                                                        {!isUrgent && hasAppointment && (
                                                            <span title="Cita Programada">
                                                                <CalendarIcon className="w-4 h-4 text-green-600" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <p className="text-xs text-gray-500 mb-1 truncate">
                                                    {licenciaturaMap.get(lead.program_id) || 'Sin programa'}
                                                    </p>
                                                    
                                                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                                    <span>Asesor:</span>
                                                    <span className="text-gray-600 font-medium truncate">{advisorMap.get(lead.advisor_id) || 'N/A'}</span>
                                                    </p>
                                                </div>

                                                <div className="pl-2 pt-2 border-t border-gray-100 flex justify-between items-center mt-2">
                                                    <div className="flex space-x-1">
                                                        <button onClick={() => onOpenWhatsApp(lead)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="WhatsApp">
                                                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                                        </button>
                                                        {lead.email && (
                                                            <button onClick={() => onOpenEmail(lead)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Email">
                                                                <EnvelopeIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <button onClick={() => onEdit(lead)} className="p-1.5 text-gray-400 hover:text-brand-secondary hover:bg-blue-50 rounded transition-colors" title="Editar">
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => onDelete(lead.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
                            {provided.placeholder}
                            {statusLeads.length === 0 && !snapshot.isDraggingOver && (
                                <div className="text-center py-8 text-gray-400 text-xs italic">
                                    Sin leads
                                </div>
                            )}
                        </div>
                    )}
                </Droppable>
            </div>
            );
        })}
        </div>
    </DragDropContext>
  );
};

export default KanbanBoard;