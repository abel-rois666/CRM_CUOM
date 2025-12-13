import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, Status } from '../types';
import Button from './common/Button';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';
import SparklesIcon from './icons/SparklesIcon'; // Assuming this exists or I'll use a generic one
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { generateAdvisorEvaluation } from '../utils/aiAssistant';

interface AdvisorMetric {
    advisorId: string;
    advisorName: string;
    role: string;
    totalLeads: number;
    enrolled: number; // Won
    lost: number; // Lost
    active: number; // Active
    interactions: number; // Follow-ups count
    appointmentsScheduled: number;
    appointmentsCompleted: number;
    appointmentsCanceled: number;
    overdueFollowUps: number; // Scheduled appointments in the past
    heuristicSummary?: string;
    aiSummary?: string;
    aiLoading?: boolean;
}

interface AdvisorEvaluationProps {
    advisors: Profile[];
    statuses: Status[];
}

const calculateHeuristicAnalysis = (m: AdvisorMetric) => {
    const conversionRate = m.totalLeads > 0 ? (m.enrolled / m.totalLeads * 100).toFixed(1) : '0';
    const interactionRatio = m.totalLeads > 0 ? (m.interactions / m.totalLeads).toFixed(1) : '0';

    let summary = `📊 Análisis Automático:\n`;
    summary += `• Conversión: ${conversionRate}% (${m.enrolled}/${m.totalLeads})\n`;
    summary += `• Intensidad: ${interactionRatio} interacciones/lead\n`;

    if (m.overdueFollowUps > 5) {
        summary += `⚠️ ALERTA: ${m.overdueFollowUps} seguimientos vencidos.\n`;
    } else {
        summary += `✅ Agenda al día.\n`;
    }

    if (Number(conversionRate) > 15) summary += `🌟 Buen cierre.`;
    else if (Number(conversionRate) < 5 && m.totalLeads > 10) summary += `📉 Revisar técnicas de cierre.`;
    else if (m.interactions === 0 && m.totalLeads > 0) summary += `⚠️ Sin actividad registrada.`;

    return summary;
};

