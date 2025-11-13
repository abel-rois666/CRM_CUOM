import React, { useState } from 'react';
import { Lead, Status } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  statuses: Status[];
}

interface ReportData {
  startDate: string;
  endDate: string;
  totalNewLeads: number;
  statusBreakdown: { name: string; color: string; count: number }[];
  appointments: {
    leadName: string;
    title: string;
    date: string;
  }[];
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, leads, statuses }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState<ReportData | null>(null);

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      alert("Por favor, selecciona un periodo.");
      return;
    }

    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T23:59:59Z');

    if (start > end) {
      alert("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }

    const registeredLeads = leads.filter(lead => {
      const regDate = new Date(lead.registrationDate);
      return regDate >= start && regDate <= end;
    });

    const statusMap = new Map<string, { name: string; color: string; count: number }>(statuses.map(s => [s.id, { name: s.name, color: s.color, count: 0 }]));
    
    registeredLeads.forEach(lead => {
      const statusData = statusMap.get(lead.statusId);
      if (statusData) {
        statusData.count++;
      }
    });

    const scheduledAppointments = leads
      .flatMap(lead => 
        lead.appointments.map(appt => ({ ...appt, leadName: `${lead.firstName} ${lead.paternalLastName}` }))
      )
      .filter(appt => {
        const apptDate = new Date(appt.date);
        return apptDate >= start && apptDate <= end;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setReport({
      startDate,
      endDate,
      totalNewLeads: registeredLeads.length,
      statusBreakdown: Array.from(statusMap.values()),
      appointments: scheduledAppointments,
    });
  };
  
  const handleClose = () => {
    setReport(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generador de Reportes" size="lg">
      <div className="space-y-6">
        <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-3">Seleccionar Periodo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Fecha de Fin</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <Button onClick={handleGenerateReport}>Generar Reporte</Button>
            </div>
        </div>

        {report && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-center text-gray-800">
              Reporte del {new Date(report.startDate).toLocaleDateString()} al {new Date(report.endDate).toLocaleDateString()}
            </h3>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-semibold text-brand-primary mb-2">Resumen</h4>
              <p className="text-gray-700">Total de nuevos leads registrados: <span className="font-bold text-2xl">{report.totalNewLeads}</span></p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-semibold text-brand-primary mb-3">Desglose de Estados (Nuevos Leads)</h4>
              <ul className="space-y-2">
                {report.statusBreakdown.filter(s => s.count > 0).map(status => (
                  <li key={status.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${status.color}`}></span>
                        <span>{status.name}</span>
                    </div>
                    <span className="font-semibold bg-gray-200 px-2 py-0.5 rounded-full text-gray-700">{status.count}</span>
                  </li>
                ))}
                {report.statusBreakdown.filter(s => s.count > 0).length === 0 && <p className="text-sm text-gray-500">No hay leads nuevos en estos estados para el periodo.</p>}
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-semibold text-brand-primary mb-3">Citas Programadas en el Periodo</h4>
               <div className="max-h-48 overflow-y-auto pr-2">
                  {report.appointments.length > 0 ? (
                    <ul className="space-y-3">
                      {report.appointments.map((appt, index) => (
                        <li key={index} className="text-sm border-b pb-2">
                          <p className="font-semibold text-gray-800">{appt.leadName}</p>
                          <p className="text-gray-600">{appt.title}</p>
                          <p className="text-xs text-gray-500">{new Date(appt.date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No se programaron citas en este periodo.</p>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReportModal;