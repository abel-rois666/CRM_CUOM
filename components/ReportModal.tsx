// components/ReportModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Lead, Status, Profile, Source } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import { Input } from './common/FormElements';
import PrinterIcon from './icons/PrinterIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import SparklesIcon from './icons/SparklesIcon';
import CalendarIcon from './icons/CalendarIcon';
import UserIcon from './icons/UserIcon';
import { supabase } from '../lib/supabase';

// Imports de Recharts
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// --- UTILIDADES DE COLOR (Fix Tailwind v4 para PDF) ---
function oklabToRgb(L: number, a: number, b: number) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;

    let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let b2 = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const comp = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

    r = Math.round(Math.max(0, Math.min(1, comp(r))) * 255);
    g = Math.round(Math.max(0, Math.min(1, comp(g))) * 255);
    b2 = Math.round(Math.max(0, Math.min(1, comp(b2))) * 255);

    return `rgb(${r}, ${g}, ${b2})`;
}

function normalizeColor(c: string) {
    if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return c;

    const oklab = c.match(/oklab\(\s*([\d.]+)%?\s+([-+]?[\d.]+)\s+([-+]?[\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)/i);
    if (oklab) {
        let L = parseFloat(oklab[1]);
        if (L > 1) L = L / 100;
        const a = parseFloat(oklab[2]);
        const b = parseFloat(oklab[3]);
        return oklabToRgb(L, a, b);
    }

    const oklch = c.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+))?\s*\)/i);
    if (oklch) {
        let L = parseFloat(oklch[1]);
        if (L > 1) L = L / 100;
        const C = parseFloat(oklch[2]);
        const h = parseFloat(oklch[3]) * (Math.PI / 180);
        return oklabToRgb(L, C * Math.cos(h), C * Math.sin(h));
    }

    return c;
}

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
    enrolledCount: number;
    periodAppointments: number; // [NEW] Citados del periodo
    conversionRate: number;
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

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-slate-800 p-2 border border-gray-200 dark:border-slate-700 shadow-lg rounded-lg text-xs z-50 opacity-100">
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

// --- Components Gráficos ---

