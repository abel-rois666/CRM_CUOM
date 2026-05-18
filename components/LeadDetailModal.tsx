// components/LeadDetailModal.tsx
import React, { useState, useMemo } from 'react';
import { Lead, Profile, Status, FollowUp, Source, Appointment, Licenciatura } from '../types';
import { calculateLeadScore, getScoreColor, getScoreLabel, getScoreBreakdown } from '../utils/leadScoring';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select, TextArea, Input } from './common/FormElements';
import CalendarIcon from './icons/CalendarIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import EditIcon from './icons/EditIcon'; // Used as PencilIcon
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './common/ConfirmationModal';
import ArrowPathIcon from './icons/ArrowPathIcon';
import BellAlertIcon from './icons/BellAlertIcon';
import TransferIcon from './icons/TransferIcon';
import TransferLeadModal from './TransferLeadModal';
import FollowUpFormModal from './FollowUpFormModal';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import UserIcon from './icons/UserIcon';
import SparklesIcon from './icons/SparklesIcon';
import { generateLeadSummary } from '../utils/aiAssistant';
import ListBulletIcon from './icons/ListBulletIcon';
import ClockIcon from './icons/ClockIcon';
import TagIcon from './icons/TagIcon';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import WhatsAppChat from './WhatsAppChat'; // [NEW] Chat en tiempo real
import { supabase } from '../lib/supabase'; // [NEW] Para fetch de mensajes WA

const PencilIcon = EditIcon; // Alias for code compatibility

interface LeadDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    advisors: Profile[];
    statuses: Status[];
    sources: Source[];
    licenciaturas: Licenciatura[];
    onAddFollowUp: (leadId: string, followUp: Omit<FollowUp, 'id' | 'lead_id'>) => void;
    onDeleteFollowUp: (leadId: string, followUpId: string) => void;
    onUpdateLead: (leadId: string, updates: Partial<Lead>) => void;
    onSaveAppointment: (leadId: string, appointment: Omit<Appointment, 'id' | 'status' | 'lead_id' | 'created_at' | 'updated_at'>, appointmentIdToEdit?: string) => void;
    onUpdateAppointmentStatus: (leadId: string, appointmentId: string, status: 'completed' | 'canceled') => void;
    onDeleteAppointment: (leadId: string, appointmentId: string) => void;
    onTransferLead: (leadId: string, newAdvisorId: string, reason: string) => void;
    currentUser: Profile | null;
    initialTab?: 'info' | 'activity' | 'appointments' | 'summary' | 'whatsapp';
    onOpenWhatsApp?: (lead: Lead) => void;
    onOpenEmail?: (lead: Lead) => void;
}

interface AppointmentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead;
    appointment: Appointment | undefined;
    onSave: (appointmentData: Omit<Appointment, 'id' | 'status' | 'lead_id' | 'created_at' | 'updated_at'>) => void;
    onDelete: () => void;
    existingAppointments: Appointment[];
    canDelete: boolean;
}

