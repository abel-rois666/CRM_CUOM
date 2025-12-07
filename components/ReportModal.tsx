// components/ReportModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Lead, Status, Profile, Source } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { Input } from './common/FormElements'; 
import PrinterIcon from './icons/PrinterIcon';
import ChartBarIcon from './icons/ChartBarIcon';
// Imports de Recharts
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, TooltipProps 
} from 'recharts';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  statuses: Status[];
  advisors: Profile[];
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

interface ConversionBreakdownItem {
    name: string;
    convertedCount: number;
    totalLeads: number;
    rate: number; 
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
  conversionByAdvisor: ConversionBreakdownItem[];
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

// --- Tooltips Personalizados ---

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
            <div className="bg-white dark:bg-slate-800 p-2 border border-gray-200 dark:border-slate-700 shadow-lg rounded-lg text-xs z-50">
            <p className="font-bold text-gray-800 dark:text-white">{data.name}</p>
            <p className="text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-brand-secondary">{data.value || data.count || data.rate?.toFixed(1)}</span>
            {data.rate !== undefined ? '%' : ''}
          </p>
          {data.convertedCount !== undefined && (
             <p className="text-[10px] text-gray-400">{data.convertedCount} de {data.totalLeads}</p>
          )}
        </div>
      );
    }
    return null;
};

// --- Gráficas ---

