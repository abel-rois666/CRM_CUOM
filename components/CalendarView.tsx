// components/CalendarView.tsx
import React, { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Appointment, Lead } from '../types';

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  appointments: Appointment[];
  leads: Lead[];
  onEventClick: (lead: Lead) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ appointments, leads, onEventClick }) => {
  // 1. ESTADOS PARA CONTROLAR EL CALENDARIO MANUALMENTE
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);

  // Transformar datos
  const events = useMemo(() => {
    return appointments.map(appt => {
        const lead = leads.find(l => l.id === appt.lead_id);
        const leadName = lead ? `${lead.first_name} ${lead.paternal_last_name}` : 'Desconocido';
        const duration = appt.duration || 60;
        
        return {
            id: appt.id,
            title: `${appt.title} - ${leadName}`,
            start: new Date(appt.date),
            end: new Date(new Date(appt.date).getTime() + (duration * 60000)),
            resource: lead,
            status: appt.status
        };
    });
  }, [appointments, leads]);

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#0077FF';
    if (event.status === 'completed') backgroundColor = '#10b981';
    if (event.status === 'canceled') backgroundColor = '#ef4444';

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: '500'
      }
    };
  };

  // 2. MANEJADORES DE NAVEGACIÓN
  const onNavigate = (newDate: Date) => setDate(newDate);
  const onView = (newView: View) => setView(newView);

  return (
    <div className="h-[calc(100vh-240px)] bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 transition-colors duration-300">
      <Calendar
        localizer={localizer}
        events={events}
        
        // 3. VINCULACIÓN DE ESTADOS (ESTO ARREGLA LOS BOTONES)
        date={date}
        view={view}
        onNavigate={onNavigate}
        onView={onView}
        
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        culture='es'
        messages={{
            next: "Sig",
            previous: "Ant",
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
            agenda: "Agenda",
            date: "Fecha",
            time: "Hora",
            event: "Evento",
            noEventsInRange: "Sin citas en este rango."
        }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(event) => {
            if (event.resource) onEventClick(event.resource);
        }}
        className="text-gray-700 dark:text-gray-200 font-sans"
      />
      
      <style>{`
        /* Toolbar Styles & Fixes */
        .rbc-toolbar { margin-bottom: 20px; }
        .rbc-toolbar button { 
            color: inherit; 
            border-color: #e2e8f0; 
            border-radius: 0.5rem; 
            padding: 6px 12px;
            cursor: pointer;
            z-index: 10; /* Asegura que sean clickeables */
            position: relative;
        }
        .rbc-toolbar button:hover { background-color: #f1f5f9; color: #0f172a; }
        .rbc-toolbar button:active { box-shadow: inset 0 3px 5px rgba(0,0,0,0.125); }
        
        /* Dark Mode Toolbar */
        .dark .rbc-toolbar button { border-color: #475569; }
        .dark .rbc-toolbar button:hover { background-color: #334155; color: white; }
        .dark .rbc-toolbar button.rbc-active { background-color: #0077FF; color: white; border-color: #0077FF; }
        
        /* General Dark Mode Fixes */
        .dark .rbc-header { border-bottom-color: #475569; }
        .dark .rbc-month-view, .dark .rbc-time-view, .dark .rbc-agenda-view { border-color: #475569; }
        .dark .rbc-day-bg + .rbc-day-bg { border-left-color: #475569; }
        .dark .rbc-month-row + .rbc-month-row { border-top-color: #475569; }
        .dark .rbc-off-range-bg { background: rgba(0,0,0,0.2); }
        .dark .rbc-today { background-color: rgba(0, 119, 255, 0.15); }
        
        /* Text Visibility */
        .dark .rbc-toolbar-label { color: white; font-weight: 700; font-size: 1.1rem; }
        .dark .rbc-header span { color: #cbd5e1; }
        .dark .rbc-event-content { color: white; }
      `}</style>
    </div>
  );
};

export default CalendarView;