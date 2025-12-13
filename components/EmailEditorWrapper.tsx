import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';

interface EmailEditorWrapperProps {
    initialDesign?: any; // JSON design from Unlayer
    style?: React.CSSProperties;
    onLoad?: () => void;
}

export interface EmailEditorHandle {
    exportHtml: () => Promise<string>;
    exportDesign: () => Promise<any>;
}

const EmailEditorWrapper = forwardRef<EmailEditorHandle, EmailEditorWrapperProps>((props, ref) => {
    const emailEditorRef = useRef<EditorRef>(null);

    useImperativeHandle(ref, () => ({
        exportHtml: () => {
            return new Promise((resolve) => {
                if (emailEditorRef.current && emailEditorRef.current.editor) {
                    emailEditorRef.current.editor.exportHtml((data) => {
                        const { html } = data;
                        resolve(html);
                    });
                } else {
                    resolve('');
                }
            });
        },
        exportDesign: () => {
            return new Promise((resolve) => {
                if (emailEditorRef.current && emailEditorRef.current.editor) {
                    emailEditorRef.current.editor.exportHtml((data) => {
                        // Unlayer exports design specifically via export_json but allow saving via full data
                        // For now let's just use exportHtml callback which gives both design and html usually or check docs
                        // Wait, exportHtml gives { design, html }.
                        resolve(data.design);
                    });
                } else {
                    resolve({});
                }
            });
        }
    }));

    const onReady = () => {
        // Editor is ready
        if (props.onLoad) props.onLoad();

        // Register Merge Tags (Variables)
        // This makes them available in the editor sidebar
        if (emailEditorRef.current && emailEditorRef.current.editor) {
            emailEditorRef.current.editor.setMergeTags({
                nombre: {
                    name: "Nombre del Lead",
                    value: "{{nombre}}",
                    sample: "Juan"
                },
                email: {
                    name: "Email del Lead",
                    value: "{{email}}",
                    sample: "juan@ejemplo.com"
                },
                telefono: {
                    name: "Teléfono",
                    value: "{{telefono}}",
                    sample: "555-123-4567"
                }
            });
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <EmailEditor
                ref={emailEditorRef}
                onReady={onReady}
                style={props.style}
                minHeight="100%"
                options={{
                    locale: 'es-ES',
                    appearance: {
                        theme: 'light',
                        panels: {
                            tools: {
                                dock: 'left'
                            }
                        }
                    },
                    // Free plan limitations apply, but standard tools work
                }}
            />
        </div>
    );
});

EmailEditorWrapper.displayName = 'EmailEditorWrapper';

export default EmailEditorWrapper;
