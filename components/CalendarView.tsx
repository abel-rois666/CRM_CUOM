// components/CalendarView.tsx
import React, { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views, View, Navigate } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
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
  events: any[];
  onEventClick: (lead: any) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  view: View;
  onViewChange: (view: View) => void;
  loading?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onEventClick,
  currentDate,
  onDateChange,
  view,
  onViewChange,
  loading
}) => {
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

  /* Helper Maps */
  const statusLabels: Record<string, string> = {
    scheduled: 'Agendada',
    completed: 'Completada',
    canceled: 'Cancelada',
    no_show: 'No Asistió',
    pending: 'Pendiente'
  };

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    canceled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    no_show: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
  };

  /* Custom Agenda View */
  const CustomAgenda = ({ events }: any) => {
    return (
      <div className="overflow-y-auto h-full p-2">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300 sticky top-0">
            <tr>
              <th scope="col" className="px-6 py-3">Fecha</th>
              <th scope="col" className="px-6 py-3">Hora</th>
              <th scope="col" className="px-6 py-3">Evento</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                <td colSpan={3} className="px-6 py-4 text-center">
                  No hay citas en este rango.
                </td>
              </tr>
            ) : (
              events.map((event: any) => {
                const statusLabel = statusLabels[event.status] || event.status;
                const statusColorClass = statusColors[event.status] || 'bg-gray-100 text-gray-800';

                return (
                  <tr key={event.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {format(event.start, 'EEE dd MMM', { locale: es })}
                    </td>
                    <td className="px-6 py-4">
                      {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="font-medium">{event.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${statusColorClass}`}>{statusLabel}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  CustomAgenda.range = (date: Date) => {
    return [startOfMonth(date), endOfMonth(date)];
  };

  CustomAgenda.navigate = (date: Date, action: any) => {
    switch (action) {
      case Navigate.PREVIOUS: return addMonths(date, -1);
      case Navigate.NEXT: return addMonths(date, 1);
      default: return date;
    }
  };

  CustomAgenda.title = (date: Date) => {
    return format(date, 'MMMM yyyy', { locale: es });
  };

  /* Custom Components */
  const CustomAgendaEvent = ({ event }: any) => {
    const statusLabel = statusLabels[event.status] || event.status;
    const statusColorClass = statusColors[event.status] || 'bg-gray-100 text-gray-800';

    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
        <span className="font-medium">{event.title}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${statusColorClass} whitespace-nowrap`}>
          {statusLabel}
        </span>
      </div>
    );
  };

  /* Custom Formats */
  const formats = {
    // agendaTimeRangeFormat: ({ start, end }: any, culture: any, local: any) => {
    //   // Force date visibility in time column: "04 Dic 10:00 - 11:00"
    //   return `${local.format(start, 'dd MMM', culture)} ${local.format(start, 'HH:mm', culture)} - ${local.format(end, 'HH:mm', culture)}`;
    // }
  };

  const onNavigate = (newDate: Date) => onDateChange(newDate);

  const visibleEvents = useMemo(() => {
    if (view === 'agenda') return events;
    return events.filter(e => e.status !== 'canceled');
  }, [events, view]);

  return (
    <div className="h-[calc(100vh-240px)] bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 transition-colors duration-300">
      <Calendar
        localizer={localizer}
        events={visibleEvents}

        // 3. VINCULACIÓN DE ESTADOS (ESTO ARREGLA LOS BOTONES)
        date={currentDate}
        view={view}
        onNavigate={onNavigate}
        onView={onViewChange}

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
          time: "Hora", // Updated label to reflect that we are showing date here too
          event: "Evento",
          noEventsInRange: "Sin citas en este rango."
        }}
        eventPropGetter={eventStyleGetter}
        components={{
          agenda: {
            event: CustomAgendaEvent
          }
        }}
        formats={formats}
        onSelectEvent={(event) => {
          if (event.resource) onEventClick(event.resource);
        }}
        className="text-gray-700 dark:text-gray-200 font-sans"

        // CUSTOM VIEWS
        views={{
          month: true,
          week: true,
          day: true,
          agenda: CustomAgenda as any // Casting for RBC type compatibility
        }}
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