// --- SUB-COMPONENT: Appointment Modal ---
const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({ isOpen, onClose, lead, appointment, onSave, onDelete, existingAppointments, canDelete }) => {
    const fullNameForAppointment = `${lead.first_name} ${lead.paternal_last_name}`.trim();
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // <--- New State

    const [formData, setFormData] = useState({
        title: appointment?.title || `Cita con ${fullNameForAppointment}`,
        date: appointment ? new Date(appointment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        time: appointment ? new Date(appointment.date).toTimeString().substring(0, 5) : '10:00',
        duration: appointment?.duration || 60,
        details: appointment?.details || `Discutir el programa de interés.`,
    });



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setShowDuplicateWarning(false);
    };

    const handlePreSave = () => {
        const newDateTimeStr = `${formData.date}T${formData.time}`;
        const newDate = new Date(newDateTimeStr);

        const isDuplicate = existingAppointments.some(appt => {
            if (appointment && appt.id === appointment.id) return false;
            const apptDate = new Date(appt.date);
            return Math.abs(apptDate.getTime() - newDate.getTime()) < 60000;
        });

        if (isDuplicate && !showDuplicateWarning) {
            setShowDuplicateWarning(true);
            return;
        }

        handleSave();
    };

    const handleSave = () => {
        setIsSubmitting(true);
        const appointmentDateTime = new Date(`${formData.date}T${formData.time}`);
        onSave({
            title: formData.title,
            date: appointmentDateTime.toISOString(),
            duration: Number(formData.duration),
            details: formData.details
        });
        // onClose will unmount component, so no need to set false, but good practice if async changes
        // But since onSave is void, we just assume it closes.
        onClose();
    };

    const createGoogleCalendarLink = () => {
        const { title, date, time, duration, details } = formData;
        const startTime = new Date(`${date}T${time}`);
        const endTime = new Date(startTime.getTime() + Number(duration) * 60000);
        const formatDate = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

        const url = new URL('https://www.google.com/calendar/render');
        url.searchParams.set('action', 'TEMPLATE');
        url.searchParams.set('text', title);
        url.searchParams.set('dates', `${formatDate(startTime)}/${formatDate(endTime)}`);
        url.searchParams.set('details', details);
        if (lead.email) url.searchParams.set('add', lead.email);

        window.open(url.toString(), '_blank');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={appointment ? 'Editar Cita' : 'Programar Cita'} size="md">
            <div className="space-y-5">
                {showDuplicateWarning && (
                    <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-400 dark:border-amber-500 p-4 animate-fade-in">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <ExclamationCircleIcon className="h-5 w-5 text-amber-400 dark:text-amber-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-amber-700 dark:text-amber-200">
                                    Ya existe una cita registrada para esta fecha y hora.
                                    <br />
                                    <strong>¿Deseas sobrescribir/agendar de todos modos?</strong>
                                </p>
                                <div className="mt-2">
                                    <button onClick={handleSave} className="text-sm font-bold text-amber-800 dark:text-amber-100 underline hover:text-amber-900 dark:hover:text-white">
                                        Sí, guardar de todos modos
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Input
                    label="Título de la Cita"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Fecha"
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                    <Input
                        label="Hora"
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                </div>

                <Input
                    label="Duración (min)"
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
                <TextArea
                    label="Detalles / Notas"
                    name="details"
                    value={formData.details}
                    onChange={handleChange}
                    rows={3}
                    className="dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />

                <div className="pt-4 flex justify-between items-center border-t border-gray-100 dark:border-slate-700">
                    <Button variant="ghost" onClick={createGoogleCalendarLink} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> Google Cal</span>
                    </Button>
                    <div className="flex gap-2">
                        {appointment && canDelete && (
                            <Button variant="danger" onClick={onDelete} title="Eliminar cita" disabled={isSubmitting}>
                                <TrashIcon className="w-4 h-4" />
                            </Button>
                        )}
                        <Button variant="secondary" onClick={onClose} className="dark:bg-slate-800 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700" disabled={isSubmitting}>Cancelar</Button>
                        <Button onClick={handlePreSave} disabled={isSubmitting}>
                            {isSubmitting ? 'Guardando...' : (appointment ? 'Guardar' : 'Programar')}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// --- SUB-COMPONENT: Expandable Text ---
const ExpandableText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldTruncate = text.length > 150 || text.split('\n').length > 3;

    return (
        <div className={`relative ${className}`}>
            <p className={`whitespace-pre-wrap break-words text-sm transition-all duration-200 ${!isExpanded && shouldTruncate ? 'line-clamp-3' : ''}`}>
                {text}
            </p>
            {shouldTruncate && (
                <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="mt-1 text-xs font-semibold text-brand-secondary hover:underline focus:outline-none dark:text-blue-400"
                >
                    {isExpanded ? 'Ver menos' : 'Ver más...'}
                </button>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: Collapsible Section ---
const CollapsibleSection: React.FC<{
    title: React.ReactNode;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    count?: number;
}> = ({ title, icon, children, defaultOpen = false, count }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-gray-50/50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="text-gray-500 dark:text-gray-400">{icon}</div>
                    <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{title}</span>
                    {count !== undefined && count > 0 && (
                        <span className="bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs py-0.5 px-2 rounded-full font-bold">
                            {count}
                        </span>
                    )}
                </div>
                <div className="text-gray-400 dark:text-gray-500">
                    {isOpen ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                </div>
            </button>

            {isOpen && (
                <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-slide-up">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ isOpen, onClose, lead, advisors, statuses, sources, licenciaturas, onAddFollowUp, onDeleteFollowUp, onUpdateLead, onSaveAppointment, onUpdateAppointmentStatus, onDeleteAppointment, onTransferLead, currentUser, initialTab = 'info', onOpenWhatsApp, onOpenEmail }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'appointments' | 'summary' | 'whatsapp'>(initialTab);

    const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<any>(null); // [NEW] Track which appointment is being edited
    const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null); // [NEW] Confirm delete
    const [isFollowUpModalOpen, setFollowUpModalOpen] = useState(false);
    const [isTransferModalOpen, setTransferModalOpen] = useState(false);
    const [isCancelConfirmOpen, setCancelConfirmOpen] = useState(false);

    const [followUpToDelete, setFollowUpToDelete] = useState<string | null>(null);

    const isAdmin = currentUser?.role === 'admin';

    const sourceMap = useMemo(() => new Map(sources.map(s => [s.id, s.name])), [sources]);
    const licenciaturaMap = useMemo(() => new Map(licenciaturas.map(l => [l.id, l.name])), [licenciaturas]);
    const statusMap = useMemo(() => new Map(statuses.map(s => [s.id, { name: s.name, color: s.color }])), [statuses]);

    const { activeAppointment, pastAppointments } = useMemo(() => {
        if (!lead?.appointments) return { activeAppointment: undefined, pastAppointments: [] };
        const sorted = [...lead.appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
            activeAppointment: sorted.find(a => a.status === 'scheduled'),
            pastAppointments: sorted.filter(a => a.status !== 'scheduled')
        };
    }, [lead]);

    const activitySections = useMemo(() => {
        // 1. Cambios en Leads
        const leadChanges: any[] = [];
        if (lead?.follow_ups) {
            lead.follow_ups.filter(f => f.notes.includes('TRANSICIÓN DE ASESOR')).forEach(f => {
                leadChanges.push({
                    type: 'transfer',
                    actionDate: new Date(f.created_at || f.date),
                    user: f.created_by?.full_name || 'Desconocido',
                    data: f
                });
            });
        }
        if (lead?.status_history) {
            lead.status_history.forEach(h => {
                leadChanges.push({
                    type: 'status_change',
                    actionDate: new Date(h.date),
                    user: h.created_by?.full_name || 'Sistema',
                    data: h
                });
            });
        }
        leadChanges.sort((a, b) => b.actionDate.getTime() - a.actionDate.getTime());

        // 2. Notas
        const notes: any[] = [];
        if (lead?.follow_ups) {
            lead.follow_ups.filter(f => !f.notes.includes('TRANSICIÓN DE ASESOR')).forEach(f => {
                const contactDateStr = f.date;
                let contactDateDisplay: Date;

                if (contactDateStr.includes('T')) {
                    contactDateDisplay = new Date(contactDateStr);
                } else {
                    const [y, m, d] = contactDateStr.split('-').map(Number);
                    contactDateDisplay = new Date(y, m - 1, d, 12, 0, 0);
                }

                notes.push({
                    type: 'note',
                    actionDate: new Date(f.created_at || f.date),
                    contactDate: contactDateDisplay,
                    user: f.created_by?.full_name || 'Desconocido',
                    data: f
                });
            });
        }
        notes.sort((a, b) => b.actionDate.getTime() - a.actionDate.getTime());

        // 3. Histórico de Citas
        const appointmentsHistory: any[] = [];
        if (lead?.appointments) {
            lead.appointments.forEach(a => {
                const actionTimestamp = a.updated_at || a.created_at || a.date;
                appointmentsHistory.push({
                    type: 'appointment',
                    actionDate: new Date(actionTimestamp),
                    eventDate: new Date(a.date),
                    user: a.created_by?.full_name || 'Desconocido',
                    data: a
                });
            });
        }
        appointmentsHistory.sort((a, b) => b.actionDate.getTime() - a.actionDate.getTime());

        return { leadChanges, notes, appointmentsHistory };
    }, [lead?.follow_ups, lead?.appointments, lead?.status_history]);

    const isUrgentAppointment = useMemo(() => {
        if (!activeAppointment) return false;
        const apptDate = new Date(activeAppointment.date);
        const now = new Date();
        return apptDate > now && apptDate <= new Date(now.getTime() + 48 * 60 * 60 * 1000);
    }, [activeAppointment]);

    if (!lead) return null;

    const fullName = `${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name || ''}`.trim();

    const handleDetailChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdateLead(lead.id, { [e.target.name]: e.target.value });
    };

    // [NEW] Estados para resumen inteligente del lead
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);

    const handleGenerateSummary = async () => {
        if (!lead) return;
        setIsSummarizing(true);
        try {
            const statusName = statuses.find(s => s.id === lead.status_id)?.name || 'Desconocido';
            const programName = licenciaturaMap.get(lead.program_id) || 'No especificado';
            const text = await generateLeadSummary(lead, statusName, programName);
            setSummary(text);
        } catch (error) {
            console.error(error);
            setSummary("No se pudo generar el resumen.");
        } finally {
            setIsSummarizing(false);
        }
    };

    // [NEW] Estados para resumen IA de la conversación de WhatsApp
    const [waSummary, setWaSummary] = useState<string | null>(null);
    const [isSummarizingWA, setIsSummarizingWA] = useState(false);
    const [waSummarySaved, setWaSummarySaved] = useState(false);

    const handleGenerateWASummary = async () => {
        if (!lead) return;
        setIsSummarizingWA(true);
        setWaSummary(null);
        setWaSummarySaved(false);
        try {
            // 1. Obtener mensajes de WhatsApp del lead
            const { data: waMessages, error: waError } = await supabase
                .from('whatsapp_messages')
                .select('direction, message_body, created_at')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: true });

            if (waError) throw new Error(waError.message);

            if (!waMessages || waMessages.length === 0) {
                setWaSummary('No hay mensajes de WhatsApp registrados para este prospecto.');
                return;
            }

            // 2. Construir perfil del lead para dar contexto completo a la IA
            const statusName  = statuses.find(s => s.id === lead.status_id)?.name   || 'Desconocido';
            const programName = licenciaturaMap.get(lead.program_id)                 || 'No especificado';
            const sourceName  = sourceMap.get(lead.source_id)                        || 'No especificado';

            const leadProfile = [
                '=== PERFIL DEL PROSPECTO ===',
                `Nombre:           ${lead.first_name} ${lead.paternal_last_name} ${lead.maternal_last_name ?? ''}`.trim(),
                `Programa interés: ${programName}`,
                `Estado CRM:       ${statusName}`,
                `Origen:           ${sourceName}`,
                `Teléfono:         ${lead.phone}`,
                `Email:            ${lead.email || 'No proporcionado'}`,
                `Registrado:       ${new Date(lead.registration_date).toLocaleDateString('es-MX')}`,
                '',
                '=== CONVERSACIÓN DE WHATSAPP ===',
            ].join('\n');

            // 3. Formatear los mensajes del chat como texto plano
            const messagesText = waMessages
                .map(m => {
                    const speaker = m.direction === 'outbound' ? 'Asesor' : 'Prospecto';
                    const time = new Date(m.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
                    return `[${time}] ${speaker}: ${m.message_body}`;
                })
                .join('\n');

            // Contexto completo = perfil + historial de chat
            const fullContext = `${leadProfile}\n${messagesText}`;

            // 4. Llamar a la Edge Function de IA con contexto enriquecido
            const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-ai-content', {
                body: {
                    instruction: 'Genera un breve resumen analítico de esta conversación de WhatsApp, destacando el nivel de interés del prospecto y el siguiente paso a tomar.',
                    context: fullContext,
                    systemPrompt: `Eres un analista de CRM universitario experto en ventas educativas. Tienes acceso al perfil completo del prospecto y a su conversación de WhatsApp con el asesor. Devuelve un resumen ejecutivo breve (máximo 4 líneas) que incluya: nivel de interés real, situación actual y el próximo paso más efectivo a tomar.`,
                },
            });

            if (aiError || !aiData?.content) throw new Error(aiError?.message || 'La IA no devolvió contenido.');

            setWaSummary(aiData.content);
        } catch (err: any) {
            console.error('Error generando resumen WA:', err);
            setWaSummary('No se pudo generar el resumen. Intenta de nuevo.');
        } finally {
            setIsSummarizingWA(false);
        }
    };

    const handleSaveWASummaryAsNote = () => {
        if (!waSummary || !lead) return;
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        onAddFollowUp(lead.id, {
            date: today.toISOString(),
            notes: `🤖 Resumen IA de conversación WhatsApp:\n${waSummary}`,
        });
        setWaSummarySaved(true);
    };

    if (!lead) return null;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Lead" size="2xl">
                <div className="flex flex-col h-[70vh]">



                    {/* Header del Expediente */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
                        <div className="flex items-center gap-3 w-full sm:flex-1 sm:min-w-0">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-brand-primary text-white flex-shrink-0 flex items-center justify-center text-xl sm:text-2xl font-bold shadow-md ring-2 sm:ring-4 ring-gray-50 dark:ring-slate-700">
                                {lead.first_name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight truncate" title={fullName}>
                                    {fullName}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-shrink-0">
                                        <ClockIcon className="w-3 h-3" />
                                        {new Date(lead.registration_date).toLocaleDateString()}
                                    </span>
                                    {activeAppointment && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 flex-shrink-0">
                                            <CalendarIcon className="w-3 h-3 mr-1" />
                                            <span className="hidden sm:inline">Cita Programada</span>
                                            <span className="sm:hidden">Cita</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Score AI */}
                        {(() => {
                            const score = calculateLeadScore(lead, statuses);
                            const colorClass = getScoreColor(score);
                            const label = getScoreLabel(score);
                            return (
                                <div className={`hidden sm:flex flex-col items-center px-3 py-1 rounded-lg border ${colorClass} ml-2 cursor-help`} title={getScoreBreakdown(lead, statuses)}>
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Probabilidad</span>
                                    <div className="text-lg font-bold leading-none my-0.5">{score}%</div>
                                    <span className="text-[10px] opacity-75 whitespace-nowrap">{label}</span>
                                </div>
                            );
                        })()}

                        <div className="w-full sm:w-auto flex-shrink-0">
                            <Select
                                name="status_id"
                                value={lead.status_id}
                                onChange={handleDetailChange}
                                options={statuses.map(s => ({ value: s.id, label: s.name }))}
                                className="w-full sm:w-48 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Sistema de Pestañas */}
                    <div className="flex border-b border-gray-200 dark:border-slate-700 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0 flex-shrink-0">
                        {[
                            { id: 'summary', label: 'Resumen IA', icon: <SparklesIcon className="w-4 h-4" /> },
                            { id: 'info', label: 'Información', icon: <UserIcon className="w-4 h-4" /> },
                            { id: 'activity', label: 'Historial', icon: <ListBulletIcon className="w-4 h-4" /> },
                            { id: 'appointments', label: 'Agenda', icon: <CalendarIcon className="w-4 h-4" /> },
                            { id: 'whatsapp', label: 'WhatsApp', icon: <ChatBubbleLeftRightIcon className="w-4 h-4" /> },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                            flex-shrink-0 flex items-center gap-1.5 py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                            ${activeTab === tab.id
                                        ? 'border-brand-secondary text-brand-secondary bg-blue-50/50 dark:bg-blue-900/20 rounded-t-lg'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-t-lg'
                                    }
                        `}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Contenido de las Pestañas */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 sm:pr-2 pb-8">

                        {/* TAB 0: RESUMEN IA */}
                        {activeTab === 'summary' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-6 text-center">
                                    {!summary ? (
                                        <div className="py-8">
                                            <div className="inline-flex p-3 bg-indigo-100 dark:bg-indigo-800 rounded-full text-indigo-600 dark:text-indigo-300 mb-4">
                                                <SparklesIcon className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mb-2">Resumen Inteligente de Lead</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                                Nuestra IA analizará todo el historial de seguimiento, llamadas y citas para generarte un resumen ejecutivo de la situación actual.
                                            </p>
                                            <Button
                                                onClick={handleGenerateSummary}
                                                disabled={isSummarizing}
                                                leftIcon={<SparklesIcon className="w-4 h-4" />}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-200 dark:shadow-none"
                                            >
                                                {isSummarizing ? 'Analizando Historial...' : 'Generar Resumen Ahora'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-left">
                                            <div className="flex items-center gap-2 mb-4">
                                                <SparklesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                <h4 className="font-bold text-gray-800 dark:text-white">Análisis Generado</h4>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-indigo-100 dark:border-slate-600 shadow-sm relative">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
                                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                                    {summary}
                                                </p>
                                            </div>
                                            <div className="mt-6 flex justify-center">
                                                <Button size="sm" variant="ghost" onClick={() => setSummary(null)} className="text-gray-500">
                                                    Generar Nuevo Análisis
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 1: INFORMACIÓN GENERAL */}
                        {/* TAB 1: INFORMACIÓN GENERAL */}
                        {activeTab === 'info' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 animate-fade-in content-start">
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="bg-gray-50 dark:bg-slate-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                        <h5 className="font-bold text-gray-800 dark:text-white mb-2 border-b border-gray-200 dark:border-slate-700 pb-1 text-xs sm:text-sm uppercase tracking-wide">Datos de Contacto</h5>
                                        <div className="space-y-1.5 text-xs sm:text-sm">
                                            <div className="flex flex-col sm:grid sm:grid-cols-3 sm:gap-2">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium sm:font-normal">Email:</span>
                                                <button
                                                    onClick={() => onOpenEmail && onOpenEmail(lead)}
                                                    className="text-left text-blue-600 dark:text-blue-400 hover:underline sm:col-span-2 break-all"
                                                >
                                                    {lead.email || '-'}
                                                </button>
                                            </div>
                                            <div className="flex flex-col sm:grid sm:grid-cols-3 sm:gap-2">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium sm:font-normal">Teléfono:</span>
                                                <button
                                                    onClick={() => onOpenWhatsApp && onOpenWhatsApp(lead)}
                                                    className="text-left text-blue-600 dark:text-blue-400 hover:underline sm:col-span-2"
                                                >
                                                    {lead.phone}
                                                </button>
                                            </div>
                                            <div className="flex flex-col sm:grid sm:grid-cols-3 sm:gap-2">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium sm:font-normal">Origen:</span>
                                                <span className="text-gray-900 dark:text-gray-200 sm:col-span-2">{sourceMap.get(lead.source_id)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50/50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                        <h5 className="font-bold text-blue-900 dark:text-blue-300 mb-2 border-b border-blue-200 dark:border-blue-800 pb-1 text-xs sm:text-sm uppercase tracking-wide">Interés Académico</h5>
                                        <div className="text-center py-0.5">
                                            <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-wide font-bold mb-0.5">Licenciatura</p>
                                            <p className="text-sm sm:text-base font-bold text-brand-primary dark:text-blue-200">{licenciaturaMap.get(lead.program_id)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 sm:space-y-4">
                                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                                        <h5 className="font-bold text-gray-800 dark:text-white mb-2 text-xs sm:text-sm uppercase tracking-wide">Gestión de Asignación</h5>
                                        <div className="space-y-3">
                                            <Select
                                                label="Asesor Responsable"
                                                name="advisor_id"
                                                value={lead.advisor_id}
                                                onChange={handleDetailChange}
                                                disabled={true}
                                                className="bg-gray-100 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 cursor-not-allowed text-xs sm:text-sm py-1.5"
                                                options={advisors.map(a => ({ value: a.id, label: a.full_name }))}
                                            />
                                            <Button
                                                variant="secondary"
                                                onClick={() => setTransferModalOpen(true)}
                                                className="w-full justify-center dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600 text-xs sm:text-sm py-1.5"
                                                leftIcon={<TransferIcon className="w-4 h-4" />}
                                                size="sm"
                                            >
                                                Transferir Lead
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: BITÁCORA DIVIDIDA */}
                        {activeTab === 'activity' && (
                            <div className="animate-fade-in flex flex-col space-y-4 sm:space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                    <h3 className="font-bold text-gray-800 dark:text-white text-sm sm:text-base">Bitácora de Seguimiento</h3>
                                    <Button size="sm" className="w-full sm:w-auto" leftIcon={<PlusIcon className="w-4 h-4" />} onClick={() => setFollowUpModalOpen(true)}>
                                        Agregar Nota
                                    </Button>
                                </div>

                                {/* SECCIÓN 1: NOTAS DE SEGUIMIENTO */}
                                <CollapsibleSection
                                    title="Notas de Seguimiento"
                                    icon={<DocumentTextIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                                    count={activitySections.notes.length}
                                    defaultOpen={false}
                                >
                                    <div className="space-y-4">
                                        {activitySections.notes.length > 0 ? activitySections.notes.map((item, idx) => (
                                            <div key={`note-${idx}`} className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-gray-100 dark:border-slate-600 shadow-sm hover:shadow-md transition-shadow relative pl-3 group">
                                                <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand-secondary rounded-r-md"></div>

                                                <div className="flex justify-between items-center mb-2 border-b border-gray-50 dark:border-slate-600 pb-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-300 uppercase">
                                                            {item.actionDate.toLocaleDateString()} {item.actionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">Por: <span className="text-brand-secondary font-semibold dark:text-blue-300">{item.user}</span></span>
                                                    </div>
                                                    {isAdmin && (
                                                        <button onClick={() => setFollowUpToDelete(item.data.id)} className="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                                            <TrashIcon className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold mb-2 border border-blue-100 dark:border-blue-800">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        Contacto: {item.contactDate.toLocaleDateString()}
                                                    </div>
                                                    <ExpandableText text={item.data.notes} className="text-gray-700 dark:text-gray-200 text-sm ml-1" />
                                                </div>
                                            </div>
                                        )) : <p className="text-center text-gray-400 dark:text-gray-500 text-sm italic py-2">No hay notas registradas.</p>}
                                    </div>
                                </CollapsibleSection>

                                {/* SECCIÓN 2: CAMBIOS EN LEADS */}
                                <CollapsibleSection
                                    title="Cambios en Leads"
                                    icon={<TagIcon className="w-5 h-5 text-orange-500 dark:text-orange-400" />}
                                    count={activitySections.leadChanges.length}
                                    defaultOpen={false}
                                >
                                    <div className="relative border-l-2 border-gray-200 dark:border-slate-700 ml-2 space-y-4 pb-1 pl-4">
                                        {activitySections.leadChanges.length > 0 ? activitySections.leadChanges.map((item, idx) => (
                                            <div key={`change-${idx}`} className="relative">
                                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-orange-400 border-2 border-white dark:border-slate-800 shadow-sm"></div>
                                                <div className="text-sm">
                                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        <span>{item.actionDate.toLocaleDateString()} {item.actionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="font-semibold text-brand-secondary dark:text-blue-300">{item.user}</span>
                                                    </div>

                                                    {item.type === 'status_change' ? (
                                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 p-2 rounded border border-gray-100 dark:border-slate-600">
                                                            <span className="text-gray-500 dark:text-gray-400 line-through text-xs">
                                                                {item.data.old_status_id ? statusMap.get(item.data.old_status_id)?.name : 'Inicio'}
                                                            </span>
                                                            <ArrowPathIcon className="w-3 h-3 text-orange-400" />
                                                            <span className="font-bold text-gray-800 dark:text-white">
                                                                {statusMap.get(item.data.new_status_id)?.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 p-2 rounded border border-blue-100 dark:border-blue-800 text-xs">
                                                            <strong>Transferencia:</strong> {item.data.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )) : <p className="text-gray-400 dark:text-gray-500 text-xs italic">Sin cambios de estado.</p>}
                                    </div>
                                </CollapsibleSection>

                                {/* SECCIÓN 3: HISTÓRICO DE CITAS */}
                                <CollapsibleSection
                                    title="Histórico de Citas"
                                    icon={<CalendarIcon className="w-5 h-5 text-purple-500 dark:text-purple-400" />}
                                    count={activitySections.appointmentsHistory.length}
                                    defaultOpen={false}
                                >
                                    <div className="space-y-3">
                                        {activitySections.appointmentsHistory.length > 0 ? activitySections.appointmentsHistory.map((item, idx) => (
                                            <div key={`appt-${idx}`} className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-gray-100 dark:border-slate-600 shadow-sm flex flex-col gap-2">
                                                <div className="flex justify-between items-start border-b border-gray-50 dark:border-slate-600 pb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-300 uppercase">
                                                            {item.actionDate.toLocaleDateString()} {item.actionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">Por: <span className="text-brand-secondary font-semibold dark:text-blue-300">{item.user}</span></span>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.data.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : (item.data.status === 'canceled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300')}`}>
                                                        {item.data.status === 'completed' ? 'Completada' : (item.data.status === 'canceled' ? 'Cancelada' : 'Programada')}
                                                    </span>
                                                </div>

                                                <div>
                                                    <p className="font-bold text-gray-800 dark:text-white text-sm mb-1">{item.data.title}</p>
                                                    <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded text-xs text-purple-900 dark:text-purple-200 mb-2 border border-purple-100 dark:border-purple-800 inline-block w-full sm:w-auto">
                                                        📅 <strong>Fecha Cita:</strong> {item.eventDate?.toLocaleDateString()} a las {item.eventDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 italic border-l-2 border-gray-200 dark:border-slate-600 pl-2">{item.data.details}</p>
                                                </div>
                                            </div>
                                        )) : <p className="text-gray-400 dark:text-gray-500 text-xs italic text-center py-2">No hay historial de citas.</p>}
                                    </div>
                                </CollapsibleSection>
                            </div>
                        )}

                        {/* TAB 3: AGENDA Y CITAS (WIDGET PRINCIPAL) */}
                        {/* TAB 3: AGENDA Y CITAS (WIDGET PRINCIPAL) */}
                        {activeTab === 'appointments' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 dark:text-white text-base">Agenda de Citas</h3>
                                    <Button size="sm" onClick={() => { setEditingAppointment(null); setAppointmentModalOpen(true); }} leftIcon={<PlusIcon className="w-4 h-4" />}>
                                        Programar Nueva Cita
                                    </Button>
                                </div>

                                <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-x-auto shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hora</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Título / Detalles</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                            {lead.appointments && lead.appointments.length > 0 ? (
                                                [...lead.appointments]
                                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                    .map((appt) => {
                                                        const apptDate = new Date(appt.date);
                                                        const isCompleted = appt.status === 'completed';
                                                        const isCanceled = appt.status === 'canceled';
                                                        const statusLabel = isCompleted ? 'Completada' : (isCanceled ? 'Cancelada' : 'Agendada');
                                                        const statusColor = isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                            (isCanceled ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300');

                                                        return (
                                                            <tr key={appt.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                                    {apptDate.toLocaleDateString()}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                                    {apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                                    <div className="font-medium text-gray-900 dark:text-gray-200">{appt.title}</div>
                                                                    <div className="text-xs truncate max-w-xs">{appt.details || '-'}</div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                                                                        {statusLabel}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <div className="flex justify-end gap-2">
                                                                        {appt.status === 'scheduled' && (
                                                                            <button
                                                                                onClick={() => onUpdateAppointmentStatus(lead.id, appt.id, 'completed')}
                                                                                className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                                                                                title="Marcar completada"
                                                                            >
                                                                                <CheckCircleIcon className="w-5 h-5" />
                                                                            </button>
                                                                        )}

                                                                        {appt.status !== 'canceled' && appt.status !== 'completed' && (appt.status === 'scheduled' || isAdmin) && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingAppointment(appt);
                                                                                    setAppointmentModalOpen(true);
                                                                                }}
                                                                                className="text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400"
                                                                                title="Editar"
                                                                            >
                                                                                <PencilIcon className="w-5 h-5" />
                                                                            </button>
                                                                        )}

                                                                        {appt.status !== 'canceled' && appt.status !== 'completed' && (
                                                                            <button
                                                                                onClick={() => setAppointmentToDelete(appt.id)}
                                                                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                                                title="Eliminar"
                                                                            >
                                                                                <TrashIcon className="w-5 h-5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                                                        <p>No hay citas registradas.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: WHATSAPP EN TIEMPO REAL */}
                        {activeTab === 'whatsapp' && (
                            <div className="animate-fade-in space-y-4">

                                {/* Botón de Resumen IA de la conversación */}
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-xl p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-green-800 dark:text-green-300">Análisis IA de la conversación</p>
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">La IA leerá todos los mensajes y generará un resumen ejecutivo del estado del prospecto.</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={handleGenerateWASummary}
                                            disabled={isSummarizingWA}
                                            leftIcon={<SparklesIcon className="w-4 h-4" />}
                                            className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white border-none shadow-md shadow-green-200 dark:shadow-none"
                                        >
                                            {isSummarizingWA ? 'Analizando...' : 'Generar Resumen'}
                                        </Button>
                                    </div>

                                    {/* Resultado del resumen */}
                                    {waSummary && (
                                        <div className="mt-4 animate-fade-in">
                                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-800 p-4 relative shadow-sm">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-green-500 rounded-l-lg" />
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed pl-2">
                                                    {waSummary}
                                                </p>
                                            </div>
                                            <div className="mt-3 flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => { setWaSummary(null); setWaSummarySaved(false); }}
                                                    className="text-gray-500"
                                                >
                                                    Descartar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={handleSaveWASummaryAsNote}
                                                    disabled={waSummarySaved}
                                                    leftIcon={waSummarySaved ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <PlusIcon className="w-4 h-4" />}
                                                >
                                                    {waSummarySaved ? 'Guardado en Historial' : 'Guardar como Nota'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chat en tiempo real */}
                                <WhatsAppChat
                                    leadId={lead.id}
                                    phone={lead.phone}
                                    lead={lead}
                                    licenciaturas={licenciaturas}
                                />

                            </div>
                        )}

                    </div>
                </div>
            </Modal>

            {/* MODALES AUXILIARES */}
            <ConfirmationModal
                isOpen={isCancelConfirmOpen}
                onClose={() => setCancelConfirmOpen(false)}
                onConfirm={() => {
                    if (activeAppointment) onUpdateAppointmentStatus(lead.id, activeAppointment.id, 'canceled');
                }}
                title="Cancelar Cita"
                message="¿Confirmas que deseas cancelar esta cita? Quedará registrada en el historial como cancelada."
                confirmButtonVariant="danger"
            />

            <ConfirmationModal
                isOpen={!!followUpToDelete}
                onClose={() => setFollowUpToDelete(null)}
                onConfirm={() => {
                    if (followUpToDelete) {
                        onDeleteFollowUp(lead.id, followUpToDelete);
                        setFollowUpToDelete(null);
                    }
                }}
                title="¿Eliminar Nota?"
                message="Esta acción no se puede deshacer. ¿Seguro que deseas eliminar esta nota de seguimiento?"
                confirmButtonVariant="danger"
            />



            {/* Modal de Confirmación para eliminar cita */}
            <ConfirmationModal
                isOpen={!!appointmentToDelete}
                onClose={() => setAppointmentToDelete(null)}
                onConfirm={() => {
                    if (appointmentToDelete) {
                        onDeleteAppointment(lead.id, appointmentToDelete);
                        setAppointmentToDelete(null);
                    }
                }}
                title="Eliminar Cita"
                message="¿Estás seguro de que deseas eliminar esta cita? Se registrará en el historial como eliminada."
                confirmButtonText="Eliminar"
                cancelButtonText="Cancelar"
                confirmButtonVariant="danger"
            />

            {
                isAppointmentModalOpen && (
                    <AppointmentFormModal
                        isOpen={isAppointmentModalOpen}
                        onClose={() => { setEditingAppointment(null); setAppointmentModalOpen(false); }}
                        lead={lead}
                        appointment={editingAppointment || undefined} // [FIX] Use editingAppointment
                        existingAppointments={lead.appointments || []}
                        canDelete={isAdmin}
                        onSave={(data) => onSaveAppointment(lead.id, data, editingAppointment?.id)}
                        onDelete={() => {
                            if (editingAppointment) {
                                setAppointmentModalOpen(false);
                                setAppointmentToDelete(editingAppointment.id);
                            }
                        }}
                    />
                )
            }

            {
                isFollowUpModalOpen && (
                    <FollowUpFormModal
                        isOpen={isFollowUpModalOpen}
                        onClose={() => setFollowUpModalOpen(false)}
                        onSave={(data) => {
                            const [year, month, day] = data.date.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day);
                            localDate.setHours(12, 0, 0, 0);

                            onAddFollowUp(lead.id, {
                                date: localDate.toISOString(),
                                notes: data.notes
                            });
                            setFollowUpModalOpen(false);
                        }}
                    />
                )
            }

            {
                isTransferModalOpen && (
                    <TransferLeadModal
                        isOpen={isTransferModalOpen}
                        onClose={() => setTransferModalOpen(false)}
                        onTransfer={(newAdvisorId, reason) => onTransferLead(lead.id, newAdvisorId, reason)}
                        advisors={advisors}
                        currentAdvisorId={lead.advisor_id}
                    />
                )
            }
        </>
    );
};

export default LeadDetailModal;