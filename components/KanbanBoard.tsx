// components/KanbanBoard.tsx
import React, { useMemo } from 'react';
import { Lead, Status, Profile, Licenciatura } from '../types';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import CalendarIcon from './icons/CalendarIcon';
import BellAlertIcon from './icons/BellAlertIcon';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import ClockIcon from './icons/ClockIcon';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Badge from './common/Badge';

interface KanbanBoardProps {
  leads: Lead[];
  statuses: Status[];
  advisors: Profile[];
  licenciaturas: Licenciatura[];
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onViewDetails: (lead: Lead, tab?: 'info' | 'activity' | 'appointments') => void;
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
  // Agregado mapa de estatus para acceder a la categoría
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.id, { category: s.category || 'active', color: s.color }])), [statuses]);

  // --- LÓGICA DE URGENCIA CENTRALIZADA ---
  const getLeadUrgency = (lead: Lead) => {
    // 1. VERIFICAR CATEGORÍA: Si no es 'active', no hay urgencia.
    const statusInfo = statusMap.get(lead.status_id);
    if (statusInfo?.category !== 'active') return 0;

    const now = new Date();
    
    // NIVEL 3: Cita próxima (< 48h) -> ROJO
    if(lead.appointments?.some(a => a.status === 'scheduled')) {
        const activeAppt = lead.appointments.find(a => a.status === 'scheduled');
        if(activeAppt) {
            const apptDate = new Date(activeAppt.date);
            const hoursDiff = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            if(hoursDiff > 0 && hoursDiff <= 48) return 3; 
        }
    }

    // NIVEL 2: Leads Desatendidos -> AMARILLO
    const regDate = new Date(lead.registration_date);
    const daysSinceReg = (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Caso A: Nuevo sin seguimiento > 3 días
    if ((!lead.follow_ups || lead.follow_ups.length === 0) && daysSinceReg > 3) {
        return 2; 
    }

    // Caso B: Abandonado (último seguimiento > 7 días)
    if (lead.follow_ups && lead.follow_ups.length > 0) {
        const lastFollowUp = [...lead.follow_ups].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const daysSinceFollowUp = (now.getTime() - new Date(lastFollowUp.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceFollowUp > 7) return 2;
    }

    return 0; // Normal
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
        <div className="flex overflow-x-auto pb-6 h-[calc(100dvh-240px)] space-x-4 p-2 snap-x snap-mandatory sm:space-x-6 scroll-smooth">
        {statuses.map((status) => {
            const statusLeads = leads.filter((l) => l.status_id === status.id);
            
            return (
            <div 
                key={status.id} 
                className="flex-shrink-0 w-[85vw] sm:w-80 flex flex-col bg-gray-50/50 rounded-2xl border border-gray-200/60 max-h-full shadow-sm backdrop-blur-sm snap-center"
            >
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

                <Droppable droppableId={status.id}>
                    {(provided, snapshot) => (
                        <div 
                            className={`p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar transition-colors rounded-b-2xl ${snapshot.isDraggingOver ? 'bg-brand-secondary/5' : ''}`}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{ minHeight: '100px' }} 
                        >
                            {statusLeads.map((lead, index) => {
                                const urgencyLevel = getLeadUrgency(lead);
                                const hasAppointment = lead.appointments?.some(a => a.status === 'scheduled');

                                // Estilos dinámicos basados en urgencia
                                let cardClasses = "group relative bg-white p-4 rounded-xl border transition-all duration-300 active:scale-95 cursor-grab active:cursor-grabbing";
                                let urgencyBadge = null;

                                if (urgencyLevel === 3) { // Muy Urgente (Rojo)
                                    cardClasses += " border-red-200 shadow-md shadow-red-100 ring-1 ring-red-300";
                                    urgencyBadge = (
                                        <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm z-10 animate-pulse" title="Cita Inminente">
                                            <BellAlertIcon className="w-3 h-3" />
                                        </div>
                                    );
                                } else if (urgencyLevel === 2) { // Atención (Amarillo)
                                    cardClasses += " border-amber-200 shadow-sm shadow-amber-50 ring-1 ring-amber-200";
                                    urgencyBadge = (
                                        <div className="absolute -top-2 -right-2 bg-amber-400 text-white rounded-full p-1 shadow-sm z-10" title="Requiere Atención (Sin seguimiento)">
                                            <ExclamationCircleIcon className="w-3 h-3" />
                                        </div>
                                    );
                                } else { // Normal
                                    cardClasses += " border-gray-100 shadow-sm hover:shadow-md hover:border-brand-secondary/30";
                                }

                                if (snapshot.isDragging) {
                                    cardClasses += " shadow-2xl rotate-2 scale-105 z-50 ring-2 ring-brand-secondary border-transparent";
                                }

                                return (
                                    // @ts-ignore
                                    <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div 
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                // @ts-ignore
                                                style={{ ...provided.draggableProps.style }}
                                                className={cardClasses}
                                            >
                                                {urgencyBadge}
                                                <div className={`absolute left-1 top-3 bottom-3 w-1 rounded-full opacity-60 ${status.color}`}></div>

                                                <div className="pl-3 cursor-pointer" onClick={() => onViewDetails(lead)}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-gray-800 text-sm hover:text-brand-secondary line-clamp-1 transition-colors">
                                                            {lead.first_name} {lead.paternal_last_name}
                                                        </h4>
                                                        
                                                        {!urgencyBadge && hasAppointment && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onViewDetails(lead, 'appointments'); }}
                                                                className="hover:scale-110 transition-transform"
                                                                title="Cita Programada"
                                                            >
                                                                <CalendarIcon className="w-4 h-4 text-emerald-500" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <Badge color="bg-gray-100" size="sm">
                                                            {licenciaturaMap.get(lead.program_id) || 'Sin programa'}
                                                        </Badge>
                                                        {/* Mostrar fecha relativa si está "enfriándose" */}
                                                        {urgencyLevel === 2 && (
                                                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded">
                                                                <ClockIcon className="w-3 h-3"/> +3d
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-50 pt-2">
                                                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                            {(advisorMap.get(lead.advisor_id) || '?').charAt(0)}
                                                        </div>
                                                        <span className="truncate max-w-[120px]">{advisorMap.get(lead.advisor_id) || 'N/A'}</span>
                                                    </div>
                                                </div>

                                                <div className="pl-3 pt-2 mt-2 border-t border-gray-50 flex justify-between items-center">
                                                    <div className="flex space-x-2"> 
                                                        <button onClick={() => onOpenWhatsApp(lead)} className="p-1.5 text-gray-400 hover:text-green-600 bg-gray-50 hover:bg-green-50 rounded-lg transition-all" title="WhatsApp">
                                                            <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                                        </button>
                                                        {lead.email && (
                                                            <button onClick={() => onOpenEmail(lead)} className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all" title="Email">
                                                                <EnvelopeIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => onEdit(lead)} className="p-1.5 text-gray-400 hover:text-brand-secondary hover:bg-gray-100 rounded-lg transition-all">
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => onDelete(lead.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
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