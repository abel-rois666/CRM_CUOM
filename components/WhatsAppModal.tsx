import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select, TextArea } from './common/FormElements';
import { Lead, WhatsAppTemplate } from '../types';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  templates: WhatsAppTemplate[];
  initialTemplateId?: string; // Nueva prop para automatización
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, lead, templates, initialTemplateId }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Si viene una plantilla sugerida, la cargamos
      if (initialTemplateId) {
        const template = templates.find(t => t.id === initialTemplateId);
        if (template) {
            setSelectedTemplateId(template.id);
            setMessage(template.content);
            setGeneratedLink(null);
            return;
        }
      }
      // Reset normal
      setSelectedTemplateId('');
      setMessage('');
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
    if (generatedLink) {
      window.open(generatedLink, '_blank');
      onClose();
    }
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enviar WhatsApp" size="md">
      <div className="space-y-5">
        {/* Info Card */}
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

        <TextArea
            label="Mensaje"
            value={message}
            onChange={(e) => { setMessage(e.target.value); setGeneratedLink(null); }}
            rows={6}
            placeholder="Escribe tu mensaje aquí..."
        />

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
                    Abrir WhatsApp
                </Button>
             </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppModal;