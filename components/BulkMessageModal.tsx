// components/BulkMessageModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select } from './common/FormElements';
import { Lead, WhatsAppTemplate, EmailTemplate, Profile, Licenciatura } from '../types';
import { supabase } from '../lib/supabase';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArrowRightIcon from './icons/ChevronRightIcon';
import EmailTemplateEditor, { EmailTemplateEditorHandle } from './common/EmailTemplateEditor'; // [FIX] Use Reusable Editor
import PlayIcon from './icons/PlayButtonIcon'; // [FIX] Renamed to avoid ghost file specific error
import StopIcon from './icons/PauseIcon'; // Assuming you have this or use text
import ExclamationCircleIcon from './icons/ExclamationCircleIcon'; // For errors
import SparklesIcon from './icons/SparklesIcon'; // [NEW] AI Icon
import { Input } from './common/FormElements'; // [NEW] Input for AI extra instructions
import { generateMessage } from '../utils/aiAssistant'; // [NEW] AI Function

// [TODO: Ensure these icons exist or use generic replacement if strictly necessary, but sticking to standard set]

interface BulkMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'whatsapp' | 'email';
    leads: Lead[];
    whatsappTemplates: WhatsAppTemplate[];
    emailTemplates: EmailTemplate[];
    licenciaturas: Licenciatura[]; // [NEW] Catalog for resolving names
    onComplete: () => void;
    currentUser: Profile | null;
}

const BulkMessageModal: React.FC<BulkMessageModalProps> = ({
    isOpen,
    onClose,
    mode,
    leads,
    whatsappTemplates,
    emailTemplates,
    licenciaturas,
    onComplete,
    currentUser
}) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());
    const [failedIds, setFailedIds] = useState<Set<string>>(new Set()); // New: Track failures
    const [sendingId, setSendingId] = useState<string | null>(null);

    // Bulk Send State
    const [isSendingAll, setIsSendingAll] = useState(false);
    const shouldStopRef = useRef(false);

    // Summary View State
    const [showSummary, setShowSummary] = useState(false);
    const [summaryStats, setSummaryStats] = useState({ sent: 0, failed: 0 });

    // AI & Custom Content State
    const [extraInstructions, setExtraInstructions] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Editor State
    const [editorMode, setEditorMode] = useState<'basic' | 'pro'>('basic');
    const [initialHtml, setInitialHtml] = useState('');
    const [initialDesign, setInitialDesign] = useState<any>(null);
    const editorRef = useRef<EmailTemplateEditorHandle>(null);

    useEffect(() => {
        if (isOpen) {
            setSentIds(new Set());
            setFailedIds(new Set());
            setSelectedTemplateId('');
            setInitialHtml('');
            setInitialDesign(null);
            setEditorMode('basic');
            setSendingId(null);
            setIsSendingAll(false);
            shouldStopRef.current = false;
            setShowSummary(false);
            setSummaryStats({ sent: 0, failed: 0 });
        }
    }, [isOpen]);

    // Cargar cuerpo y diseño del email al seleccionar plantilla
    useEffect(() => {
        if (selectedTemplateId === 'blank') {
            setInitialHtml('');
            setInitialDesign(null);
            setEditorMode('basic');
            if (editorRef.current) editorRef.current.setHtml('');
            return;
        }

        if (selectedTemplateId && mode === 'email') {
            const temp = emailTemplates.find(t => t.id === selectedTemplateId);
            if (temp) {
                setInitialHtml(temp.body || '');
                setInitialDesign(temp.design_json || null);

                // [FIX] Auto-switch mode based on design existence
                const newMode = temp.design_json ? 'pro' : 'basic';
                setEditorMode(newMode);

                // Force load design if needed
                if (editorRef.current && newMode === 'pro' && temp.design_json) {
                    editorRef.current.loadDesign(temp.design_json);
                }
            }
        }
    }, [selectedTemplateId, mode, emailTemplates]);

    // [NEW] AI Generation Logic
    const handleAiGenerate = async () => {
        if (leads.length === 0) return;
        setIsGenerating(true);
        try {
            // Use the first lead as a reference context
            const refLead = leads[0];
            const programName = licenciaturas.find(l => l.id === refLead.program_id)?.name || 'su programa de interés';

            const context = `
            Estás generando un mensaje para UN ENVÍO MASIVO a ${leads.length} personas.
            Programa de interés típico: ${programName}.
            Estatus típico: ${refLead.status_id}.
            `;

            // CRITICAL: Instruction to use placeholders
            const placeholderInstruction = `
            IMPORTANTE: No uses el nombre real del alumno de referencia.
            Usa EXACTAMENTE el placeholder "{nombre}" (con llaves) donde deba ir el nombre del destinatario.
            Ejemplo: "Hola {nombre}, te escribimos para..."
            El mensaje debe ser genérico pero cálido, aplicable a todos.
            ${extraInstructions}
            `;

            const text = await generateMessage(refLead, context, mode, placeholderInstruction);

            if (mode === 'email') {
                if (editorRef.current) {
                    if (editorMode === 'pro') {
                        // Create a valid Unlayer design with the AI text
                        // FIX: Added 'cells' and default 'values' to prevent 'reduce' error
                        const design = {
                            "body": {
                                "rows": [
                                    {
                                        "cells": [1],
                                        "columns": [
                                            {
                                                "contents": [
                                                    {
                                                        "type": "text",
                                                        "values": {
                                                            "text": text, // The AI content
                                                            "lineHeight": "140%",
                                                            "fontSize": "16px",
                                                            "textAlign": "left",
                                                            "color": "#000000"
                                                        }
                                                    }
                                                ],
                                                "values": {
                                                    "backgroundColor": "",
                                                    "padding": "0px",
                                                    "border": {},
                                                    "_meta": {
                                                        "htmlID": "",
                                                        "htmlClassNames": ""
                                                    }
                                                }
                                            }
                                        ],
                                        "values": {
                                            "displayCondition": null,
                                            "columns": false,
                                            "backgroundColor": "",
                                            "columnsBackgroundColor": "",
                                            "backgroundImage": {
                                                "url": "",
                                                "fullWidth": true,
                                                "repeat": "no-repeat",
                                                "size": "custom",
                                                "position": "center"
                                            },
                                            "padding": "20px 0px",
                                            "anchor": "",
                                            "hideDesktop": false,
                                            "_meta": {
                                                "htmlID": "",
                                                "htmlClassNames": ""
                                            }
                                        }
                                    }
                                ],
                                "values": {
                                    "textColor": "#000000",
                                    "backgroundColor": "#F7F8F9",
                                    "backgroundImage": {
                                        "url": "",
                                        "fullWidth": true,
                                        "repeat": "no-repeat",
                                        "size": "custom",
                                        "position": "center"
                                    },
                                    "contentWidth": "600px",
                                    "contentAlign": "center",
                                    "fontFamily": {
                                        "label": "Arial",
                                        "value": "arial,helvetica,sans-serif"
                                    },
                                    "preheaderText": "",
                                    "linkStyle": {
                                        "body": true,
                                        "linkColor": "#0000ee",
                                        "linkHoverColor": "#0000ee",
                                        "linkUnderline": true,
                                        "linkHoverUnderline": true
                                    },
                                    "_meta": {
                                        "htmlID": "",
                                        "htmlClassNames": ""
                                    }
                                }
                            }
                        };
                        // @ts-ignore
                        editorRef.current.loadDesign(design);
                    } else {
                        editorRef.current.setHtml(text);
                    }
                    // Also update initialHtml to keep sync
                    setInitialHtml(text);
                }
            } else {
                // For WhatsApp, we use initialHtml as the state for the custom message (when 'blank' is selected)
                setInitialHtml(text);
            }

        } catch (error) {
            console.error(error);
            alert("Error al generar con IA");
        } finally {
            setIsGenerating(false);
        }
    };

    const getTemplateOptions = () => {
        let options = [];
        // [NEW] Add "Blank / Create New" option first
        options.push({ value: 'blank', label: '✨ + Redactar desde cero / Nuevo' });

        if (mode === 'whatsapp') {
            options = [...options, ...whatsappTemplates.map(t => ({ value: t.id, label: t.name }))];
        } else {
            options = [...options, ...emailTemplates.map(t => ({ value: t.id, label: t.name }))];
        }
        return options;
    };

    const getCurrentTemplate = () => {
        if (selectedTemplateId === 'blank') {
            // Return a dummy template object so the UI thinks we have one selected
            return {
                id: 'blank',
                name: 'Nuevo Mensaje',
                subject: '', // User will edit this in editor if email
                body: '',
                content: '' // For WhatsApp
            };
        }
        if (mode === 'whatsapp') return whatsappTemplates.find(t => t.id === selectedTemplateId);
        return emailTemplates.find(t => t.id === selectedTemplateId);
    };

    const cleanPhoneNumber = (phone: string) => {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) cleaned = `52${cleaned}`;
        return cleaned;
    };

    const processText = (text: string, lead: Lead) => {
        return text
            .replace(/{nombre}/g, lead.first_name)
            .replace(/{apellido}/g, lead.paternal_last_name);
    };

    const handleSend = async (lead: Lead, suppressAlerts = false) => {
        const template = getCurrentTemplate();
        if (!template) return false;

        setSendingId(lead.id);

        try {
            // 1. WhatsApp
            if (mode === 'whatsapp') {
                let message = '';
                if (selectedTemplateId === 'blank') {
                    // Use custom message state
                    message = processText(initialHtml, lead);
                } else {
                    const waTemplate = template as WhatsAppTemplate;
                    message = processText(waTemplate.content, lead);
                }

                if (!message.trim()) throw new Error("Mensaje vacío");
                const phone = cleanPhoneNumber(lead.phone);
                const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

                // For bulk sending, window.open might be blocked if not direct user action
                // But since we are inside an async loop initiated by user, it *might* work in some browsers,
                // mostly it will stick to popups. WhatsApp bulk via web is tricky. 
                // However, for single clicks it works. For "Send All", WhatsApp Web API doesn't support background sending.
                // It opens a tab. Opening 50 tabs is bad. 
                // If mode is WhatsApp, "Send All" is dangerous/annoying UX (50 tabs).
                // LIMITATION: "Send All" is best for Email. For WhatsApp might need a pause or manual confirmation.
                // We will proceed for now, but user should know.

                const newWindow = window.open(url, '_blank');
                if (!newWindow && !suppressAlerts) {
                    alert("El navegador bloqueó la ventana emergente de WhatsApp.");
                    throw new Error("Popup blocked");
                }

                await (supabase as any).from('follow_ups').insert({
                    lead_id: lead.id,
                    notes: `📱 WhatsApp Masivo enviado: ${template.name}`,
                    date: new Date().toISOString(),
                    // @ts-ignore
                    created_by: currentUser?.id
                });

                setSentIds(prev => new Set(prev).add(lead.id));
                setFailedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(lead.id); // Remove from failed if success
                    return newSet;
                });
                return true;
            }
            // 2. Email
            else {
                const emailTemplate = template as EmailTemplate;
                const subject = processText(emailTemplate.subject, lead);

                // [FIX] Use getValues from shared editor
                // Design values logic is tricky inside a loop if we query the editor every time.
                // Optimization: Get HTML *once* before loop if possible. 
                // But `processText` needs raw HTML.
                // `handleSend` gets current value. That's fine.
                if (!editorRef.current) throw new Error("Editor no inicializado");

                // Warning: getting values from editor on every iteration is slow?
                // Unlayer getValues is async.

                // Optimization: IF handleSend is called from SendAll, maybe pass the HTML?
                // For now, keep it simple.
                const { html } = await editorRef.current.getValues();
                const finalHtml = processText(html, lead);

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

                await (supabase as any).from('follow_ups').insert({
                    lead_id: lead.id,
                    notes: `✉️ Correo Masivo enviado: ${template.name}`,
                    date: new Date().toISOString(),
                    // @ts-ignore
                    created_by: currentUser?.id
                });

                setSentIds(prev => new Set(prev).add(lead.id));
                setFailedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(lead.id);
                    return newSet;
                });
                return true;
            }
        } catch (error: any) {
            console.error('Error al enviar:', error);
            setFailedIds(prev => new Set(prev).add(lead.id)); // Mark as failed
            if (!suppressAlerts) {
                alert(`Error al enviar a ${lead.first_name}: ${error.message || 'Error desconocido'}`);
            }
            return false;
        } finally {
            setSendingId(null);
        }
    };

    const handleSendAll = async () => {
        const template = getCurrentTemplate();
        if (!template) return;

        // Validation for WhatsApp: Warn about tabs
        if (mode === 'whatsapp') {
            const confirm = window.confirm("⚠️ ¿Estás seguro? Para WhatsApp, esto abrirá una nueva pestaña por cada contacto. Asegúrate de tener los popups habilitados. ¿Continuar?");
            if (!confirm) return;
        }

        // Capture HTML content ONCE for efficiency if Email mode 
        // (Actually handleSend queries editor... let's stick to reuse handleSend for reliability first)

        const leadsToSend = leads.filter(lead => {
            const hasContact = mode === 'whatsapp' ? lead.phone : lead.email;
            return !sentIds.has(lead.id) && hasContact;
        });

        if (leadsToSend.length === 0) {
            alert("No hay destinatarios pendientes válidos.");
            return;
        }

        setIsSendingAll(true);
        shouldStopRef.current = false;

        // Browser close protection
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'El envío está en curso. ¿Seguro que quieres salir?';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        let successCount = 0;
        let failCount = 0;

        for (const lead of leadsToSend) {
            if (shouldStopRef.current) break;

            // Wait a bit to prevent UI freeze and give user chance to stop
            // Also helps with API rate limits
            await new Promise(r => setTimeout(r, mode === 'whatsapp' ? 1000 : 500));

            if (shouldStopRef.current) break;

            const success = await handleSend(lead, true); // suppressAlerts = true
            if (success) successCount++;
            else failCount++;
        }

        setIsSendingAll(false);
        window.removeEventListener('beforeunload', handleBeforeUnload);

        if (!shouldStopRef.current) {
            // Finished naturally
            setSummaryStats({ sent: successCount, failed: failCount });
            setShowSummary(true);
        } else {
            // Stopped manually
            setSummaryStats({ sent: successCount, failed: failCount });
            setShowSummary(true);
        }
    };

    const stopSending = () => {
        shouldStopRef.current = true;
    };

    const template = getCurrentTemplate();
    const leadsPending = leads.filter(l => !sentIds.has(l.id) && (mode === 'whatsapp' ? l.phone : l.email));

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (isSendingAll) {
                    if (window.confirm("El envío está en curso. ¿Quieres detenerlo y cerrar?")) {
                        stopSending();
                        onClose();
                    }
                } else {
                    onClose();
                }
            }}
            title={mode === 'whatsapp' ? 'Envío Masivo de WhatsApp' : 'Envío Masivo de Correos'}
            size="full"
        >
            {showSummary ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CheckCircleIcon className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {shouldStopRef.current ? 'Envío Detenido' : '¡Envío Completado!'}
                    </h3>
                    <p className="text-gray-500 max-w-md">
                        El proceso ha finalizado. Aquí tienes el resumen de la operación.
                    </p>

                    <div className="grid grid-cols-2 gap-8 w-full max-w-md mt-6">
                        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-800">
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">Enviados</p>
                            <p className="text-4xl font-extrabold text-green-700 dark:text-green-300">{summaryStats.sent}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-800">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Fallidos</p>
                            <p className="text-4xl font-extrabold text-red-700 dark:text-red-300">{summaryStats.failed}</p>
                        </div>
                    </div>

                    <div className="pt-8">
                        <Button variant="primary" size="lg" onClick={onClose}>
                            Cerrar y Finalizar
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-[85vh]">

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">

                        {/* COLUMNA IZQUIERDA: Configuración y Editor (2/3) */}
                        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">

                            {/* Área de Edición / Previsualización */}
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
                                                disabled={isSendingAll}
                                            />
                                        </div>
                                    </div>

                                    {/* [NEW] AI Controls */}
                                    {template && (
                                        <div className="flex items-end gap-2 flex-1 min-w-[250px]">
                                            <div className="flex-grow">
                                                <Input
                                                    value={extraInstructions}
                                                    onChange={(e) => setExtraInstructions(e.target.value)}
                                                    placeholder="Ej: Ofrecer 10% de beca, URGE..."
                                                    className="h-9 text-xs"
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={handleAiGenerate}
                                                disabled={isGenerating || isSendingAll}
                                                className={`bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm border-none ${isGenerating ? 'opacity-50' : ''}`}
                                            >
                                                <SparklesIcon className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                                                {isGenerating ? '...' : 'IA'}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 bg-white dark:bg-slate-800 p-0 relative h-full">
                                    {template ? (
                                        mode === 'email' ? (
                                            <div className="h-full flex flex-col relative">
                                                {isSendingAll && (
                                                    <div className="absolute inset-0 z-50 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center backdrop-blur-sm">
                                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 text-center animate-pulse">
                                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Enviando masivamente...</h3>
                                                            <p className="text-gray-500 dark:text-gray-400">Por favor, no cierres esta ventana.</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <EmailTemplateEditor
                                                    ref={editorRef}
                                                    initialHtml={initialHtml}
                                                    initialDesign={initialDesign}
                                                    initialMode={editorMode}
                                                    onChangeMode={setEditorMode}
                                                />
                                            </div>
                                        ) : (
                                            <div className="p-4 h-full">
                                                {selectedTemplateId === 'blank' ? (
                                                    <textarea
                                                        className="w-full h-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none font-sans text-sm"
                                                        placeholder="Escribe tu mensaje de WhatsApp aquí... Usa {nombre} para personalizar."
                                                        // We need state for this. For now let's reuse initialHtml as a hack or add 'customMessage' state.
                                                        // Reusing initialHtml for simplicity as 'customMessage' 
                                                        value={initialHtml}
                                                        onChange={(e) => setInitialHtml(e.target.value)}
                                                    />
                                                ) : (
                                                    <div className="italic text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                                                        {processText((template as WhatsAppTemplate).content, { first_name: 'Ejemplo', paternal_last_name: 'Lead' } as Lead)}
                                                    </div>
                                                )}
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
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {sentIds.size} / {leads.length}
                                    </span>
                                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                                        {isSendingAll ? `${(sentIds.size / leads.length * 100).toFixed(0)}%` : leads.length}
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {isSendingAll && (
                                <div className="w-full bg-gray-200 dark:bg-slate-700 h-1">
                                    <div
                                        className="bg-blue-600 h-1 transition-all duration-300"
                                        style={{ width: `${(sentIds.size / leads.length) * 100}%` }}
                                    ></div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                {leads.map(lead => {
                                    const isSent = sentIds.has(lead.id);
                                    const isFailed = failedIds.has(lead.id);
                                    const isSending = sendingId === lead.id;
                                    const contactInfo = mode === 'whatsapp' ? lead.phone : lead.email;
                                    const isValid = !!contactInfo;

                                    return (
                                        <div key={lead.id} className={`p-3 rounded-lg border text-sm transition-all ${isSent ? 'bg-green-50 border-green-200' : isFailed ? 'bg-red-50 border-red-200' : 'bg-white hover:border-blue-300 border-gray-100'} dark:bg-slate-800 dark:border-slate-700`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">
                                                    {lead.first_name} {lead.paternal_last_name}
                                                </span>
                                                {isSent && <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />}
                                                {isFailed && <ExclamationCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                            </div>

                                            <div className="text-xs text-gray-500 truncate mb-2 font-mono">
                                                {contactInfo || <span className="text-red-400">Sin contacto</span>}
                                            </div>

                                            <div className="flex justify-end">
                                                {!isSent && (
                                                    <Button
                                                        size="sm"
                                                        disabled={!isValid || !selectedTemplateId || isSending || isSendingAll}
                                                        onClick={() => handleSend(lead)}
                                                        className={`${mode === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} flex-shrink-0 min-w-[90px] justify-center px-4 py-2 font-medium shadow-sm transition-all`}
                                                    >
                                                        {isSending ? '...' : (isFailed ? 'Reintentar' : 'Enviar')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                    </div>

                    <div className="mt-4 flex justify-between pt-4 border-t border-gray-100 dark:border-slate-700 gap-2 items-center">

                        {/* Left: General Button or Status */}
                        <div className="flex items-center gap-4">
                            {isSendingAll ? (
                                <Button
                                    variant="danger"
                                    className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={stopSending}
                                >
                                    <StopIcon className="w-4 h-4 mr-2" />
                                    Detener Envío
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg disabled:opacity-50"
                                    disabled={!selectedTemplateId || leadsPending.length === 0}
                                    onClick={handleSendAll}
                                >
                                    {leadsPending.length === 0 ? 'Todos Enviados' : (
                                        <>
                                            Enviar a Todos ({leadsPending.length})
                                            <ArrowRightIcon className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            )}

                            <p className="text-xs text-gray-400 hidden md:block">
                                {isSendingAll
                                    ? "⏳ Enviando mensajes uno por uno... No cierres esta pestaña."
                                    : "* El envío masivo procesará cada contacto individualmente."}
                            </p>
                        </div>

                        <Button variant="ghost" onClick={onClose} disabled={isSendingAll}>
                            {sentIds.size > 0 ? 'Finalizar' : 'Cancelar'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default BulkMessageModal;