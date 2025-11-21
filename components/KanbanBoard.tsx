// components/KanbanBoard.tsx
import React, { useMemo } from 'react';
import { Lead, Status, Profile, Licenciatura } from '../types';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import CalendarIcon from './icons/CalendarIcon';
import BellAlertIcon from './icons/BellAlertIcon';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Badge from './common/Badge'; // Importamos el nuevo componente

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
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;
      if (destination.droppableId !== source.droppableId) {
          onLeadMove(draggableId, destination.droppableId);
      }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex overflow-x-auto pb-6 h-[calc(100vh-220px)] space-x-6 p-2">
        {statuses.map((status) => {
            const statusLeads = leads.filter((l) => l.status_id === status.id);
            
            return (
            <div key={status.id} className="flex-shrink-0 w-80 flex flex-col bg-gray-50/50 rounded-2xl border border-gray-200/60 max-h-full shadow-sm backdrop-blur-sm">
                {/* Column Header */}
                <div className="p-4 flex justify-between items-center sticky top-0 z-10 bg-gray-50/95 rounded-t-2xl backdrop-blur-md border-b border-gray-200/50">
                    <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${status.color}`}></span>
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide truncate max-w-[150px]" title={status.name}>
                            {status.name}
                        </h3>
                    </div>
                    <span className="bg-white text-gray-500 text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-200 shadow-sm">
                        {statusLeads.length}
                    </span>
                </div>

                {/* Cards Container */}
                <Droppable droppableId={status.id}>
                    {(provided, snapshot) => (
                        <div 
                            className={`p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar transition-colors rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-brand-secondary/5' : ''}`}
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
                                                className={`
                                                    group relative bg-white p-4 rounded-xl border border-gray-100
                                                    hover:shadow-lg hover:border-brand-secondary/30 transition-all duration-300
                                                    ${isUrgent ? 'ring-2 ring-red-400 shadow-red-100' : 'shadow-sm'} 
                                                    ${snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105 z-50 ring-2 ring-brand-secondary' : ''}
                                                `}
                                            >
                                                {/* Barra lateral de color sutil en lugar de borde grueso */}
                                                <div className={`absolute left-1 top-3 bottom-3 w-1 rounded-full opacity-60 ${status.color}`}></div>

                                                <div className="pl-3 cursor-pointer" onClick={() => onViewDetails(lead)}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-gray-800 text-sm hover:text-brand-secondary line-clamp-1 transition-colors">
                                                            {lead.first_name} {lead.paternal_last_name}
                                                        </h4>
                                                        {isUrgent && (
                                                            <BellAlertIcon className="w-5 h-5 text-red-500 animate-pulse" />
                                                        )}
                                                        {!isUrgent && hasAppointment && (
                                                            <CalendarIcon className="w-4 h-4 text-emerald-500" />
                                                        )}
                                                    </div>
                                                    
                                                    <div className="mb-3">
                                                        <Badge color="bg-gray-100" size="sm">
                                                            {licenciaturaMap.get(lead.program_id) || 'Sin programa'}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                            {(advisorMap.get(lead.advisor_id) || '?').charAt(0)}
                                                        </div>
                                                        <span className="truncate max-w-[120px]">{advisorMap.get(lead.advisor_id) || 'N/A'}</span>
                                                    </div>
                                                </div>

                                                {/* Action Bar (Visible on Hover) */}
                                                <div className="pl-3 pt-3 mt-3 border-t border-gray-50 flex justify-between items-center">
                                                    <div className="flex space-x-1">
                                                        <button onClick={() => onOpenWhatsApp(lead)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="WhatsApp">
                                                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                                        </button>
                                                        {lead.email && (
                                                            <button onClick={() => onOpenEmail(lead)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Email">
                                                                <EnvelopeIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <button onClick={() => onEdit(lead)} className="p-1.5 text-gray-400 hover:text-brand-secondary hover:bg-brand-secondary/10 rounded-lg transition-all" title="Editar">
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => onDelete(lead.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
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
                                <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                        <span className="text-xl">∅</span>
                                    </div>
                                    <span className="text-xs font-medium">Sin leads</span>
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