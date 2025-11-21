import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select, Input, TextArea } from './common/FormElements';
import { Lead, EmailTemplate } from '../types';
import EnvelopeIcon from './icons/EnvelopeIcon';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  templates: EmailTemplate[];
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, lead, templates }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplateId('');
      setSubject('');
      setBody('');
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

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleOpenMailClient = () => {
    if (!lead.email) return;
    const plainBody = stripHtml(body);
    const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
    window.open(mailtoLink, '_blank');
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

            <TextArea
                label="Mensaje"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Escribe tu mensaje..."
            />
            <p className="text-xs text-gray-400 text-right">Se abrirá tu cliente de correo predeterminado.</p>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button 
                    onClick={handleOpenMailClient} 
                    disabled={!lead.email || !subject || !body}
                    leftIcon={<EnvelopeIcon className="w-5 h-5" />}
                >
                    Abrir Correo
                </Button>
            </div>
        </div>
    </Modal>
  );
};

export default EmailModal;