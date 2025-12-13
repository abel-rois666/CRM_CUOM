// components/BulkMessageModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select } from './common/FormElements';
import { Lead, WhatsAppTemplate, EmailTemplate, Profile } from '../types'; // Importar Profile
import { supabase } from '../lib/supabase';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArrowRightIcon from './icons/ChevronRightIcon';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import EmailEditorWrapper, { EmailEditorHandle } from './EmailEditorWrapper'; // Importar Wrapper

interface BulkMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'whatsapp' | 'email';
    leads: Lead[];
    whatsappTemplates: WhatsAppTemplate[];
    emailTemplates: EmailTemplate[];
    onComplete: () => void;
    currentUser: Profile | null; // NUEVA PROP
}

const BulkMessageModal: React.FC<BulkMessageModalProps> = ({
    isOpen,
    onClose,
    mode,
    leads,
    whatsappTemplates,
    emailTemplates,
    onComplete,
    currentUser // Recibir prop
}) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());
    const [emailBody, setEmailBody] = useState('');
    const [sendingId, setSendingId] = useState<string | null>(null);

    // Editor State
    const [editorMode, setEditorMode] = useState<'simple' | 'advanced'>('simple');
    const emailEditorRef = React.useRef<EmailEditorHandle>(null);

    useEffect(() => {
        if (isOpen) {
            setSentIds(new Set());
            setSelectedTemplateId('');
            setEmailBody('');
            setSendingId(null);
        }
    }, [isOpen]);

    // Cargar cuerpo del email al seleccionar plantilla
    useEffect(() => {
        if (selectedTemplateId && mode === 'email') {
            const temp = emailTemplates.find(t => t.id === selectedTemplateId);
            if (temp) {
                setEmailBody(temp.body);
                // Note: We don't automatically push to Unlayer default design yet but we could if we parsed HTML
            }
        }
    }, [selectedTemplateId, mode, emailTemplates]);

    const getTemplateOptions = () => {
        if (mode === 'whatsapp') return whatsappTemplates.map(t => ({ value: t.id, label: t.name }));
        return emailTemplates.map(t => ({ value: t.id, label: t.name }));
    };

    const getCurrentTemplate = () => {
        if (mode === 'whatsapp') return whatsappTemplates.find(t => t.id === selectedTemplateId);
        return emailTemplates.find(t => t.id === selectedTemplateId);
    };

    const cleanPhoneNumber = (phone: string) => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) cleaned = `52${cleaned}`;
        return cleaned;
    };

    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const processText = (text: string, lead: Lead) => {
        return text
            .replace(/{nombre}/g, lead.first_name)
            .replace(/{apellido}/g, lead.paternal_last_name);
    };

    const handleSend = async (lead: Lead) => {
        const template = getCurrentTemplate();
        if (!template) return;

        setSendingId(lead.id);

        try {
            // 1. WhatsApp: Comportamiento original
            if (mode === 'whatsapp') {
                const waTemplate = template as WhatsAppTemplate;
                const message = processText(waTemplate.content, lead);
                const phone = cleanPhoneNumber(lead.phone);
                const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');

                // Registrar en bitácora localmente para WhatsApp
                await supabase.from('follow_ups').insert({
                    lead_id: lead.id,
                    notes: `📱 WhatsApp Masivo enviado: ${template.name}`,
                    date: new Date().toISOString(),
                    // @ts-ignore
                    created_by: currentUser?.id
                });

                setSentIds(prev => new Set(prev).add(lead.id));
            }
            // 2. Email: Usar Edge Function + Mailrelay
            else {
                const emailTemplate = template as EmailTemplate;
                const subject = processText(emailTemplate.subject, lead);

                let finalHtml = '';
                if (editorMode === 'simple') {
                    finalHtml = processText(emailBody, lead);
                } else {
                    // Advanced Mode: Export from Unlayer
                    if (emailEditorRef.current) {
                        const rawHtml = await emailEditorRef.current.exportHtml();
                        // Unlayer produces full HTML, we still want to replace variables
                        finalHtml = processText(rawHtml, lead);
                    } else {
                        throw new Error("El editor de diseño no está listo.");
                    }
                }

                if (!lead.email) {
                    throw new Error("El lead no tiene email registrado.");
                }

                const { data, error } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: [{ name: `${lead.first_name} ${lead.paternal_last_name}`, email: lead.email }],
                        subject: subject,
                        html_content: finalHtml
                    }
                });

                if (error) throw error;
                if (data && data.error) throw new Error(data.error);

                // Registrar en bitácora
                await supabase.from('follow_ups').insert({
                    lead_id: lead.id,
                    notes: `✉️ Correo Masivo enviado: ${template.name}`,
                    date: new Date().toISOString(),
                    // @ts-ignore
                    created_by: currentUser?.id
                });

                setSentIds(prev => new Set(prev).add(lead.id));
            }
        } catch (error: any) {
            console.error('Error al enviar:', error);
            alert(`Error al enviar a ${lead.first_name}: ${error.message || 'Error desconocido'}`);
        } finally {
            setSendingId(null);
        }
    };

    const template = getCurrentTemplate();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'whatsapp' ? 'Envío Masivo de WhatsApp' : 'Envío Masivo de Correos'}
            size="full"
        >
            <div className="flex flex-col h-[85vh]">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">

                    {/* COLUMNA IZQUIERDA: Configuración y Editor (2/3) */}
                    <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">

                        {/* Área de Edición / Previsualización (Ahora incluye el selector) */}
                        <div className="flex-1 flex flex-col border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden shadow-sm h-full">
                            <div className="bg-gray-100 dark:bg-slate-700 px-4 py-3 border-b border-gray-200 dark:border-slate-600 flex flex-wrap gap-4 justify-between items-center shrink-0">

                                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap hidden sm:block">
                                        Mensaje
                                    </h4>
                                    <div className="flex-1 max-w-sm">
                                        <Select
                                            label=""
                                            value={selectedTemplateId}
                                            onChange={e => setSelectedTemplateId(e.target.value)}
                                            options={getTemplateOptions()}
                                            placeholder="-- Selecciona Plantilla --"
                                        />
                                    </div>
                                </div>

                                {mode === 'email' && template && (
                                    <div className="flex bg-gray-200 dark:bg-slate-600 rounded-lg p-1 text-xs shrink-0">
                                        <button
                                            onClick={() => setEditorMode('simple')}
                                            className={`px-3 py-1 rounded-md transition-all ${editorMode === 'simple' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-500 dark:text-gray-300'}`}
                                        >
                                            Básico
                                        </button>
                                        <button
                                            onClick={() => setEditorMode('advanced')}
                                            className={`px-3 py-1 rounded-md transition-all ${editorMode === 'advanced' ? 'bg-white text-purple-600 shadow-sm font-bold' : 'text-gray-500 dark:text-gray-300'}`}
                                        >
                                            Pro
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 bg-white dark:bg-slate-800 p-0 relative h-full">
                                {template ? (
                                    mode === 'email' ? (
                                        <div className="h-full flex flex-col relative">
                                            {editorMode === 'simple' ? (
                                                <>
                                                    <ReactQuill
                                                        theme="snow"
                                                        value={emailBody}
                                                        onChange={setEmailBody}
                                                        modules={{
                                                            toolbar: [
                                                                [{ 'header': [1, 2, 3, false] }],
                                                                ['bold', 'italic', 'underline', 'link'],
                                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                                [{ 'color': [] }, { 'background': [] }],
                                                                ['clean']
                                                            ]
                                                        }}
                                                        className="bg-white text-gray-800 h-full flex flex-col ql-container-flex"
                                                    />
                                                    <div className="absolute bottom-1 right-2 z-10 opacity-70 hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] bg-gray-100 border px-2 py-1 rounded text-gray-500">
                                                            Variables: {"{nombre}"}, {"{apellido}"}
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="h-full bg-slate-50 overflow-hidden relative">
                                                    <EmailEditorWrapper
                                                        ref={emailEditorRef}
                                                        style={{ height: '100%', width: '100%' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 italic text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                            {processText((template as WhatsAppTemplate).content, { first_name: 'Ejemplo', paternal_last_name: 'Lead' } as Lead)}
                                        </div>
                                    )
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                        <p>Selecciona una plantilla para ver el editor</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* COLUMNA DERECHA: Lista de Destinatarios (1/3) */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl flex flex-col shadow-sm h-full min-h-0">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 rounded-t-xl flex justify-between items-center">
                            <h4 className="font-bold text-gray-700 dark:text-gray-200 text-sm">Destinatarios</h4>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                                {leads.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {leads.map(lead => {
                                const isSent = sentIds.has(lead.id);
                                const isSending = sendingId === lead.id;
                                const contactInfo = mode === 'whatsapp' ? lead.phone : lead.email;
                                const isValid = !!contactInfo;

                                return (
                                    <div key={lead.id} className={`p-3 rounded-lg border text-sm transition-all ${isSent ? 'bg-green-50 border-green-200' : 'bg-white hover:border-blue-300 border-gray-100'} dark:bg-slate-800 dark:border-slate-700`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">
                                                {lead.first_name} {lead.paternal_last_name}
                                            </span>
                                            {isSent && <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />}
                                        </div>

                                        <div className="text-xs text-gray-500 truncate mb-2 font-mono">
                                            {contactInfo || <span className="text-red-400">Sin contacto</span>}
                                        </div>

                                        <div className="flex justify-end">
                                            {!isSent && (
                                                <Button
                                                    size="sm"
                                                    disabled={!isValid || !selectedTemplateId || isSending}
                                                    onClick={() => handleSend(lead)}
                                                    className={mode === 'whatsapp' ? 'w-full justify-center bg-green-600 hover:bg-green-700 text-white' : 'w-full justify-center bg-blue-600 hover:bg-blue-700 text-white'}
                                                >
                                                    {isSending ? 'Enviando...' : 'Enviar'}
                                                    {!isSending && <ArrowRightIcon className="w-3 h-3 ml-1" />}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>

                <div className="mt-4 flex justify-end pt-4 border-t border-gray-100 dark:border-slate-700 gap-2">
                    <p className="text-xs text-gray-400 self-center mr-auto">
                        * Los envíos de correo pueden tardar unos segundos. Revisa la consola si hay errores.
                    </p>
                    <Button variant="ghost" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default BulkMessageModal;