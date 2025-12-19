import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import EmailEditorWrapper, { EmailEditorHandle } from '../EmailEditorWrapper';
import Modal from './Modal';
import { generateContent } from '../../utils/aiAssistant';
import SparklesIcon from '../icons/SparklesIcon';
import Button from './Button';
import { useToast } from '../../context/ToastContext'; // [NEW] Import

export interface EmailTemplateEditorHandle {
    getValues: () => Promise<{ html: string; design?: any }>;
    loadDesign: (design: any) => void;
    setHtml: (html: string) => void;
}

interface EmailTemplateEditorProps {
    initialHtml?: string;
    initialDesign?: any;
    initialMode?: 'basic' | 'pro';
    onChangeMode?: (mode: 'basic' | 'pro') => void;
    className?: string;
}

const EmailTemplateEditor = forwardRef<EmailTemplateEditorHandle, EmailTemplateEditorProps>(({
    initialHtml = '',
    initialDesign = null,
    initialMode = 'basic',
    onChangeMode,
    className = 'h-full'
}, ref) => {
    const [mode, setMode] = useState<'basic' | 'pro'>(initialMode);
    const [htmlContent, setHtmlContent] = useState(initialHtml);
    const emailEditorRef = useRef<EmailEditorHandle>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const toast = useToast(); // [NEW] Hook

    // AI State
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Sync mode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    // Sync HTML changes from prop
    useEffect(() => {
        if (initialHtml) setHtmlContent(initialHtml);
    }, [initialHtml]);

    // ... (useImperativeHandle remains same)
    useImperativeHandle(ref, () => ({
        getValues: async () => {
            if (mode === 'basic') {
                const sanitizedHtml = DOMPurify.sanitize(htmlContent);
                return { html: sanitizedHtml, design: null };
            } else {
                if (emailEditorRef.current) {
                    const rawHtml = await emailEditorRef.current.exportHtml();
                    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
                    const design = await emailEditorRef.current.exportDesign();
                    return { html: sanitizedHtml, design };
                }
                return { html: '', design: null };
            }
        },
        loadDesign: (design: any) => {
            if (mode === 'pro' && emailEditorRef.current && design) {
                emailEditorRef.current.loadDesign(design);
            }
        },
        setHtml: (html: string) => {
            setHtmlContent(html);
        }
    }));

    const handleModeSwitch = (newMode: 'basic' | 'pro') => {
        setMode(newMode);
        if (onChangeMode) onChangeMode(newMode);
    };

    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const generatedText = await generateContent(aiPrompt);
            if (mode === 'basic') {
                // Append to Quill (simple way)
                setHtmlContent(prev => prev + `<p>${generatedText.replace(/\n/g, '<br>')}</p>`);
                toast.success("Texto agregado al editor."); // [NEW] Notification
            } else {
                if (emailEditorRef.current) {
                    // Logic to append to Unlayer Design
                    const currentDesign = await emailEditorRef.current.exportDesign();

                    // Create a standard Unlayer Row structure with a Text block
                    const newRow = {
                        cells: [1],
                        columns: [
                            {
                                contents: [
                                    {
                                        type: "text",
                                        values: {
                                            text: `<p style="font-size: 16px; line-height: 140%;">${generatedText.replace(/\n/g, '<br>')}</p>`,
                                            color: "#000000",
                                            lineHeight: "140%",
                                            textAlign: "left",
                                            containerPadding: "10px",
                                            anchor: "",
                                            _meta: {
                                                htmlID: "",
                                                htmlClassNames: ""
                                            },
                                            selectable: true,
                                            draggable: true,
                                            duplicatable: true,
                                            deletable: true,
                                            hideable: false
                                        }
                                    }
                                ]
                            }
                        ]
                    };

                    // Safe append
                    if (!currentDesign.body) currentDesign.body = { rows: [] };
                    if (!currentDesign.body.rows) currentDesign.body.rows = [];
                    // @ts-ignore
                    currentDesign.body.rows.push(newRow);

                    // Reload the modified design
                    emailEditorRef.current.loadDesign(currentDesign);
                    toast.success("Texto anexado al final del diseño."); // [NEW] Better notification
                }
            }
            setIsAIModalOpen(false);
            setAiPrompt('');
        } catch (error) {
            console.error(error);
            toast.error("Error al conectar con la IA."); // [NEW] Error notification
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={`flex flex-col border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden ${className}`}>
            {/* Toolbar */}
            <div className="bg-gray-50 dark:bg-slate-700 px-4 py-2 border-b border-gray-200 dark:border-slate-600 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Editor de Contenido</span>
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="ml-2 flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Ayuda IA
                    </button>
                </div>

                <div className="flex bg-gray-200 dark:bg-slate-600 rounded-lg p-1 text-xs">
                    <button
                        onClick={() => handleModeSwitch('basic')}
                        className={`px-3 py-1 rounded-md transition-all ${mode === 'basic' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Básico (Texto)
                    </button>
                    <button
                        onClick={() => handleModeSwitch('pro')}
                        className={`px-3 py-1 rounded-md transition-all ${mode === 'pro' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                        Pro (Visual)
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 bg-white dark:bg-slate-800 relative min-h-[600px]">
                {mode === 'basic' ? (
                    <>
                        <ReactQuill
                            theme="snow"
                            value={htmlContent}
                            onChange={setHtmlContent}
                            modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline', 'link', 'blockquote'],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    [{ 'color': [] }, { 'background': [] }],
                                    [{ 'align': [] }],
                                    ['clean']
                                ]
                            }}
                            className="h-full flex flex-col ql-container-flex"
                        />
                        <div className="absolute bottom-2 right-2 z-10 opacity-70 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] bg-gray-100 border px-2 py-1 rounded text-gray-500">
                                Variables: {"{nombre}"}, {"{apellido}"}
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="h-full bg-slate-50 relative">
                        <EmailEditorWrapper
                            ref={emailEditorRef}
                            style={{ height: '100%', width: '100%' }}
                            onLoad={() => {
                                setIsEditorReady(true);
                                if (initialDesign && emailEditorRef.current) {
                                    emailEditorRef.current.loadDesign(initialDesign);
                                }
                            }}
                        />
                        {!isEditorReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
                                <span className="text-gray-500">Cargando editor Pro...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* AI Modal */}
            <Modal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} title="Asistente de Redacción IA" size="md">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ¿Qué deseas escribir?
                        </label>
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Ej: Escribe un recordatorio amable para completar la inscripción..."
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white h-32 p-3 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            {mode === 'basic' ? 'El texto se agregará al final del editor.' : 'El texto se copiará al portapapeles para que lo pegues en tu diseño.'}
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsAIModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAIGenerate} disabled={isGenerating || !aiPrompt.trim()}>
                            {isGenerating ? (
                                <span className="flex items-center gap-2">
                                    <SparklesIcon className="w-4 h-4 animate-spin" />
                                    <span>Escribiendo...</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <SparklesIcon className="w-4 h-4" />
                                    <span>Generar</span>
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
});

export default EmailTemplateEditor;
