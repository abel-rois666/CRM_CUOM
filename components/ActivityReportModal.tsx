// components/ActivityReportModal.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Input, Select } from './common/FormElements';
import { supabase } from '../lib/supabase';
import { Profile, Status } from '../types';
import PrinterIcon from './icons/PrinterIcon';
import CalendarIcon from './icons/CalendarIcon';
import UserIcon from './icons/UserIcon';
import ChartBarIcon from './icons/ChartBarIcon';

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type ActivityType = 'new_lead' | 'status_change' | 'note_added' | 'appointment';

interface ActivityEvent {
    id: string;
    leadId: string;
    leadName: string;
    advisorName: string;
    advisorId: string;
    type: ActivityType;
    detail: string;      // texto completo – el truncado es solo visual
    timestamp: string;
}

interface StatusSummaryItem { name: string; count: number; }

interface ActivityReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: Profile | null;
    advisors: Profile[];
    statuses: Status[];
}

// ─── Config visual ─────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<ActivityType, { label: string; emoji: string; bgClass: string; textClass: string }> = {
    new_lead: { label: 'Nuevo Lead', emoji: '🆕', bgClass: 'bg-blue-50 dark:bg-blue-900/20', textClass: 'text-blue-700 dark:text-blue-300' },
    status_change: { label: 'Cambio de Estatus', emoji: '🔄', bgClass: 'bg-amber-50 dark:bg-amber-900/20', textClass: 'text-amber-700 dark:text-amber-300' },
    note_added: { label: 'Nota Agregada', emoji: '📝', bgClass: 'bg-purple-50 dark:bg-purple-900/20', textClass: 'text-purple-700 dark:text-purple-300' },
    appointment: { label: 'Cita', emoji: '📅', bgClass: 'bg-green-50 dark:bg-green-900/20', textClass: 'text-green-700 dark:text-green-300' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}
function formatDateLabel(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
/** Convierte 'YYYY-MM-DD' a ISO UTC sin bug de timezone (medianoche local → UTC) */
function toLocalISO(dateStr: string, time: 'start' | 'end'): string {
    return new Date(`${dateStr}${time === 'start' ? 'T00:00:00' : 'T23:59:59.999'}`).toISOString();
}

// ─── Color normalizer para html2canvas (oklch/oklab → rgb) ────────────────────
function oklabToRgb(L: number, a: number, b: number) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    const c = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
    return `rgb(${Math.round(Math.max(0, Math.min(1, c(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s))) * 255)},${Math.round(Math.max(0, Math.min(1, c(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s))) * 255)},${Math.round(Math.max(0, Math.min(1, c(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s))) * 255)})`;
}
function normalizeColor(c: string) {
    if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return c;
    const og = c.match(/oklab\(\s*([\d.]+)%?\s+([-+]?[\d.]+)\s+([-+]?[\d.]+)/i);
    if (og) { let L = parseFloat(og[1]); if (L > 1) L /= 100; return oklabToRgb(L, parseFloat(og[2]), parseFloat(og[3])); }
    const oc = c.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/i);
    if (oc) { let L = parseFloat(oc[1]); if (L > 1) L /= 100; const C = parseFloat(oc[2]), h = parseFloat(oc[3]) * (Math.PI / 180); return oklabToRgb(L, C * Math.cos(h), C * Math.sin(h)); }
    return c;
}