const StatusPieChart: React.FC<{ data: StatusBreakdown[], isExporting?: boolean }> = ({ data, isExporting }) => {
    const filteredData = data.filter(d => d.count > 0);
    if (filteredData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 w-full text-gray-400 dark:text-gray-500 text-sm italic">
                No hay datos para mostrar
            </div>
        );
    }

    const total = filteredData.reduce((sum, item) => sum + item.count, 0);
    const chartData = filteredData.map(item => ({
        name: item.name,
        value: item.count,
        color: isExporting ? '#4b5563' : (tailwindColorMap[item.color] || '#cccccc')
    }));

    return (
        <div className="flex flex-col items-center">
            <div className="w-40 h-40 relative my-4">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className={`text-xl font-bold ${isExporting ? 'text-black' : 'text-gray-700 dark:text-white'}`}>{total}</span>
                </div>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={isExporting ? 0 : 2}
                            dataKey="value"
                            isAnimationActive={!isExporting}
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        {!isExporting && <RechartsTooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none', zIndex: 100 }} />}
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className={`w-full grid ${isExporting ? 'grid-cols-1' : 'grid-cols-2'} gap-2 text-xs leading-tight`} style={isExporting ? { overflow: 'visible' } : undefined}>
                {filteredData.map(item => (
                    <div key={item.name} className="flex items-start gap-2">
                        <span
                            className={`w-2 h-2 rounded-full flex-shrink-0`}
                            style={{ backgroundColor: isExporting ? '#666' : tailwindColorMap[item.color] }}
                        ></span>
                        <span className={`${isExporting ? 'whitespace-normal break-words min-w-full' : 'truncate min-w-0'} flex-1 ${isExporting ? 'text-black' : 'text-gray-600 dark:text-gray-300'}`}>{item.name} ({item.count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SimpleBarChart: React.FC<{ data: any[], dataKey: string, color: string, isExporting?: boolean, formatter?: (val: number) => string }> = ({ data, dataKey, color, isExporting, formatter }) => {
    const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey]).slice(0, 10);
    if (sortedData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 w-full text-gray-400 dark:text-gray-500 text-sm italic">
                No hay datos para mostrar
            </div>
        );
    }

    return (
        <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={90}
                        tick={{ fontSize: 10, fill: isExporting ? '#000' : '#64748b' }}
                        interval={0}
                    />
                    {!isExporting && <RechartsTooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none', opacity: 1 }} />}
                    <Bar
                        dataKey={dataKey}
                        fill={color}
                        radius={[0, 4, 4, 0]}
                        barSize={15}
                        isAnimationActive={!isExporting}
                        label={{
                            position: 'right',
                            formatter: formatter || ((val: number) => val.toString()),
                            fill: isExporting ? '#000' : '#64748b',
                            fontSize: 10
                        }}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const SummaryCard: React.FC<{ title: string; value: string | number; subtitle?: string; icon: React.ReactNode; colorClass: string; isExporting?: boolean }> = ({ title, value, subtitle, icon, colorClass, isExporting }) => (
    <div className={`p-6 pb-10 rounded-xl border flex flex-col justify-between min-h-[160px] ${isExporting ? 'bg-white border-black' : `bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 shadow-sm`}`}>
        <div>
            <div className="flex items-start justify-between mb-4">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isExporting ? 'text-black' : 'text-gray-500 dark:text-gray-400'}`}>{title}</h4>
                <div className={`${isExporting ? 'text-black' : colorClass} p-1.5 rounded-lg bg-opacity-10`}>{icon}</div>
            </div>
            <span className={`text-4xl font-black ${isExporting ? 'text-black' : 'text-gray-900 dark:text-white'}`}>{value}</span>
        </div>
        {subtitle && <div className="mt-4"><span className={`text-sm ${isExporting ? 'text-black' : 'text-gray-500'}`}>{subtitle}</span></div>}
    </div>
);

const ChartSection: React.FC<{ title: string; children: React.ReactNode; isExporting?: boolean }> = ({ title, children, isExporting }) => (
    <div className={`rounded-2xl border break-inside-avoid flex flex-col ${isExporting ? 'bg-white border-black border-2 h-auto min-h-[500px] p-5 pb-32' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm h-full p-5'}`}>
        <h4 className={`text-base font-bold mb-4 ${isExporting ? 'text-black' : 'text-gray-800 dark:text-white'}`}>{title}</h4>
        <div className={`w-full ${isExporting ? '' : 'flex-1 min-h-0 overflow-hidden'}`}>
            {children}
        </div>
    </div>
);

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, leads, statuses, advisors, sources }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [report, setReport] = useState<ReportData | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isExporting) {
            document.body.style.overflow = 'hidden';
            document.body.style.pointerEvents = 'none';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.pointerEvents = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.pointerEvents = 'unset';
        };
    }, [isExporting]);

    const handleGenerateReport = async () => {
        setError(null);
        setReport(null);
        if (!startDate || !endDate) { setError("Por favor, selecciona un periodo."); return; }

        // [FIX] Use date-only comparisons to avoid timezone issues
        const startDateStr = startDate; // e.g. "2025-12-01"
        const endDateStr = endDate;     // e.g. "2025-12-31"

        // Helper function to extract YYYY-MM-DD from any date string or ISO timestamp
        const toDateStr = (dateInput: string | Date): string => {
            if (typeof dateInput === 'string') {
                return dateInput.split('T')[0];
            }
            return dateInput.toISOString().split('T')[0];
        };

        // Validation
        const startForValidation = new Date(startDate);
        const endForValidation = new Date(endDate);

        const minYear = 2000;
        const maxYear = 2100;

        if (isNaN(startForValidation.getTime()) || isNaN(endForValidation.getTime())) {
            setError("Las fechas seleccionadas no son válidas.");
            return;
        }

        if (startForValidation.getFullYear() < minYear || startForValidation.getFullYear() > maxYear ||
            endForValidation.getFullYear() < minYear || endForValidation.getFullYear() > maxYear) {
            setError(`Por favor, ingresa un año válido entre ${minYear} y ${maxYear}.`);
            return;
        }

        if (startDateStr > endDateStr) {
            setError("La fecha de inicio no puede ser mayor que la fecha final.");
            return;
        }

        // [FIX] Fetch ALL leads from database (no filters, no pagination)
        setIsLoading(true);
        let allLeads: Lead[] = [];

        try {
            const { data, error: fetchError } = await supabase
                .from('leads')
                .select(`
                    *,
                    appointments(*, profiles:created_by(full_name)),
                    follow_ups(*, profiles:created_by(full_name)),
                    status_history(*, profiles:created_by(full_name))
                `)
                .order('registration_date', { ascending: false });

            if (fetchError) throw fetchError;
            allLeads = (data || []) as Lead[];
        } catch (err) {
            console.error('Error fetching leads for report:', err);
            setError("Error al cargar los datos del reporte.");
            setIsLoading(false);
            return;
        }

        // Helper to check if a date string is within the period
        const isInPeriod = (dateInput: string): boolean => {
            const dateStr = toDateStr(dateInput);
            return dateStr >= startDateStr && dateStr <= endDateStr;
        };

        const getStatusBreakdown = (leadsForBreakdown: Lead[]): StatusBreakdown[] => {
            const statusMap = new Map<string, StatusBreakdown>(statuses.map(s => [s.id, { name: s.name, color: s.color, count: 0 }]));
            leadsForBreakdown.forEach(lead => {
                const statusData = statusMap.get(lead.status_id);
                if (statusData) statusData.count++;
            });
            return Array.from(statusMap.values());
        };

        // 1. New Leads (ALL leads registered in period, regardless of status)
        const newLeads = allLeads.filter(lead => isInPeriod(lead.registration_date));
        const newLeadsReport: ReportSectionData = { total: newLeads.length, breakdown: getStatusBreakdown(newLeads) };

        // 2. Updated Leads (Activity)
        const updatedLeadIds = new Set<string>();
        allLeads.forEach(lead => {
            (lead.status_history || []).forEach(change => {
                if (isInPeriod(change.date)) updatedLeadIds.add(lead.id);
            });
        });
        const updatedLeads = allLeads.filter(lead => updatedLeadIds.has(lead.id));
        const updatedLeadsReport: ReportSectionData = { total: updatedLeads.length, breakdown: getStatusBreakdown(updatedLeads) };

        // 3. Advisor Breakdown
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

        // 4. Source Breakdown
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

        // 5. Enrollments (Inscritos del Periodo)
        // Criterios para contar como "Inscrito del periodo":
        // A) Lead ACTUALMENTE en status 'won' (Inscrito)
        // B) CUALQUIERA de las siguientes condiciones:
        //    B1) La ÚLTIMA transición a 'won' ocurrió en el periodo
        //    B2) El lead fue REGISTRADO en el periodo (para leads creados directamente como Inscrito)
        // C) NO cuenta si tuvo 'won' pero después cambió a otro status
        let enrolledCount = 0;
        let periodAppointments = 0;
        const conversionsByAdvisor = new Map<string, number>();

        // Find all statuses that are 'won' category
        const wonStatusIds = new Set(statuses.filter(s => s.category === 'won').map(s => s.id));

        allLeads.forEach(lead => {
            // A. Check if lead is CURRENTLY in a 'won' status
            const currentStatus = statuses.find(s => s.id === lead.status_id);
            if (currentStatus?.category !== 'won') return; // Skip if not currently won

            // B. Determine the relevant date for this enrollment
            const history = lead.status_history || [];
            const wonTransitions = history
                .filter(change => wonStatusIds.has(change.new_status_id))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first

            const lastWonTransition = wonTransitions[0];

            // The enrollment date is EITHER the last won transition date OR the registration date
            const enrollmentDateStr = lastWonTransition
                ? lastWonTransition.date
                : lead.registration_date;

            // Check if enrollment happened within the period
            if (isInPeriod(enrollmentDateStr)) {
                enrolledCount++;
                const advisorId = lead.advisor_id || 'unassigned';
                conversionsByAdvisor.set(advisorId, (conversionsByAdvisor.get(advisorId) || 0) + 1);
            }
        });

        // 6. Advisors Performance
        // "Conversion Rate" here will be (Sales in Period / Assigned New Leads in Period)
        // This can be > 100% if they close backlog, but it is the standard "Sales/Traffic" metric.
        const conversionBreakdown: ConversionBreakdownItem[] = advisors.map(advisor => {
            const convertedCount = conversionsByAdvisor.get(advisor.id) || 0;
            const totalLeads = leadsByAdvisorMap.get(advisor.id) || 0; // Denominator = Assigned New Leads
            return { name: advisor.full_name, convertedCount, totalLeads, rate: totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0 };
        }).filter(item => item.totalLeads > 0 || item.convertedCount > 0);

        // Appointments logic (exclude canceled)
        allLeads.forEach(lead => {
            (lead.appointments || []).forEach(appt => {
                if (appt.status !== 'canceled' && isInPeriod(appt.date)) {
                    periodAppointments++;
                }
            });
        });

        const conversionRate = newLeads.length > 0 ? (enrolledCount / newLeads.length) * 100 : 0;

        setReport({
            startDate, endDate,
            enrolledCount,
            periodAppointments, // [NEW]
            conversionRate,
            newLeads: newLeadsReport,
            updatedLeads: updatedLeadsReport,
            leadsByAdvisor: leadsByAdvisorReport,
            leadsBySource: leadsBySourceReport,
            conversionByAdvisor: conversionBreakdown
        });
        setIsLoading(false);
    };

    const handleExportPDF = async () => {
        if (!report || !reportContentRef.current) return;
        setIsExporting(true);

        setTimeout(async () => {
            try {
                const { jsPDF } = await import('jspdf');
                const html2canvas = (await import('html2canvas')).default;
                const content = reportContentRef.current;
                if (!content) return;

                const clone = content.cloneNode(true) as HTMLElement;

                clone.style.width = '1200px';
                clone.style.padding = '40px';
                clone.style.backgroundColor = '#ffffff';
                clone.style.position = 'absolute';
                clone.style.left = '-9999px';
                clone.style.top = '0';
                // @ts-ignore
                clone.style.printColorAdjust = 'exact';

                const originalCharts = content.querySelectorAll('.recharts-responsive-container');
                const cloneCharts = clone.querySelectorAll('.recharts-responsive-container');

                cloneCharts.forEach((cloneChart, index) => {
                    const original = originalCharts[index];
                    if (original) {
                        (cloneChart as HTMLElement).style.width = '100%';
                        (cloneChart as HTMLElement).style.height = '250px';
                    }
                });

                document.body.appendChild(clone); // [FIX] Mount first to compute styles correctly

                const allElements = clone.querySelectorAll('*');
                Array.from(allElements).forEach((el) => {
                    const element = el as HTMLElement;
                    const computed = window.getComputedStyle(element);

                    if (computed.color) element.style.color = normalizeColor(computed.color);
                    if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') element.style.backgroundColor = normalizeColor(computed.backgroundColor);

                    // [FIX] Normalize all borders explicitly
                    if (computed.borderColor) element.style.borderColor = normalizeColor(computed.borderColor);
                    if (computed.borderTopColor) element.style.borderTopColor = normalizeColor(computed.borderTopColor);
                    if (computed.borderRightColor) element.style.borderRightColor = normalizeColor(computed.borderRightColor);
                    if (computed.borderBottomColor) element.style.borderBottomColor = normalizeColor(computed.borderBottomColor);
                    if (computed.borderLeftColor) element.style.borderLeftColor = normalizeColor(computed.borderLeftColor);

                    if (computed.fill && computed.fill !== 'none') element.style.fill = normalizeColor(computed.fill);
                    if (computed.stroke && computed.stroke !== 'none') element.style.stroke = normalizeColor(computed.stroke);
                });

                const canvas = await html2canvas(clone, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    windowWidth: 1000,
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
                pdf.save(`reporte_cuom_${report.startDate}.pdf`);

            } catch (error) {
                console.error("Error PDF:", error);
                alert("Error al generar PDF.");
            } finally {
                setIsExporting(false);
            }
        }, 500);
    };

    return (
        <Modal isOpen={isOpen} onClose={() => { setReport(null); onClose(); }} title="Análisis de Rendimiento" size="4xl">
            {isExporting && (
                <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center transition-all animate-fade-in select-none">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-brand-secondary rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-gray-800">Generando Reporte PDF...</h3>
                </div>
            )}

            <div className={`space-y-6 ${isExporting ? 'pointer-events-none' : ''}`}>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full sm:flex-1">
                        <Input id="report-start-date" label="Desde" type="date" max="2100-12-31" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="w-full sm:flex-1">
                        <Input id="report-end-date" label="Hasta" type="date" max="2100-12-31" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <Button onClick={handleGenerateReport} className="w-full sm:w-auto shadow-md">
                        <ChartBarIcon className="w-5 h-5 mr-2" />
                        Generar
                    </Button>
                </div>
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800 flex items-center animate-fade-in-down">
                        <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {error}
                    </div>
                )}

                {report && (
                    <>
                        <div ref={reportContentRef} className={`animate-fade-in ${isExporting ? 'bg-white p-0' : ''}`}>
                            <div className="mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">
                                <h2 className={`text-2xl font-black ${isExporting ? 'text-black' : 'text-gray-900 dark:text-white'}`}>Reporte de Admisiones</h2>
                                <p className={`text-sm ${isExporting ? 'text-black' : 'text-gray-500'}`}>
                                    Periodo: {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <SummaryCard
                                    title="Leads Totales"
                                    value={report.newLeads.total}
                                    subtitle="Captados en periodo"
                                    icon={<ChartBarIcon className="w-5 h-5" />}
                                    colorClass="text-blue-500 bg-blue-100"
                                    isExporting={isExporting}
                                />
                                <SummaryCard
                                    title="Citados"
                                    value={report.periodAppointments}
                                    subtitle="Citas en periodo"
                                    icon={<CalendarIcon className="w-5 h-5" />}
                                    colorClass="text-indigo-500 bg-indigo-100"
                                    isExporting={isExporting}
                                />
                                <SummaryCard
                                    title="Inscritos"
                                    value={report.enrolledCount}
                                    subtitle="Cierres exitosos"
                                    icon={<SparklesIcon className="w-5 h-5" />}
                                    colorClass="text-purple-500 bg-purple-100"
                                    isExporting={isExporting}
                                />
                                <SummaryCard
                                    title="Conversión"
                                    value={`${report.conversionRate.toFixed(1)}%`}
                                    subtitle="Tasa de cierre"
                                    icon={<div className="w-5 h-5 font-bold">%</div>}
                                    colorClass="text-green-500 bg-green-100"
                                    isExporting={isExporting}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ChartSection title="Estatus de Nuevos Leads" isExporting={isExporting}>
                                    <StatusPieChart data={report.newLeads.breakdown} isExporting={isExporting} />
                                </ChartSection>

                                <ChartSection title="Carga por Asesor" isExporting={isExporting}>
                                    <SimpleBarChart data={report.leadsByAdvisor.breakdown} dataKey="count" color={isExporting ? '#333' : '#3b82f6'} isExporting={isExporting} />
                                </ChartSection>

                                <ChartSection title="Rendimiento por Canal" isExporting={isExporting}>
                                    <SimpleBarChart data={report.leadsBySource.breakdown} dataKey="count" color={isExporting ? '#333' : '#8b5cf6'} isExporting={isExporting} />
                                </ChartSection>

                                <ChartSection title="Efectividad de Cierre" isExporting={isExporting}>
                                    <SimpleBarChart
                                        data={report.conversionByAdvisor}
                                        dataKey="rate"
                                        color={isExporting ? '#333' : '#10b981'}
                                        isExporting={isExporting}
                                        formatter={(val) => `${val.toFixed(1)}%`}
                                    />
                                </ChartSection>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-700">
                            <Button onClick={handleExportPDF} variant="secondary" disabled={isExporting} leftIcon={<PrinterIcon className="w-4 h-4" />}>
                                {isExporting ? 'Generando...' : 'Descargar PDF'}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ReportModal;