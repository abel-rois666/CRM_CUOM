import React, { useState, useRef } from 'react';
import { Lead, Status, Advisor, Source } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import PrinterIcon from './icons/PrinterIcon';

// This declaration allows using the libraries loaded from CDN without TypeScript errors.
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

// FIX: Define ReportModalProps interface
interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  statuses: Status[];
  advisors: Advisor[];
  sources: Source[];
}

interface StatusBreakdown {
    name: string;
    color: string;
    count: number;
}

interface BreakdownItem {
    name: string;
    count: number;
}

interface ReportSectionData {
    total: number;
    breakdown: StatusBreakdown[];
}

interface BreakdownData {
    total: number;
    breakdown: BreakdownItem[];
}


interface ReportData {
  startDate: string;
  endDate: string;
  newLeads: ReportSectionData;
  updatedLeads: ReportSectionData;
  leadsByAdvisor: BreakdownData;
  leadsBySource: BreakdownData;
}

const tailwindColorMap: { [key: string]: string } = {
    'bg-slate-500': '#64748b', 'bg-gray-500': '#6b7280', 'bg-zinc-500': '#71717a',
    'bg-neutral-500': '#737373', 'bg-stone-500': '#78716c', 'bg-red-500': '#ef4444',
    'bg-orange-500': '#f97316', 'bg-amber-500': '#f59e0b', 'bg-yellow-500': '#eab308',
    'bg-lime-500': '#84cc16', 'bg-green-500': '#22c55e', 'bg-emerald-500': '#10b981',
    'bg-teal-500': '#14b8a6', 'bg-cyan-500': '#06b6d4', 'bg-sky-500': '#0ea5e9',
    'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1', 'bg-violet-500': '#8b5cf6',
    'bg-purple-500': '#a855f7', 'bg-fuchsia-500': '#d946ef', 'bg-pink-500': '#ec4899',
    'bg-rose-500': '#f43f5e'
};