const AdvisorEvaluation: React.FC<AdvisorEvaluationProps> = ({ advisors, statuses }) => {
    const [metrics, setMetrics] = useState<AdvisorMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [selectedAdvisors, setSelectedAdvisors] = useState<Set<string>>(new Set());

    // Compute status categories for quick lookup
    const statusCategoryMap = useMemo(() => {
        const map = new Map<string, string>();
        statuses.forEach(s => map.set(s.id, s.category || 'active'));
        return map;
    }, [statuses]);

    // [OPTIMIZATION] Create stable hashes for dependencies to prevent re-fetching on parent re-renders
    const advisorsHash = useMemo(() => advisors.map(a => a.id).sort().join(','), [advisors]);
    const statusesHash = useMemo(() => statuses.map(s => s.id).sort().join(','), [statuses]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Leads (only needed columns)
                const { data: leads, error: leadsError } = await (supabase as any)
                    .from('leads')
                    .select('id, advisor_id, status_id');

                if (leadsError) throw leadsError;

                // 2. Fetch Interactions (Follow Ups)
                const { data: followUps, error: fuError } = await (supabase as any)
                    .from('follow_ups')
                    .select('created_by'); // We just need counts per user

                if (fuError) throw fuError;

                // 3. Fetch Appointments
                const { data: appointments, error: apptError } = await (supabase as any)
                    .from('appointments')
                    .select('created_by, status, date');

                if (apptError) throw apptError;

                // Process Data
                const statsMap = new Map<string, AdvisorMetric>();

                // Initialize for all advisors
                advisors.forEach(adv => {
                    statsMap.set(adv.id, {
                        advisorId: adv.id,
                        advisorName: adv.full_name,
                        role: adv.role,
                        totalLeads: 0,
                        enrolled: 0,
                        lost: 0,
                        active: 0,
                        interactions: 0,
                        appointmentsScheduled: 0,
                        appointmentsCompleted: 0,
                        appointmentsCanceled: 0,
                        overdueFollowUps: 0
                    });
                });

                // Aggregate Leads
                leads?.forEach((lead: any) => {
                    if (lead.advisor_id && statsMap.has(lead.advisor_id)) {
                        const stats = statsMap.get(lead.advisor_id)!;
                        stats.totalLeads++;
                        const cat = statusCategoryMap.get(lead.status_id) || 'active';
                        if (cat === 'won') stats.enrolled++;
                        else if (cat === 'lost') stats.lost++;
                        else stats.active++;
                    }
                });

                // Aggregate Interactions
                followUps?.forEach((fu: any) => {
                    if (fu.created_by && statsMap.has(fu.created_by)) {
                        statsMap.get(fu.created_by)!.interactions++;
                    }
                });

                // Aggregate Appointments
                const now = new Date();
                appointments?.forEach((appt: any) => {
                    if (appt.created_by && statsMap.has(appt.created_by)) {
                        const stats = statsMap.get(appt.created_by)!;
                        if (appt.status === 'completed') stats.appointmentsCompleted++;
                        else if (appt.status === 'canceled') stats.appointmentsCanceled++;
                        else stats.appointmentsScheduled++;

                        // Check overdue
                        const apptDate = new Date(appt.date);
                        if (appt.status === 'scheduled' && apptDate < now) {
                            stats.overdueFollowUps++;
                        }
                    }
                });

                // Filter out advisors with 0 leads and Calculate Heuristics
                const finalMetrics = Array.from(statsMap.values())
                    .filter(m => m.totalLeads > 0)
                    .map(m => ({
                        ...m,
                        heuristicSummary: calculateHeuristicAnalysis(m)
                    }));
                setMetrics(finalMetrics);

            } catch (err) {
                console.error("Error fetching evaluation data:", err);
            } finally {
                setLoading(false);
            }
        };

        if (advisors.length > 0 && statuses.length > 0) {
            fetchData();
        }
    }, [advisorsHash, statusesHash]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedAdvisors(new Set(metrics.map(m => m.advisorId)));
        } else {
            setSelectedAdvisors(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedAdvisors);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedAdvisors(newSet);
    };



    const generateAIMetricAnalysis = async (metric: AdvisorMetric) => {
        setMetrics(prev => prev.map(m => m.advisorId === metric.advisorId ? { ...m, aiLoading: true } : m));

        const conversionRate = metric.totalLeads > 0 ? (metric.enrolled / metric.totalLeads * 100).toFixed(1) : '0';
        const interactionRatio = metric.totalLeads > 0 ? (metric.interactions / metric.totalLeads).toFixed(1) : '0';

        try {
            const summary = await generateAdvisorEvaluation(metric.advisorName, {
                totalLeads: metric.totalLeads,
                enrolled: metric.enrolled,
                lost: metric.lost,
                active: metric.active,
                interactions: metric.interactions,
                overdue: metric.overdueFollowUps,
                conversionRate,
                interactionRatio
            });
            setMetrics(prev => prev.map(m => m.advisorId === metric.advisorId ? { ...m, aiSummary: summary, aiLoading: false } : m));
        } catch (error) {
            console.error(error);
            setMetrics(prev => prev.map(m => m.advisorId === metric.advisorId ? { ...m, aiSummary: "Error al generar análisis IA.", aiLoading: false } : m));
        }
    };

    const cleanText = (str: string) => {
        if (!str) return "";
        // Remove emoji and non-standard chars that break jsPDF default fonts
        return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
            .replace(/[^\x20-\x7E\u00C0-\u00FF\u000A\u000D]/g, " ");
    };

    const handleGenerateAllAI = () => {
        metrics.forEach(m => {
            if (!m.aiSummary && !m.aiLoading) {
                generateAIMetricAnalysis(m);
            }
        });
    };

    const exportPDF = () => {
        setGeneratingReport(true);
        const doc = new jsPDF();

        // [FIX] Strict filter: Only selected advisors. If none selected, do NOT export (button should be disabled anyway but safety check)
        const targets = metrics.filter(m => selectedAdvisors.has(m.advisorId));

        if (targets.length === 0) {
            alert("Por favor seleccione al menos un asesor para exportar el reporte.");
            setGeneratingReport(false);
            return;
        }

        doc.setFontSize(18);
        doc.text("Reporte de Evaluación de Asesores - CRM Universitario", 14, 20);
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 28);

        const tableData = targets.map(m => [
            m.advisorName,
            m.totalLeads,
            m.enrolled,
            `${((m.enrolled / m.totalLeads) * 100).toFixed(1)}%`,
            m.active,
            m.interactions,
            m.overdueFollowUps
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Asesor', 'Total', 'Inscritos', 'Conv %', 'Activos', 'Interac.', 'Atrasos']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Add Summaries
        let finalY = (doc as any).lastAutoTable.finalY + 10;

        targets.forEach(m => {
            if (finalY > 250) {
                doc.addPage();
                finalY = 20;
            }
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`Detalle: ${m.advisorName}`, 14, finalY);
            finalY += 7;

            // Heuristic
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            const heuristicLines = doc.splitTextToSize(cleanText(m.heuristicSummary || ""), 180);
            doc.text(heuristicLines, 14, finalY);
            finalY += (heuristicLines.length * 5) + 3;

            // AI
            if (m.aiSummary) {
                doc.setTextColor(0);
                doc.setFont("helvetica", "italic");
                const aiLines = doc.splitTextToSize(`[IA]: ${cleanText(m.aiSummary)}`, 180);
                doc.text(aiLines, 14, finalY);
                finalY += (aiLines.length * 5) + 5;
            }

            finalY += 5;
            doc.setTextColor(0);
            doc.setFont("helvetica", "normal");
        });

        doc.save("evaluacion_asesores.pdf");
        setGeneratingReport(false);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Analizando desempeño...</div>;

    if (metrics.length === 0) return <div className="p-8 text-center text-gray-500">No se encontraron asesores con leads asignados.</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Evaluación de Desempeño</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Métricas clave y análisis de productividad por asesor.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button
                        onClick={handleGenerateAllAI}
                        variant="secondary"
                        leftIcon={<SparklesIcon className="w-4 h-4 text-yellow-500" />}
                        className="flex-1 justify-center whitespace-normal text-center h-auto py-2"
                    >
                        Generar Análisis IA
                    </Button>
                    <Button
                        onClick={exportPDF}
                        leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                        disabled={generatingReport || selectedAdvisors.size === 0}
                        className="flex-1 justify-center whitespace-nowrap"
                    >
                        {generatingReport ? 'Generando...' : 'Exportar PDF'}
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={selectedAdvisors.size === metrics.length && metrics.length > 0}
                                        className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                                    />
                                </th>
                                <th className="p-4">Asesor</th>
                                <th className="p-4 text-center">Métricas Clave</th>
                                <th className="p-4 w-1/3">Análisis y Recomendaciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {metrics.map(m => (
                                <tr key={m.advisorId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedAdvisors.has(m.advisorId)}
                                            onChange={() => handleSelectOne(m.advisorId)}
                                            className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="font-bold text-slate-800 dark:text-slate-100 mb-1">{m.advisorName}</div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 capitalize border border-slate-200 dark:border-slate-600">
                                            {m.role === 'advisor' ? 'Asesor' : m.role}
                                        </span>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                                            <div className="flex justify-between items-center group">
                                                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Total Leads:</span>
                                                <span className="font-semibold text-slate-900 dark:text-white">{m.totalLeads}</span>
                                            </div>
                                            <div className="flex justify-between items-center group">
                                                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Inscritos:</span>
                                                <span className="font-bold text-green-600 dark:text-green-400">{m.enrolled}</span>
                                            </div>
                                            <div className="flex justify-between items-center group">
                                                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Activos:</span>
                                                <span className="font-semibold text-blue-600 dark:text-blue-400">{m.active}</span>
                                            </div>
                                            <div className="flex justify-between items-center group">
                                                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Perdidos:</span>
                                                <span className="font-medium text-red-500 dark:text-red-400">{m.lost}</span>
                                            </div>
                                            <div className="flex justify-between items-center col-span-2 border-t pt-2 mt-1 border-slate-100 dark:border-slate-700 group">
                                                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Interacciones:</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{m.interactions}</span>
                                            </div>
                                            <div className="flex justify-between items-center col-span-2 group">
                                                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Atrasos:</span>
                                                <span className={`${m.overdueFollowUps > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-400 dark:text-slate-600'}`}>
                                                    {m.overdueFollowUps}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <div className="space-y-3">
                                            {/* Heuristic Summary (Always Visible) */}
                                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 relative shadow-sm">
                                                <div className="whitespace-pre-wrap leading-relaxed">{m.heuristicSummary}</div>
                                            </div>

                                            {/* AI Summary (On Demand) */}
                                            {m.aiSummary ? (
                                                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 p-3.5 rounded-lg text-xs text-slate-700 dark:text-purple-100 relative shadow-sm animate-fade-in">
                                                    <div className="absolute -top-2.5 -right-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-200 dark:border-purple-700 shadow-sm flex items-center gap-1">
                                                        <SparklesIcon className="w-3 h-3" />
                                                        IA
                                                    </div>
                                                    <div className="whitespace-pre-wrap italic leading-relaxed">{m.aiSummary}</div>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => generateAIMetricAnalysis(m)}
                                                    className="w-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                                                    disabled={m.aiLoading}
                                                >
                                                    {m.aiLoading ? (
                                                        <span className="flex items-center gap-2">
                                                            <SparklesIcon className="w-3.5 h-3.5 animate-spin" /> Analizando...
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 font-medium">
                                                            <SparklesIcon className="w-3.5 h-3.5" /> Consultar Opinión IA
                                                        </span>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View (New) */}
                <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Seleccionar todos</span>
                        <input
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={selectedAdvisors.size === metrics.length && metrics.length > 0}
                            className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer w-5 h-5"
                        />
                    </div>
                    {metrics.map(m => (
                        <div key={m.advisorId} className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedAdvisors.has(m.advisorId)}
                                        onChange={() => handleSelectOne(m.advisorId)}
                                        className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary cursor-pointer w-5 h-5 mt-1"
                                    />
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-slate-100 text-base">{m.advisorName}</div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 capitalize border border-slate-200 dark:border-slate-600 mt-1">
                                            {m.role === 'advisor' ? 'Asesor' : m.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 grid grid-cols-2 gap-3 text-xs border border-slate-100 dark:border-slate-700">
                                <div className="space-y-1">
                                    <p className="text-slate-500 dark:text-slate-400">Total Leads</p>
                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{m.totalLeads}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-500 dark:text-slate-400">Inscritos</p>
                                    <p className="font-bold text-green-600 dark:text-green-400 text-sm">{m.enrolled}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-500 dark:text-slate-400">Activos</p>
                                    <p className="font-semibold text-blue-600 dark:text-blue-400">{m.active}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-500 dark:text-slate-400">Atrasos</p>
                                    <p className={`${m.overdueFollowUps > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-400'}`}>
                                        {m.overdueFollowUps}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg text-xs text-slate-700 dark:text-slate-300 shadow-sm leading-relaxed">
                                    {m.heuristicSummary}
                                </div>

                                {m.aiSummary ? (
                                    <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 p-3 rounded-lg text-xs text-slate-700 dark:text-purple-100 relative shadow-sm leading-relaxed">
                                        <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold text-[10px] mb-1">
                                            <SparklesIcon className="w-3 h-3" /> ANÁLISIS IA
                                        </div>
                                        <div className="italic">{m.aiSummary}</div>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => generateAIMetricAnalysis(m)}
                                        className="w-full justify-center border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                        disabled={m.aiLoading}
                                    >
                                        {m.aiLoading ? 'Analizando...' : 'Consultar IA'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

// [OPTIMIZATION] Use React.memo to prevent re-renders if props are identical
export default React.memo(AdvisorEvaluation);
