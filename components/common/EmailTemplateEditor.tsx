import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import EmailEditorWrapper, { EmailEditorHandle } from '../EmailEditorWrapper';

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

    // Sync mode changes
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    // Sync HTML changes from prop
    useEffect(() => {
        if (initialHtml) setHtmlContent(initialHtml);
    }, [initialHtml]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        getValues: async () => {
            if (mode === 'basic') {
                // Sanitize Basic HTML
                const sanitizedHtml = DOMPurify.sanitize(htmlContent);
                return { html: sanitizedHtml, design: null };
            } else {
                if (emailEditorRef.current) {
                    const rawHtml = await emailEditorRef.current.exportHtml();
                    // Sanitize Pro HTML (prevent injection from loaded templates)
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

    return (
        <div className={`flex flex-col border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden ${className}`}>
            {/* Toolbar */}
            <div className="bg-gray-50 dark:bg-slate-700 px-4 py-2 border-b border-gray-200 dark:border-slate-600 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Editor de Contenido</span>
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
        </div>
    );
});

export default EmailTemplateEditor;