const StatusPieChart: React.FC<{ data: StatusBreakdown[], isExporting?: boolean }> = ({ data, isExporting }) => {
    const filteredData = data.filter(d => d.count > 0);
    if (filteredData.length === 0) return null;

    const total = filteredData.reduce((sum, item) => sum + item.count, 0);
    
    // Preparamos datos para Recharts
    const chartData = filteredData.map(item => ({
        name: item.name,
        value: item.count,
        color: isExporting ? '#4b5563' : (tailwindColorMap[item.color] || '#cccccc') // Gris oscuro al exportar para contraste
    }));

    return (
        <div className="mt-4 flex flex-col md:flex-row items-center gap-6">
            <div className="w-40 h-40 flex-shrink-0 relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={isExporting ? 0 : 2}
                            dataKey="value"
                            isAnimationActive={!isExporting} // Desactivar animación al exportar
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.color} 
                                    // Al exportar, usamos opacidades o patrones si fuera necesario, 
                                    // aquí usamos colores sólidos definidos arriba
                                />
                            ))}
                        </Pie>
                        {!isExporting && <RechartsTooltip content={<CustomTooltip />} />}
                    </PieChart>
                </ResponsiveContainer>
                {/* Texto central con el total */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className={`text-xl font-bold ${isExporting ? 'text-black' : 'text-gray-700'}`}>{total}</span>
                </div>
            </div>

            <ul className="space-y-2 flex-1 w-full">
                {filteredData.map(item => (
                    <li key={item.name} className="flex items-center justify-between text-sm group">
                         <div className="flex items-center gap-2">
                            <span 
                                className={`w-3 h-3 rounded-full ${isExporting ? 'bg-gray-600' : ''}`} 
                                style={{ backgroundColor: !isExporting ? tailwindColorMap[item.color] : undefined }}
                            ></span>
                            <span className={`font-medium ${isExporting ? 'text-black' : 'text-gray-700'} truncate max-w-[150px]`}>{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`font-bold ${isExporting ? 'text-black' : 'text-gray-900'}`}>{item.count}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${isExporting ? 'text-black border border-gray-400' : 'text-gray-500 bg-gray-100'}`}>
                                {((item.count / total) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const BreakdownBarChart: React.FC<{ data: BreakdownItem[], isExporting?: boolean }> = ({ data, isExporting }) => {
    const filteredData = data.filter(d => d.count > 0).sort((a,b) => b.count - a.count);
    if (filteredData.length === 0) return null;

    return (
        <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={filteredData} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{ fontSize: 11, fill: isExporting ? '#000' : '#64748b' }} 
                        interval={0}
                    />
                    {!isExporting && <RechartsTooltip content={<CustomTooltip />} />}
                    <Bar 
                        dataKey="count" 
                        fill={isExporting ? '#1f2937' : '#3b82f6'} // Azul normal o Gris oscuro export
                        radius={[0, 4, 4, 0]} 
                        barSize={20}
                        isAnimationActive={!isExporting}
                        label={{ position: 'right', fill: isExporting ? '#000' : '#64748b', fontSize: 11 }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const ConversionRateBarChart: React.FC<{ data: ConversionBreakdownItem[], isExporting?: boolean }> = ({ data, isExporting }) => {
    const sortedData = [...data].sort((a, b) => b.rate - a.rate);
    if (sortedData.length === 0) return null;

    return (
        <div className="mt-4 h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={sortedData} 
                    layout="vertical" 
                    margin={{ top: 5, right: 40, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{ fontSize: 11, fill: isExporting ? '#000' : '#64748b' }} 
                        interval={0}
                    />
                    {!isExporting && <RechartsTooltip content={<CustomTooltip />} />}
                    <Bar 
                        dataKey="rate" 
                        fill={isExporting ? '#1f2937' : '#10b981'} // Verde o Gris oscuro
                        radius={[0, 4, 4, 0]} 
                        barSize={20}
                        isAnimationActive={!isExporting}
                        label={{ 
                            position: 'right', 
                            formatter: (val: number) => `${val.toFixed(1)}%`,
                            fill: isExporting ? '#000' : '#059669', 
                            fontSize: 11 
                        }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const ReportSection: React.FC<{ title: string; data: ReportSectionData; icon?: React.ReactNode; isExporting?: boolean }> = ({ title, data, icon, isExporting }) => (
  <div className={`p-6 rounded-2xl border break-inside-avoid ${isExporting ? 'bg-white border-black border-2 mb-6' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all'}`}>
    <div className={`flex justify-between items-start mb-4 border-b ${isExporting ? 'border-black' : 'border-gray-100'} pb-4`}>
        <div>
            <h4 className={`text-lg font-black ${isExporting ? 'text-black' : 'text-gray-800 dark:text-white'}`}>{title}</h4>
            <p className={`text-xs mt-1 uppercase tracking-wider font-bold ${isExporting ? 'text-black' : 'text-gray-500'}`}>Resumen del Periodo</p>
        </div>
        {icon && !isExporting && <div className="text-brand-secondary bg-brand-secondary/5 p-2 rounded-lg">{icon}</div>}
    </div>
    
    <div className="flex items-baseline gap-2 mb-2">
      <span className={`text-4xl font-black ${isExporting ? 'text-black' : 'text-brand-primary'}`}>{data.total}</span>
      <span className={`text-sm font-bold ${isExporting ? 'text-black' : 'text-gray-600'}`}>leads totales</span>
    </div>

    {data.breakdown.filter(s => s.count > 0).length > 0 ? (
      <StatusPieChart data={data.breakdown} isExporting={isExporting} />
    ) : (
      <p className="text-sm text-gray-500 py-8 text-center italic bg-gray-50 rounded-xl mt-4 font-medium">Sin datos para mostrar.</p>
    )}
  </div>
);

const BreakdownReportSection: React.FC<{ title: string; data: BreakdownData; totalLabel: string; isExporting?: boolean }> = ({ title, data, totalLabel, isExporting }) => (
  <div className={`p-6 rounded-2xl border break-inside-avoid ${isExporting ? 'bg-white border-black border-2 mb-6' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all'}`}>
    <div className={`mb-4 border-b ${isExporting ? 'border-black' : 'border-gray-100'} pb-4`}>
        <h4 className={`text-lg font-black ${isExporting ? 'text-black' : 'text-gray-800 dark:text-white'}`}>{title}</h4>
    </div>
    
    <div className="flex items-baseline gap-2">
      <span className={`text-4xl font-black ${isExporting ? 'text-black' : 'text-brand-primary'}`}>{data.total}</span>
      <span className={`text-sm font-bold ${isExporting ? 'text-black' : 'text-gray-600'}`}>{totalLabel}</span>
    </div>

    {data.breakdown.filter(s => s.count > 0).length > 0 ? (
      <BreakdownBarChart data={data.breakdown} isExporting={isExporting} />
    ) : (
      <p className="text-sm text-gray-500 py-8 text-center italic bg-gray-50 rounded-xl mt-4 font-medium">Sin datos para mostrar.</p>
    )}
  </div>
);

const ConversionReportSection: React.FC<{ title: string; data: ConversionBreakdownItem[]; isExporting?: boolean }> = ({ title, data, isExporting }) => {
    const totalConversions = data.reduce((sum, item) => sum + item.convertedCount, 0);
    const totalLeadsForConversion = data.reduce((sum, item) => sum + item.totalLeads, 0);
    const overallRate = totalLeadsForConversion > 0 ? (totalConversions / totalLeadsForConversion) * 100 : 0;

    return (
        <div className={`p-6 rounded-2xl border break-inside-avoid ${isExporting ? 'bg-white border-black border-2 mb-6' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all'}`}>
            <div className={`mb-4 border-b ${isExporting ? 'border-black' : 'border-gray-100'} pb-4`}>
                <h4 className={`text-lg font-black ${isExporting ? 'text-black' : 'text-gray-800 dark:text-white'}`}>{title}</h4>
            </div>
            
            <div className={`flex justify-between items-end p-4 rounded-xl border mb-6 ${isExporting ? 'bg-white border-black' : 'bg-green-50 border-green-200'}`}>
                <div>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${isExporting ? 'text-black' : 'text-green-800'}`}>Tasa Global</p>
                    <span className={`text-4xl font-black ${isExporting ? 'text-black' : 'text-green-600'}`}>{overallRate.toFixed(1)}%</span>
                </div>
                <div className="text-right">
                    <p className={`text-sm font-bold ${isExporting ? 'text-black' : 'text-green-900'}`}>{totalConversions} inscritos</p>
                    <p className={`text-xs font-medium ${isExporting ? 'text-black' : 'text-green-700'}`}>de {totalLeadsForConversion} leads</p>
                </div>
            </div>

            {data.length > 0 ? (
                <ConversionRateBarChart data={data} isExporting={isExporting} />
            ) : (
                <p className="text-sm text-gray-500 py-8 text-center italic bg-gray-50 rounded-xl font-medium">Sin datos de conversión.</p>
            )}
        </div>
    );
};

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, leads, statuses, advisors, sources }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState<ReportData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // --- BLOQUEO TOTAL DE INTERACCIÓN (SCROLL Y CLICS) ---
  useEffect(() => {
    if (isExporting) {
      document.body.style.overflow = 'hidden'; // Bloquea scroll
      document.body.style.pointerEvents = 'none'; // Bloquea clics en toda la app
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.pointerEvents = 'unset';
    }
    // Cleanup al desmontar
    return () => { 
        document.body.style.overflow = 'unset'; 
        document.body.style.pointerEvents = 'unset';
    };
  }, [isExporting]);

  const handleGenerateReport = () => {
    if (!startDate || !endDate) { alert("Por favor, selecciona un periodo."); return; }
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T23:59:59Z');
    if (start > end) { alert("La fecha de inicio no puede ser posterior a la fecha de fin."); return; }

    const getStatusBreakdown = (leadsForBreakdown: Lead[]): StatusBreakdown[] => {
        const statusMap = new Map<string, StatusBreakdown>(statuses.map(s => [s.id, { name: s.name, color: s.color, count: 0 }]));
        leadsForBreakdown.forEach(lead => {
            const statusData = statusMap.get(lead.status_id);
            if (statusData) statusData.count++;
        });
        return Array.from(statusMap.values());
    };

    const newLeads = leads.filter(lead => {
      const regDate = new Date(lead.registration_date);
      return regDate >= start && regDate <= end;
    });
    const newLeadsReport: ReportSectionData = { total: newLeads.length, breakdown: getStatusBreakdown(newLeads) };

    const updatedLeadIds = new Set<string>();
    leads.forEach(lead => {
        (lead.status_history || []).forEach(change => {
            const changeDate = new Date(change.date);
            if (changeDate >= start && changeDate <= end) updatedLeadIds.add(lead.id);
        });
    });
    const updatedLeads = leads.filter(lead => updatedLeadIds.has(lead.id));
    const updatedLeadsReport: ReportSectionData = { total: updatedLeads.length, breakdown: getStatusBreakdown(updatedLeads) };

    const advisorMap = new Map(advisors.map(a => [a.id, a.full_name]));
    const leadsByAdvisorMap = new Map<string, number>();
    newLeads.forEach(lead => {
        const count = leadsByAdvisorMap.get(lead.advisor_id) || 0;
        leadsByAdvisorMap.set(lead.advisor_id, count + 1);
    });
    const leadsByAdvisorReport: BreakdownData = {
        total: newLeads.length,
        breakdown: Array.from(leadsByAdvisorMap.entries()).map(([id, count]) => ({ name: String(advisorMap.get(id) || 'Sin Asignar'), count }))
    };
    
    const sourceMap = new Map(sources.map(s => [s.id, s.name]));
    const leadsBySourceMap = new Map<string, number>();
    newLeads.forEach(lead => {
        const count = leadsBySourceMap.get(lead.source_id) || 0;
        leadsBySourceMap.set(lead.source_id, count + 1);
    });
    const leadsBySourceReport: BreakdownData = {
        total: newLeads.length,
        breakdown: Array.from(leadsBySourceMap.entries()).map(([id, count]) => ({ name: String(sourceMap.get(id) || 'Desconocido'), count }))
    };

    const inscritoStatusId = statuses.find(s => s.name === 'Inscrito (a)')?.id;
    const conversionsByAdvisor = new Map<string, number>();
    if (inscritoStatusId) {
        newLeads.forEach(lead => {
            if ((lead.status_history || []).some(c => c.new_status_id === inscritoStatusId)) {
                conversionsByAdvisor.set(lead.advisor_id, (conversionsByAdvisor.get(lead.advisor_id) || 0) + 1);
            }
        });
    }
    const conversionBreakdown: ConversionBreakdownItem[] = advisors.map(advisor => {
        const convertedCount = conversionsByAdvisor.get(advisor.id) || 0;
        const totalLeads = leadsByAdvisorMap.get(advisor.id) || 0;
        return { name: advisor.full_name, convertedCount, totalLeads, rate: totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0 };
    }).filter(item => item.totalLeads > 0 || item.convertedCount > 0);

    setReport({ startDate, endDate, newLeads: newLeadsReport, updatedLeads: updatedLeadsReport, leadsByAdvisor: leadsByAdvisorReport, leadsBySource: leadsBySourceReport, conversionByAdvisor: conversionBreakdown });
  };

  const handleExportPDF = async () => {
    if (!report || !reportContentRef.current) return;
    setIsExporting(true);

    // Pequeño timeout para asegurar que React actualice el estado isExporting
    // y que Recharts renderice la versión sin animaciones antes de capturar
    setTimeout(async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const html2canvas = (await import('html2canvas')).default;
            const content = reportContentRef.current;
            if (!content) return;

            const clone = content.cloneNode(true) as HTMLElement;
            
            // 1. Limpieza de clases
            const animated = clone.querySelectorAll('.animate-fade-in, .transition-all');
            animated.forEach(el => {
                el.classList.remove('animate-fade-in', 'transition-all', 'duration-500');
                (el as HTMLElement).style.transition = 'none';
                (el as HTMLElement).style.animation = 'none';
            });

            // 2. Estilos Forzados para PDF (Formato A4 optimizado)
            clone.style.width = '1200px';
            clone.style.padding = '40px';
            clone.style.background = '#ffffff';
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            // Eliminar filtros CSS que pueden afectar la renderización de SVGs en algunos navegadores
            clone.style.filter = 'none'; 
            (clone.style as any).printColorAdjust = 'exact'; 

            // Forzar colores de texto para asegurar negro puro
            clone.querySelectorAll<HTMLElement>('*').forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.color && style.color !== 'rgba(0, 0, 0, 0)') {
                    el.style.color = '#000000';
                }
            });

            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, { 
                scale: 2, // Escala alta para buena calidad
                useCORS: true, 
                backgroundColor: '#ffffff',
                windowWidth: 1400,
                scrollY: 0,
                scrollX: 0 
            });

            document.body.removeChild(clone);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`reporte_crm_${report.startDate}.pdf`);
        } catch (error) {
            console.error("Error PDF:", error);
            alert("Error al exportar.");
        } finally {
            setIsExporting(false);
        }
    }, 1000); // 1 segundo para asegurar renderizado de gráficas estáticas
  };
  
  return (
    <Modal isOpen={isOpen} onClose={() => {setReport(null); onClose();}} title="Inteligencia de Negocio" size="4xl">
      
      {/* --- OVERLAY DE CARGA (BLOQUEO DE PANTALLA) --- */}
      {isExporting && (
        <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center transition-all animate-fade-in cursor-wait select-none">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-brand-secondary rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
            </div>
            <h3 className="mt-6 text-xl font-bold text-gray-800">Generando Reporte PDF...</h3>
            <p className="text-gray-500 mt-2 text-sm">Por favor espera, renderizando gráficas de alta calidad.</p>
        </div>
      )}

      <div className={`space-y-8 ${isExporting ? 'pointer-events-none select-none' : ''}`}>
        <div className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full sm:w-auto flex-1">
                <Input label="Fecha Inicio" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="w-full sm:w-auto flex-1">
                <Input label="Fecha Fin" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <Button onClick={handleGenerateReport} className="shadow-lg shadow-brand-secondary/20 w-full sm:w-auto">
                <ChartBarIcon className="w-5 h-5 mr-2"/>
                Generar Análisis
            </Button>
        </div>

        {report && (
          <>
            {/* Contenedor del reporte - Referenciado para captura */}
            <div className={`animate-fade-in ${isExporting ? 'bg-white' : 'bg-transparent'}`} ref={reportContentRef}>
                <div className="text-center mb-8 pt-4">
                    <h2 className={`text-3xl font-black tracking-tight ${isExporting ? 'text-black' : 'text-gray-900 dark:text-white'}`}>Reporte Ejecutivo</h2>
                    <p className={`font-medium mt-1 text-lg ${isExporting ? 'text-black' : 'text-gray-600'}`}>
                        {new Date(report.startDate).toLocaleDateString()} — {new Date(report.endDate).toLocaleDateString()}
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2">
                        <ReportSection title="Nuevos Leads (Captación)" data={report.newLeads} icon={<ChartBarIcon className="w-6 h-6"/>} isExporting={isExporting} />
                    </div>
                    
                    <ReportSection title="Movimiento de Cartera (Actividad)" data={report.updatedLeads} isExporting={isExporting} />
                    <ConversionReportSection title="Efectividad de Cierre (Inscritos)" data={report.conversionByAdvisor} isExporting={isExporting} />
                    
                    <BreakdownReportSection title="Carga por Asesor" data={report.leadsByAdvisor} totalLabel="Leads Asignados" isExporting={isExporting} />
                    <BreakdownReportSection title="Rendimiento por Canal" data={report.leadsBySource} totalLabel="Leads Generados" isExporting={isExporting} />
                </div>
                
                <div className={`mt-8 pt-4 border-t border-gray-200 text-center ${isExporting ? 'text-black' : 'text-gray-400'}`}>
                    <p className="text-xs">Generado por CUOM CRM • {new Date().toLocaleString()}</p>
                </div>
            </div>
            
            <div className="pt-6 border-t border-gray-100 flex justify-end">
                <Button 
                    onClick={handleExportPDF} 
                    variant="secondary" 
                    leftIcon={<PrinterIcon className="w-5 h-5"/>}
                    disabled={isExporting}
                >
                    {isExporting ? 'Generando PDF...' : 'Descargar PDF'}
                </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ReportModal;