// ─── Componente ───────────────────────────────────────────────────────────────
const ActivityReportModal: React.FC<ActivityReportModalProps> = ({
    isOpen, onClose, currentUser, advisors, statuses,
}) => {
    const today = new Date().toISOString().split('T')[0];
    const isAdminOrMod = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    // ── Para asesores: fijo a su propio ID.
    // ── Para admin/mod: selector libre; el FETCH siempre trae TODOS y se filtra en cliente.
    const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(
        isAdminOrMod ? 'all' : (currentUser?.id || '')
    );

    // allEvents = TODOS los eventos del periodo (sin filtro de asesor en el servidor)
    const [allEvents, setAllEvents] = useState<ActivityEvent[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) { setAllEvents(null); setError(null); setExpandedIds(new Set()); }
    }, [isOpen]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    // ── Fetch — SIEMPRE trae todos los asesores del periodo ─────────────────────
    const handleFetch = useCallback(async () => {
        if (!startDate || !endDate) { setError('Selecciona un periodo válido.'); return; }
        if (startDate > endDate) { setError('La fecha de inicio no puede ser mayor a la final.'); return; }

        setError(null); setIsLoading(true); setAllEvents(null); setExpandedIds(new Set());
        try {
            const from = toLocalISO(startDate, 'start');
            const to = toLocalISO(endDate, 'end');

            // Para asesores (no admin/mod): restringir server-side a su propio ID
            const serverAdvisorId = isAdminOrMod ? null : currentUser?.id;

            // 1. Leads nuevos
            let q1 = (supabase as any)
                .from('leads')
                .select('id, first_name, paternal_last_name, advisor_id, registration_date')
                .gte('registration_date', from).lte('registration_date', to);
            if (serverAdvisorId) q1 = q1.eq('advisor_id', serverAdvisorId);
            const { data: newLeadsData, error: e1 } = await q1;
            if (e1) throw e1;

            // 2. Cambios de estatus
            let q2 = (supabase as any)
                .from('status_history')
                .select('id, lead_id, new_status_id, date, leads(first_name, paternal_last_name, advisor_id)')
                .gte('date', from).lte('date', to);
            const { data: histData, error: e2 } = await q2;
            if (e2) throw e2;

            // 3. Notas
            let q3 = (supabase as any)
                .from('follow_ups')
                .select('id, lead_id, notes, created_at, leads(first_name, paternal_last_name, advisor_id)')
                .gte('created_at', from).lte('created_at', to);
            const { data: notesData, error: e3 } = await q3;
            if (e3) throw e3;

            // 4. Citas
            let q4 = (supabase as any)
                .from('appointments')
                .select('id, lead_id, title, created_at, status, leads(first_name, paternal_last_name, advisor_id)')
                .gte('created_at', from).lte('created_at', to)
                .neq('status', 'canceled');
            const { data: apptData, error: e4 } = await q4;
            if (e4) throw e4;

            const advisorMap = new Map(advisors.map(a => [a.id, a.full_name]));
            const statusMap = new Map(statuses.map(s => [s.id, s.name]));
            const result: ActivityEvent[] = [];
            let seq = 0;

            const push = (event: ActivityEvent) => {
                // Para asesores: solo sus registros (double-check)
                if (serverAdvisorId && event.advisorId !== serverAdvisorId) return;
                result.push(event);
            };

            (newLeadsData || []).forEach((lead: any) => {
                push({ id: `nl-${seq++}`, leadId: lead.id, leadName: `${lead.first_name} ${lead.paternal_last_name}`, advisorId: lead.advisor_id || '', advisorName: advisorMap.get(lead.advisor_id) || 'Sin Asignar', type: 'new_lead', detail: 'Registro creado', timestamp: lead.registration_date });
            });

            (histData || []).forEach((h: any) => {
                const advisorId = h.leads?.advisor_id || '';
                const statusName = statusMap.get(h.new_status_id) || 'Desconocido';
                push({ id: `sh-${seq++}`, leadId: h.lead_id, leadName: h.leads ? `${h.leads.first_name} ${h.leads.paternal_last_name}` : 'Lead eliminado', advisorId, advisorName: advisorMap.get(advisorId) || 'Sin Asignar', type: 'status_change', detail: `→ ${statusName}`, timestamp: h.date });
            });

            (notesData || []).forEach((n: any) => {
                const advisorId = n.leads?.advisor_id || '';
                push({ id: `fu-${seq++}`, leadId: n.lead_id, leadName: n.leads ? `${n.leads.first_name} ${n.leads.paternal_last_name}` : 'Lead eliminado', advisorId, advisorName: advisorMap.get(advisorId) || 'Sin Asignar', type: 'note_added', detail: n.notes || '', timestamp: n.created_at });
            });

            (apptData || []).forEach((a: any) => {
                const advisorId = a.leads?.advisor_id || '';
                push({ id: `ap-${seq++}`, leadId: a.lead_id, leadName: a.leads ? `${a.leads.first_name} ${a.leads.paternal_last_name}` : 'Lead eliminado', advisorId, advisorName: advisorMap.get(advisorId) || 'Sin Asignar', type: 'appointment', detail: a.title || 'Cita agendada', timestamp: a.created_at });
            });

            result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setAllEvents(result);
        } catch (err: any) {
            setError('Error al cargar la actividad: ' + (err.message || 'Error desconocido'));
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, currentUser, advisors, statuses, isAdminOrMod]);

    // ── Filtrado CLIENT-SIDE al cambiar asesor — INSTANTÁNEO, sin red ──────────
    const events = useMemo<ActivityEvent[] | null>(() => {
        if (!allEvents) return null;
        if (!isAdminOrMod || selectedAdvisorId === 'all') return allEvents;
        return allEvents.filter(ev => ev.advisorId === selectedAdvisorId);
    }, [allEvents, selectedAdvisorId, isAdminOrMod]);

    // ── Resumen de cambios de estatus (derivado de events filtrados) ────────────
    const statusSummary = useMemo<StatusSummaryItem[]>(() => {
        if (!events) return [];
        const map = new Map<string, number>();
        events.forEach(ev => {
            if (ev.type !== 'status_change') return;
            const name = ev.detail.replace('→ ', '');
            map.set(name, (map.get(name) || 0) + 1);
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));
    }, [events]);

    // ── Contadores de cabecera ──────────────────────────────────────────────────
    const counts = useMemo(() =>
        (events || []).reduce((acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + 1; return acc;
        }, {} as Record<ActivityType, number>)
        , [events]);

    // ── Export PDF — html2canvas + smart row-boundary split ────────────────────
    const handleExportPDF = async () => {
        if (!reportRef.current || !events) return;
        setIsExporting(true);
        setExpandedIds(new Set(events.filter(e => e.type === 'note_added').map(e => e.id)));
        await new Promise(r => setTimeout(r, 350));

        try {
            const { jsPDF } = await import('jspdf');
            const html2canvas = (await import('html2canvas')).default;
            const content = reportRef.current!;

            const clone = content.cloneNode(true) as HTMLElement;
            clone.style.cssText = `width:1100px;padding:32px 40px;background:#fff;position:absolute;left:-9999px;top:0;font-family:Arial,Helvetica,sans-serif;`;
            document.body.appendChild(clone);

            Array.from(clone.querySelectorAll('*')).forEach((el) => {
                const e = el as HTMLElement;
                const cs = window.getComputedStyle(e);
                e.style.color = normalizeColor(cs.color) || '#111';
                if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)')
                    e.style.backgroundColor = normalizeColor(cs.backgroundColor);
                if (cs.borderColor) e.style.borderColor = normalizeColor(cs.borderColor);
            });

            const cloneRect = clone.getBoundingClientRect();
            const tableRows = clone.querySelectorAll('table tbody tr');
            const rowBreaksPx: number[] = [0];
            tableRows.forEach(row => {
                rowBreaksPx.push(Math.round(row.getBoundingClientRect().bottom - cloneRect.top));
            });
            rowBreaksPx.push(Math.round(cloneRect.height));

            const canvas = await html2canvas(clone, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: 1100 });
            document.body.removeChild(clone);

            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const MARGIN = 12;
            const usableW = pdfW - 2 * MARGIN;
            const usableH = pdfH - 2 * MARGIN;
            const mmPerPx = usableW / canvas.width;
            const pageHpx = usableH / mmPerPx;
            const scaleFactor = canvas.height / cloneRect.height;
            const rowBreaksCanvas = rowBreaksPx.map(bp => Math.round(bp * scaleFactor));

            const label = startDate === endDate ? startDate : `${startDate}_${endDate}`;
            let pageStart = 0, pageIdx = 0;

            while (pageStart < canvas.height) {
                if (pageIdx > 0) pdf.addPage();
                const idealEnd = pageStart + pageHpx;
                let safeEnd = Math.min(idealEnd, canvas.height);
                if (idealEnd < canvas.height) {
                    for (let i = rowBreaksCanvas.length - 1; i >= 0; i--) {
                        if (rowBreaksCanvas[i] <= idealEnd && rowBreaksCanvas[i] > pageStart) { safeEnd = rowBreaksCanvas[i]; break; }
                    }
                    if (safeEnd === pageStart) safeEnd = idealEnd;
                }
                const segH = Math.ceil(safeEnd - pageStart);
                const seg = document.createElement('canvas');
                seg.width = canvas.width; seg.height = segH;
                const ctx = seg.getContext('2d')!;
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, seg.width, seg.height);
                ctx.drawImage(canvas, 0, pageStart, canvas.width, segH, 0, 0, canvas.width, segH);
                pdf.addImage(seg.toDataURL('image/png'), 'PNG', MARGIN, MARGIN, usableW, segH * mmPerPx);
                pageStart = safeEnd; pageIdx++;
            }
            pdf.save(`actividad_${label}.pdf`);
        } catch (err) {
            console.error('Error PDF:', err);
            alert('Error al generar PDF.');
        } finally {
            setIsExporting(false);
            setExpandedIds(new Set());
        }
    };

    // ── Opciones de asesor ──────────────────────────────────────────────────────
    const advisorOptions = [
        { value: 'all', label: 'Todos los asesores' },
        ...advisors.map(a => ({ value: a.id, label: a.full_name })),
    ];
    const showAdvisorCol = isAdminOrMod && selectedAdvisorId === 'all';

    // ── Nombre del asesor seleccionado (para header del reporte) ───────────────
    const advisorLabel = !isAdminOrMod
        ? currentUser?.full_name
        : selectedAdvisorId !== 'all'
            ? advisors.find(a => a.id === selectedAdvisorId)?.full_name
            : undefined;

    // ─── Render ──────────────────────────────────────────────────────────────────
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Actividad de Leads" size="4xl">
            {isExporting && (
                <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in select-none">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
                        <div className="w-16 h-16 border-4 border-brand-secondary rounded-full animate-spin absolute top-0 left-0 border-t-transparent" />
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-gray-800">Generando PDF...</h3>
                </div>
            )}

            <div className="space-y-5">
                {/* ── Filtros ─────────────────────────────────────────────────────── */}
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-end flex-wrap">
                    <div className="w-full sm:flex-1 min-w-[130px]">
                        <Input id="act-start" label="Desde" type="date" value={startDate} max="2100-12-31"
                            onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="w-full sm:flex-1 min-w-[130px]">
                        <Input id="act-end" label="Hasta" type="date" value={endDate} max="2100-12-31"
                            onChange={e => setEndDate(e.target.value)} />
                    </div>
                    {isAdminOrMod && (
                        <div className="w-full sm:flex-1 min-w-[180px]">
                            {/* Selector de asesor: solo filtra en cliente — sin nueva query */}
                            <Select id="act-advisor" label="Asesor" value={selectedAdvisorId}
                                onChange={e => setSelectedAdvisorId(e.target.value)}
                                options={advisorOptions}
                                disabled={allEvents === null} // desabilitado hasta primer fetch
                            />
                        </div>
                    )}
                    <div className="flex flex-col items-start sm:items-end gap-1">
                        <Button onClick={handleFetch} disabled={isLoading} className="w-full sm:w-auto shadow-md whitespace-nowrap">
                            <ChartBarIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Cargando…' : 'Ver Actividad'}
                        </Button>
                        {isAdminOrMod && allEvents !== null && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-right">
                                Cambia el asesor sin recargar · El botón actualiza las fechas
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800">
                        {error}
                    </div>
                )}

                {isLoading && (
                    <div className="space-y-3 animate-pulse">
                        {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-slate-800 rounded-xl" />)}
                    </div>
                )}

                {/* ── Resultados ──────────────────────────────────────────────────── */}
                {events !== null && !isLoading && (
                    <div ref={reportRef} className="space-y-5">
                        {/* Encabezado */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-gray-100 dark:border-slate-700 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reporte de Actividad</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {startDate === endDate
                                        ? `Día: ${formatDateLabel(startDate)}`
                                        : `${formatDateLabel(startDate)} — ${formatDateLabel(endDate)}`}
                                    {advisorLabel && <span className="ml-2">· {advisorLabel}</span>}
                                </p>
                            </div>
                            <Button onClick={handleExportPDF} variant="secondary" disabled={isExporting || events.length === 0}
                                leftIcon={<PrinterIcon className="w-4 h-4" />} className="shrink-0">
                                {isExporting ? 'Generando…' : 'PDF'}
                            </Button>
                        </div>

                        {/* ── Tarjetas de resumen ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(Object.entries(TYPE_CONFIG) as [ActivityType, typeof TYPE_CONFIG[ActivityType]][]).map(([type, cfg]) => (
                                <div key={type} className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bgClass}`}>
                                    <span className="text-2xl">{cfg.emoji}</span>
                                    <div>
                                        <p className={`text-xl font-black ${cfg.textClass}`}>{counts[type] || 0}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{cfg.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Desglose de cambios de estatus ── */}
                        {statusSummary.length > 0 && (
                            <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                                    🔄 Desglose de Cambios de Estatus
                                    <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
                                        ({counts['status_change'] || 0} cambios totales)
                                    </span>
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {statusSummary.map(({ name, count }) => {
                                        const pct = counts['status_change'] ? Math.round((count / counts['status_change']) * 100) : 0;
                                        return (
                                            <div key={name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 shadow-sm">
                                                <span className="text-lg font-black text-amber-700 dark:text-amber-300 leading-none">{count}</span>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-800 dark:text-white leading-tight">{name}</p>
                                                    <p className="text-[10px] text-gray-400 leading-tight">{pct}% del total</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Tabla de actividad ── */}
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                                <CalendarIcon className="w-12 h-12 mb-3 opacity-30" />
                                <p className="font-medium">Sin actividad en este periodo.</p>
                                <p className="text-sm mt-1">Ajusta el rango de fechas o el asesor.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                                            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Hora</th>
                                            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Tipo</th>
                                            <th className="px-4 py-3 text-left font-semibold">Lead</th>
                                            {showAdvisorCol && (
                                                <th className="px-4 py-3 text-left font-semibold">
                                                    <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" />Asesor</span>
                                                </th>
                                            )}
                                            <th className="px-4 py-3 text-left font-semibold">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {events.map((ev) => {
                                            const cfg = TYPE_CONFIG[ev.type];
                                            const isNote = ev.type === 'note_added';
                                            const isLong = isNote && ev.detail.length > 70;
                                            const isExp = expandedIds.has(ev.id);
                                            return (
                                                <React.Fragment key={ev.id}>
                                                    <tr className="bg-white dark:bg-slate-800/40 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap text-gray-400 dark:text-gray-500 font-mono text-xs align-top">
                                                            {formatTime(ev.timestamp)}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap align-top">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bgClass} ${cfg.textClass}`}>
                                                                {cfg.emoji} {cfg.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap align-top">
                                                            {ev.leadName}
                                                        </td>
                                                        {showAdvisorCol && (
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap align-top">
                                                                {ev.advisorName}
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 align-top max-w-xs">
                                                            {isNote ? (
                                                                <div>
                                                                    <span className={!isExp && isLong ? 'line-clamp-2' : 'whitespace-pre-wrap'}>
                                                                        {ev.detail}
                                                                    </span>
                                                                    {isLong && (
                                                                        <button onClick={() => toggleExpand(ev.id)}
                                                                            className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline block">
                                                                            {isExp ? '▲ Ver menos' : '▼ Ver más'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span>{ev.detail}</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {events.length > 0 && (
                            <p className="text-xs text-right text-gray-400 dark:text-gray-500">
                                {events.length} evento{events.length !== 1 ? 's' : ''} en el periodo
                                {allEvents && allEvents.length !== events.length && (
                                    <span className="ml-1">· {allEvents.length} totales en el periodo</span>
                                )}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ActivityReportModal;