const StatusPieChart: React.FC<{ data: StatusBreakdown[] }> = ({ data }) => {
    const filteredData = data.filter(d => d.count > 0);
    if (filteredData.length === 0) return null;

    const total = filteredData.reduce((sum, item) => sum + item.count, 0);

    let cumulativePercentage = 0;
    const gradientStops = filteredData.map(item => {
        const percentage = (item.count / total) * 100;
        const start = cumulativePercentage;
        cumulativePercentage += percentage;
        const end = cumulativePercentage;
        const colorValue = tailwindColorMap[item.color] || '#cccccc';
        return `${colorValue} ${start}% ${end}%`;
    }).join(', ');

    const gradientStyle = {
        background: `conic-gradient(${gradientStops})`,
    };

    return (
        <div className="mt-6 flex flex-col md:flex-row items-center gap-x-8 gap-y-6">
            <div 
                className="w-40 h-40 md:w-48 md:h-48 rounded-full flex-shrink-0 border-4 border-white shadow-md"
                style={gradientStyle}
                role="img"
                aria-label="Gráfica de pastel de estados de leads"
            ></div>
            <ul className="space-y-2.5 flex-1 w-full">
                {filteredData.map(item => (
                    <li key={item.name} className="flex items-baseline justify-between text-sm">
                         <div className="flex items-center gap-3">
                            <span className={`w-3.5 h-3.5 rounded-full ${item.color} flex-shrink-0`}></span>
                            <span className="font-medium text-gray-800">{item.name}</span>
                        </div>
                        <span className="font-bold text-gray-900">{item.count} <span className="text-xs font-normal text-gray-600">({((item.count / total) * 100).toFixed(1)}%)</span></span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const BreakdownBarChart: React.FC<{ data: BreakdownItem[] }> = ({ data }) => {
    const filteredData = data.filter(d => d.count > 0).sort((a,b) => b.count - a.count);
    if (filteredData.length === 0) return null;

    const maxCount = Math.max(...filteredData.map(d => d.count), 0);

    return (
        <div className="mt-6 space-y-4">
            {filteredData.map(item => (
                <div key={item.name} className="grid grid-cols-3 items-center gap-4 text-sm">
                    <span className="font-medium text-gray-800 truncate text-right col-span-1">{item.name}</span>
                    <div className="col-span-2 bg-gray-200 rounded-full h-6">
                        <div
                            className="bg-brand-secondary h-6 rounded-full flex items-center justify-start px-2 text-white font-bold text-xs"
                            style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`, minWidth: '24px' }}
                            title={`${item.count} leads`}
                        >
                            {item.count}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


const ReportSection: React.FC<{ title: string; data: ReportSectionData }> = ({ title, data }) => (
  <div className="border border-gray-200 p-4 rounded-lg bg-gray-50 shadow-sm">
    <h4 className="text-xl font-bold text-brand-primary mb-3 border-b border-gray-200 pb-2">{title}</h4>
    <p className="text-gray-900 text-lg flex justify-between items-center">
      <span>Total de leads:</span>
      <span className="font-extrabold text-4xl text-brand-secondary">{data.total}</span>
    </p>
    {data.breakdown.filter(s => s.count > 0).length > 0 ? (
      <StatusPieChart data={data.breakdown} />
    ) : (
      <p className="text-base text-gray-700 py-4 text-center">No hay leads que cumplan estos criterios en el periodo seleccionado.</p>
    )}
  </div>
);

const BreakdownReportSection: React.FC<{ title: string; data: BreakdownData; totalLabel: string }> = ({ title, data, totalLabel }) => (
  <div className="border border-gray-200 p-4 rounded-lg bg-gray-50 shadow-sm">
    <h4 className="text-xl font-bold text-brand-primary mb-3 border-b border-gray-200 pb-2">{title}</h4>
     <p className="text-gray-900 text-lg flex justify-between items-center">
      <span>{totalLabel}:</span>
      <span className="font-extrabold text-4xl text-brand-secondary">{data.total}</span>
    </p>
    {data.breakdown.filter(s => s.count > 0).length > 0 ? (
      <BreakdownBarChart data={data.breakdown} />
    ) : (
      <p className="text-base text-gray-700 py-4 text-center">No se encontraron datos en el periodo seleccionado.</p>
    )}
  </div>
);


const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, leads, statuses, advisors, sources }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportContentRef = useRef<HTMLDivDivElement>(null);

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

    const getStatusBreakdown = (leadsForBreakdown: Lead[]): StatusBreakdown[] => {
        const statusMap = new Map<string, StatusBreakdown>(
            statuses.map(s => [s.id, { name: s.name, color: s.color, count: 0 }])
        );
        leadsForBreakdown.forEach(lead => {
            const statusData = statusMap.get(lead.statusId);
            if (statusData) {
                statusData.count++;
            }
        });
        return Array.from(statusMap.values());
    };

    // 1. New Leads Registered
    const newLeads = leads.filter(lead => {
      const regDate = new Date(lead.registrationDate);
      return regDate >= start && regDate <= end;
    });
    const newLeadsReport: ReportSectionData = {
        total: newLeads.length,
        breakdown: getStatusBreakdown(newLeads),
    };

    // 2. Leads with Status Change
    const updatedLeadIds = new Set<string>();
    leads.forEach(lead => {
        (lead.statusHistory || []).forEach(change => {
            const changeDate = new Date(change.date);
            if (changeDate >= start && changeDate <= end) {
                updatedLeadIds.add(lead.id);
            }
        });
    });
    const updatedLeads = leads.filter(lead => updatedLeadIds.has(lead.id));
    const updatedLeadsReport: ReportSectionData = {
        total: updatedLeads.length,
        breakdown: getStatusBreakdown(updatedLeads),
    };

    // 3. Leads by Advisor
    const advisorMap = new Map(advisors.map(a => [a.id, a.name]));
    const leadsByAdvisorMap = new Map<string, number>();
    newLeads.forEach(lead => {
        const count = leadsByAdvisorMap.get(lead.advisorId) || 0;
        leadsByAdvisorMap.set(lead.advisorId, count + 1);
    });
    const leadsByAdvisorBreakdown: BreakdownItem[] = Array.from(leadsByAdvisorMap.entries()).map(([advisorId, count]) => ({
// FIX: Explicitly convert to string to resolve 'unknown' type error.
        name: String(advisorMap.get(advisorId) || 'Sin Asignar'),
        count,
    }));
    const leadsByAdvisorReport: BreakdownData = {
        total: newLeads.length,
        breakdown: leadsByAdvisorBreakdown,
    };
    
    // 4. Leads by source in period
    const sourceMap = new Map(sources.map(s => [s.id, s.name]));
    const leadsBySourceMap = new Map<string, number>();

    newLeads.forEach(lead => {
        const count = leadsBySourceMap.get(lead.sourceId) || 0;
        leadsBySourceMap.set(lead.sourceId, count + 1);
    });

    const leadsBySourceBreakdown: BreakdownItem[] = Array.from(leadsBySourceMap.entries()).map(([sourceId, count]) => ({
        // FIX: Explicitly convert to string to resolve 'unknown' type error.
        name: String(sourceMap.get(sourceId) || 'Desconocido'),
        count,
    }));
    
    const leadsBySourceReport: BreakdownData = {
        total: newLeads.length,
        breakdown: leadsBySourceBreakdown
    };

    setReport({
      startDate,
      endDate,
      newLeads: newLeadsReport,
      updatedLeads: updatedLeadsReport,
      leadsByAdvisor: leadsByAdvisorReport,
      leadsBySource: leadsBySourceReport,
    });
  };

  const handleExportPDF = async () => {
    const reportElement = reportContentRef.current;
    if (!reportElement || !report) return;

    setIsExporting(true);
    try {
        const { jsPDF } = window.jspdf;
        const canvas = await window.html2canvas(reportElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        const ratio = canvasWidth / canvasHeight;
        
        let imgWidth = pdfWidth - 20;
        let imgHeight = imgWidth / ratio;
        
        if (imgHeight > pdfHeight - 20) {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * ratio;
        }
        
        const x = (pdfWidth - imgWidth) / 2;
        const y = 10;
        
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`reporte_leads_${report.startDate}_a_${report.endDate}.pdf`);
    } catch (error) {
        console.error("Error al exportar a PDF:", error);
        alert("Ocurrió un error al intentar exportar el reporte a PDF.");
    } finally {
        setIsExporting(false);
    }
  };
  
  const handleClose = () => {
    setReport(null);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generador de Reportes" size="4xl">
      <div className="space-y-6">
        <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">Seleccionar Periodo</h3>
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
          <>
            <div className="animate-fade-in" ref={reportContentRef}>
                <div className="p-4 sm:p-6 bg-white">
                    <h2 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-2">Reporte de Leads</h2>
                     <h3 className="text-lg text-center text-gray-700 font-medium mb-8">
                        Periodo del {new Date(report.startDate).toLocaleDateString()} al {new Date(report.endDate).toLocaleDateString()}
                    </h3>
                    
                     <div className="space-y-8 mt-8">
                        <ReportSection title="Nuevos Leads Registrados" data={report.newLeads} />
                        <ReportSection title="Leads con Cambio de Estatus en el Periodo" data={report.updatedLeads} />
                        <BreakdownReportSection title="Leads Asignados por Asesor en el Periodo" data={report.leadsByAdvisor} totalLabel="Total de leads nuevos" />
                        <BreakdownReportSection title="Leads por Origen en el Periodo" data={report.leadsBySource} totalLabel="Total de leads nuevos" />
                    </div>
                </div>
            </div>
            <div className="pt-4 flex justify-end">
                <Button 
                    onClick={handleExportPDF} 
                    variant="secondary" 
                    leftIcon={<PrinterIcon className="w-5 h-5"/>}
                    disabled={isExporting}
                >
                    {isExporting ? 'Exportando...' : 'Exportar a PDF'}
                </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ReportModal;