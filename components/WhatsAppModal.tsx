// components/WhatsAppModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select, TextArea, Input } from './common/FormElements';
import { Lead, WhatsAppTemplate, Licenciatura } from '../types';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import { generateMessage } from '../utils/aiAssistant';
import SparklesIcon from './icons/SparklesIcon';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  templates: WhatsAppTemplate[];
  licenciaturas: Licenciatura[]; // [NEW] Para resolver IDs
  initialTemplateId?: string;
  onMessageSent: (leadId: string, note: string) => void;
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, lead, templates, licenciaturas, initialTemplateId, onMessageSent }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [extraInstructions, setExtraInstructions] = useState(''); // [NEW] Estado para instrucciones
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false); // AI State

  useEffect(() => {
    if (isOpen) {
      if (initialTemplateId) {
        const template = templates.find(t => t.id === initialTemplateId);
        if (template) {
          setSelectedTemplateId(template.id);
          setMessage(template.content);
          setGeneratedLink(null);
          return;
        }
      }
      setSelectedTemplateId('');
      setMessage('');
      setExtraInstructions(''); // Reset
      setGeneratedLink(null);
    }
  }, [isOpen, initialTemplateId, templates]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) setMessage(template.content);
    else setMessage('');
    setGeneratedLink(null);
  };

  const cleanPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = `52${cleaned}`;
    return cleaned;
  };

  const handleGenerateLink = () => {
    if (!lead || !message) return;
    const phone = cleanPhoneNumber(lead.phone);
    const encodedMessage = encodeURIComponent(message);
    setGeneratedLink(`https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`);
  };

  const handleSend = () => {
    if (generatedLink && lead) {
      window.open(generatedLink, '_blank');
      onMessageSent(lead.id, `📱 WhatsApp enviado: ${message}`);
      onClose();
    }
  };

  const handleAiGenerate = async () => {
    if (!lead) return;
    setIsGenerating(true);
    try {
      // Contexto simple para la IA
      const lastNote = lead.follow_ups && lead.follow_ups.length > 0 ? lead.follow_ups[0].notes : 'Ninguna nota reciente';

      // Resolver nombre del programa
      const programName = licenciaturas.find(l => l.id === lead.program_id)?.name || 'nuestro programa académico';

      const context = `
      Última interacción: ${lastNote}.
      Programa de interés (Nombre real): ${programName}.
      `;

      const text = await generateMessage(lead, context, 'whatsapp', extraInstructions); // [NEW] Pasar instrucciones
      setMessage(text);
      setGeneratedLink(null); // Reset link since message changed
    } catch (error) {
      console.error(error);
      alert("No se pudo generar el mensaje. Verifica que hayas configurado tu API Key en el archivo .env (VITE_OPENROUTER_API_KEY).");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enviar WhatsApp" size="md">
      <div className="space-y-5">
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-full text-green-600">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">{lead.first_name} {lead.paternal_last_name}</p>
            <p className="text-xs text-green-600 font-mono">{lead.phone}</p>
          </div>
        </div>

        <Select
          label="Cargar Plantilla"
          value={selectedTemplateId}
          onChange={handleTemplateChange}
          placeholder="-- Selecciona una plantilla --"
          options={templates.map(t => ({ value: t.id, label: t.name }))}
        />

        <div className="space-y-4">
          {/* Instrucciones Extra y Botón */}
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <Input
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                placeholder="Ej: Ofrece 10% de beca, Sé formal..."
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
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-indigo-200'
                }
              `}
              title="Generar mensaje con Inteligencia Artificial"
            >
              <SparklesIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Creando...' : 'Redactar IA'}
            </button>
          </div>

          <TextArea
            label="Mensaje"
            value={message}
            onChange={(e) => { setMessage(e.target.value); setGeneratedLink(null); }}
            rows={6}
            placeholder="El mensaje generado aparecerá aquí..."
          />
        </div>

        {generatedLink && (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 break-all font-mono animate-fade-in">
            {generatedLink}
          </div>
        )}

        <div className="pt-4 flex justify-between items-center border-t border-gray-100">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          {!generatedLink ? (
            <Button
              onClick={handleGenerateLink}
              disabled={!message || !lead.phone}
              variant="primary"
              className="shadow-lg shadow-brand-secondary/20"
            >
              Generar Enlace
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => setGeneratedLink(null)} variant="secondary">Editar</Button>
              <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 border-transparent focus:ring-green-500">
                Abrir y Registrar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppModal;