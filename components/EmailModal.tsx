import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select, Input } from './common/FormElements';
import { Lead, EmailTemplate, Licenciatura, Profile } from '../types';
import EmailTemplateEditor, { EmailTemplateEditorHandle } from './common/EmailTemplateEditor';
import { supabase } from '../lib/supabase';
import EnvelopeIcon from './icons/EnvelopeIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import { generateMessage } from '../utils/aiAssistant';
import SparklesIcon from './icons/SparklesIcon';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  templates: EmailTemplate[];
  licenciaturas: Licenciatura[]; // [NEW] Para resolver IDs
  initialTemplateId?: string;
  onMessageSent: (leadId: string, note: string) => void;
  currentUser?: Profile | null;
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, lead, templates, licenciaturas, initialTemplateId, onMessageSent, currentUser }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');

  // Editor State
  const editorRef = React.useRef<EmailTemplateEditorHandle>(null);
  const [initialHtml, setInitialHtml] = useState<string>(''); // For syncing editor content
  const [initialDesign, setInitialDesign] = useState<any>(null); // [NEW] For Pro designs
  const [editorMode, setEditorMode] = useState<'basic' | 'pro'>('basic'); // Track mode for AI injection

  const [extraInstructions, setExtraInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTemplateId) {
        const template = templates.find(t => t.id === initialTemplateId);
        if (template) {
          setSelectedTemplateId(template.id);
          setSubject(template.subject);
          setInitialHtml(template.body);

          if (template.design_json) {
            setInitialDesign(template.design_json);
            setEditorMode('pro');
          } else {
            setInitialDesign(null);
            setEditorMode('basic');
          }
          return;
        }
      }
      setSelectedTemplateId('');
      setSubject('');
      setInitialHtml('');
      setExtraInstructions('');
    }
  }, [isOpen, initialTemplateId, templates]);

  // [NEW] Logic AI
  const handleAiGenerate = async () => {
    if (!lead) return;
    setIsGenerating(true);
    try {
      const lastNote = lead.follow_ups && lead.follow_ups.length > 0 ? lead.follow_ups[0].notes : 'Ninguna nota reciente';

      // Resolver nombre del programa
      const programName = licenciaturas?.find(l => l.id === lead.program_id)?.name || 'nuestro programa académico';

      const context = `
      Última interacción: ${lastNote}.
      Programa de interés (Nombre real): ${programName}.
      `;

      // Nota: generateMessage devuelve string, asumiremos que el asunto lo generaremos simple o fijo, o pedimos ambos.
      // Simplificación: Pedimos el cuerpo del correo.
      const text = await generateMessage(lead, context, 'email', extraInstructions);

      // Intentar separar asunto si la IA lo da, pero por ahora solo body es seguro.
      if (!subject) setSubject(`Información sobre ${programName}`);

      // Inject AI text into editor
      if (editorRef.current) {
        if (editorMode === 'pro') {
          // Create a valid Unlayer design with the AI text
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
                            "text": text
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          };
          // @ts-ignore
          editorRef.current.loadDesign(design);
        } else {
          editorRef.current.setHtml(text);
        }
        setInitialHtml(text);
      }

    } catch (error) {
      console.error(error);
      alert("Error al generar correo con IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);

    if (templateId === 'blank') {
      setSubject('');
      setInitialHtml('');
      setEditorMode('basic');
      if (editorRef.current) {
        editorRef.current.setHtml('');
      }
      return;
    }

    const template = templates.find(t => t.id === templateId);

    if (editorRef.current) {
      if (template) {
        setSubject(template.subject);
        if (template.design_json) {
          // Auto switch to Pro if design exists
          setInitialDesign(template.design_json);
          setEditorMode('pro');
        } else {
          editorRef.current.setHtml(template.body);
          setInitialDesign(null);
          setEditorMode('basic');
        }
        // Update initialHtml for Basic sync
        setInitialHtml(template.body);
      } else {
        setSubject('');
        editorRef.current.setHtml('');
        setInitialHtml('');
      }
    }
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleOpenMailClient = async () => {
    if (!lead.email || !editorRef.current) return;
    const { html } = await editorRef.current.getValues();

    // 1. Abrir Correo (Solo texto plano aproximado)
    const plainBody = stripHtml(html);
    const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
    window.open(mailtoLink, '_blank');

    // 2. Avisar al padre para registrar nota
    onMessageSent(lead.id, `✉️ Correo enviado (Externo): ${subject}`);
    onClose();
  };

  const handleSendViaApi = async () => {
    if (!lead.email || !editorRef.current) return;

    setIsSending(true);
    try {
      const { html } = await editorRef.current.getValues();

      // Process Placeholders in Subject/Body (same as bulk)
      const processText = (txt: string) => txt.replace(/{nombre}/g, lead.first_name).replace(/{apellido}/g, lead.paternal_last_name);

      const finalSubject = processText(subject);
      const finalHtml = processText(html);

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [{ name: `${lead.first_name} ${lead.paternal_last_name}`, email: lead.email }],
          subject: finalSubject,
          html_content: finalHtml
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      // Register Follow Up
      await (supabase as any).from('follow_ups').insert({
        lead_id: lead.id,
        notes: `✉️ Correo enviado (Sistema): ${finalSubject}`,
        date: new Date().toISOString(),
        // @ts-ignore
        created_by: currentUser?.id
      });

      onMessageSent(lead.id, `✉️ Correo enviado: ${finalSubject}`);
      alert("Correo enviado exitosamente.");
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Error al enviar el correo: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Redactar Correo" size="5xl">
      <div className="space-y-3 h-[85vh] flex flex-col">
        {/* Row 1: Recipient + Template */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 md:col-span-5 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
            <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 shrink-0">
              <EnvelopeIcon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-blue-900 truncate">Para: {lead.first_name} {lead.paternal_last_name}</p>
              <p className="text-[10px] text-blue-700 font-mono truncate">{lead.email || 'Sin email'}</p>
            </div>
          </div>
          <div className="col-span-12 md:col-span-7">
            <Select
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              placeholder="-- Plantilla --"
              options={[
                { value: 'blank', label: '✨ + Redactar desde cero' },
                ...templates.map(t => ({ value: t.id, label: t.name }))
              ]}
              className="h-10 text-sm"
            />
          </div>
        </div>

        {/* Row 2: Subject */}
        <div className="w-full">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto..."
            className="h-10 text-sm"
          />
        </div>

        <div className="flex-1 min-h-0 relative">
          <EmailTemplateEditor
            ref={editorRef}
            initialHtml={initialHtml}
            initialDesign={initialDesign}
            initialMode={editorMode}
            onChangeMode={setEditorMode}
          />
        </div>
      </div>
      <div className="pt-4 flex justify-between items-center border-t border-gray-100 dark:border-slate-700 mt-2">
        <button onClick={handleOpenMailClient} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
          <EnvelopeIcon className="w-3 h-3" /> Abrir cliente externo (Solo texto)
        </button>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSending}>Cancelar</Button>
          <Button
            onClick={handleSendViaApi}
            disabled={!lead.email || !subject || isSending}
            leftIcon={<PaperAirplaneIcon className="w-5 h-5" />}
          >
            {isSending ? 'Enviando...' : 'Enviar Ahora'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EmailModal;