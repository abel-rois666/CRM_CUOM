
import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Lead, WhatsAppTemplate } from '../types';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  templates: WhatsAppTemplate[];
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, lead, templates }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId('');
      setMessage('');
      setGeneratedLink(null);
    }
  }, [isOpen]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
    } else {
      setMessage('');
    }
    setGeneratedLink(null);
  };

  const cleanPhoneNumber = (phone: string) => {
    // Remove non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Basic heuristic: If it's a 10 digit Mexican number, add 52. 
    // If it's 52 + 10 digits, keep it.
    // This is a simple assumption, ideally, phone numbers should be stored in E.164 format in DB.
    if (cleaned.length === 10) {
        cleaned = `52${cleaned}`;
    }
    return cleaned;
  };

  const handleGenerateLink = () => {
    if (!lead || !message) return;

    const phone = cleanPhoneNumber(lead.phone);
    const encodedMessage = encodeURIComponent(message);
    const link = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    
    setGeneratedLink(link);
  };

  const handleSend = () => {
    if (generatedLink) {
      window.open(generatedLink, '_blank');
      onClose();
    }
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enviar Mensaje de WhatsApp" size="md">
      <div className="space-y-4">
        <div className="bg-green-50 p-3 rounded-md border border-green-200 mb-4">
            <p className="text-sm text-green-800 font-medium">Contactando a: {lead.first_name} {lead.paternal_last_name}</p>
            <p className="text-xs text-green-600">Teléfono: {lead.phone}</p>
        </div>

        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
            Seleccionar Plantilla
          </label>
          <select
            id="template"
            value={selectedTemplateId}
            onChange={handleTemplateChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
          >
            <option value="">-- Selecciona una plantilla --</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje Personalizado
          </label>
          <textarea
            id="message"
            rows={6}
            value={message}
            onChange={(e) => { setMessage(e.target.value); setGeneratedLink(null); }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
            placeholder="Escribe tu mensaje o selecciona una plantilla..."
          />
          <p className="text-xs text-gray-500 mt-1">Puedes editar el mensaje antes de generar el enlace.</p>
        </div>

        {generatedLink && (
            <div className="p-3 bg-gray-100 rounded border text-xs break-all text-gray-600">
                Link generado: {generatedLink}
            </div>
        )}

        <div className="pt-4 flex justify-between items-center">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <div className="flex space-x-2">
             {!generatedLink ? (
                <Button onClick={handleGenerateLink} disabled={!message || !lead.phone} variant="secondary">
                    Generar Enlace
                </Button>
             ) : (
                 <>
                    <Button onClick={() => setGeneratedLink(null)} variant="secondary">
                        Editar
                    </Button>
                    <Button onClick={handleSend} leftIcon={<ChatBubbleLeftRightIcon className="w-5 h-5"/>} className="bg-green-600 hover:bg-green-700 focus:ring-green-500">
                        Enviar WhatsApp
                    </Button>
                 </>
             )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppModal;
