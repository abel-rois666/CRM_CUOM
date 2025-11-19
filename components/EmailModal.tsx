import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Lead, EmailTemplate } from '../types';
import EnvelopeIcon from './icons/EnvelopeIcon';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  templates: EmailTemplate[];
  onSend: (to: string, subject: string, body: string) => Promise<void> | void;
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, lead, templates, onSend }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId('');
      setSubject('');
      setBody('');
      setSending(false);
    }
  }, [isOpen]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSendClick = async () => {
    if (!lead.email || !subject || !body) return;
    setSending(true);
    await onSend(lead.email, subject, body);
    setSending(false);
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enviar Correo Electrónico" size="lg">
        <div className="space-y-4">
             <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mb-4">
                <p className="text-sm text-blue-800 font-medium">Para: {lead.first_name} {lead.paternal_last_name}</p>
                <p className="text-xs text-blue-600">Email: {lead.email || 'Sin email'}</p>
            </div>

            <div>
                <label htmlFor="emailTemplate" className="block text-sm font-medium text-gray-700 mb-1">
                    Seleccionar Plantilla
                </label>
                <select
                    id="emailTemplate"
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
                <label htmlFor="emailSubject" className="block text-sm font-medium text-gray-700 mb-1">
                    Asunto
                </label>
                <input
                    type="text"
                    id="emailSubject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm"
                    placeholder="Asunto del correo..."
                />
            </div>

            <div>
                <label htmlFor="emailBody" className="block text-sm font-medium text-gray-700 mb-1">
                    Mensaje (HTML simple soportado)
                </label>
                <textarea
                    id="emailBody"
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm font-mono"
                    placeholder="Escribe tu mensaje aquí..."
                />
            </div>

            <div className="pt-4 flex justify-end space-x-2">
                <Button variant="ghost" onClick={onClose} disabled={sending}>Cancelar</Button>
                <Button 
                    onClick={handleSendClick} 
                    disabled={!lead.email || !subject || !body || sending}
                    leftIcon={!sending ? <EnvelopeIcon className="w-5 h-5" /> : undefined}
                >
                    {sending ? 'Enviando...' : 'Enviar Correo'}
                </Button>
            </div>
        </div>
    </Modal>
  );
};

export default EmailModal;