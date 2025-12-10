import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select, Input, TextArea } from './common/FormElements';
import { Lead, EmailTemplate, Licenciatura } from '../types';
import EnvelopeIcon from './icons/EnvelopeIcon';
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
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, lead, templates, licenciaturas, initialTemplateId, onMessageSent }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [extraInstructions, setExtraInstructions] = useState(''); // [NEW]
  const [isGenerating, setIsGenerating] = useState(false); // [NEW]

  useEffect(() => {
    if (isOpen) {
      if (initialTemplateId) {
        const template = templates.find(t => t.id === initialTemplateId);
        if (template) {
          setSelectedTemplateId(template.id);
          setSubject(template.subject);
          setBody(template.body);
          return;
        }
      }
      setSelectedTemplateId('');
      setSubject('');
      setBody('');
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
      // Podemos inferir asunto si está vacío.
      if (!subject) setSubject(`Información sobre ${programName}`);
      setBody(text);

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
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    } else {
      setSubject('');
      setBody('');
    }
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleOpenMailClient = () => {
    if (!lead.email) return;

    // 1. Abrir Correo
    const plainBody = stripHtml(body);
    const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
    window.open(mailtoLink, '_blank');

    // 2. Avisar al padre para registrar nota
    onMessageSent(lead.id, `✉️ Correo enviado: ${subject}`);

    onClose();
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Redactar Correo" size="lg">
      <div className="space-y-5">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
            <EnvelopeIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">Para: {lead.first_name} {lead.paternal_last_name}</p>
            <p className="text-xs text-blue-700 font-mono">{lead.email || 'Sin email registrado'}</p>
          </div>
        </div>

        <Select
          label="Plantilla"
          value={selectedTemplateId}
          onChange={handleTemplateChange}
          placeholder="-- Selecciona una plantilla --"
          options={templates.map(t => ({ value: t.id, label: t.name }))}
        />

        <Input
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Asunto del correo..."
        />

        <div className="space-y-4">
          {/* Instrucciones Extra y Botón IA */}
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <Input
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                placeholder="Ej: Adjuntar PDF de becas, Fecha límite viernes..."
                label="Instrucción extra (Opcional)"
              />
            </div>
            <button
              onClick={handleAiGenerate}
              disabled={isGenerating}
              className={`
                h-[42px] px-4 rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-sm
                ${isGenerating
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-blue-200'
                }
              `}
              title="Generar correo con IA"
            >
              <SparklesIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Redactando...' : 'Redactar IA'}
            </button>
          </div>

          <TextArea
            label="Mensaje"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="El correo generado aparecerá aquí..."
          />
        </div>
        <p className="text-xs text-gray-400 text-right">Se abrirá tu cliente de correo predeterminado.</p>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleOpenMailClient}
            disabled={!lead.email || !subject || !body}
            leftIcon={<EnvelopeIcon className="w-5 h-5" />}
          >
            Abrir y Registrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EmailModal;