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

  // Función para limpiar HTML simple para usar en mailto (ya que mailto no soporta HTML)
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const handleOpenMailClient = () => {
    if (!lead.email) return;
    
    const plainBody = stripHtml(body);
    const mailtoLink = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
    
    // Abrir en nueva pestaña para evitar bloquear la app si el cliente tarda en abrir
    window.open(mailtoLink, '_blank');
    onClose();
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Redactar Correo" size="lg">
        <div className="space-y-4">
             <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mb-4 flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                    <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <p className="text-sm text-blue-900 font-bold">Para: {lead.first_name} {lead.paternal_last_name}</p>
                    <p className="text-xs text-blue-700">{lead.email || 'Este lead no tiene email registrado'}</p>
                </div>
            </div>

            <div>
                <label htmlFor="emailTemplate" className="block text-sm font-medium text-gray-700 mb-1">
                    Cargar Plantilla
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
                    Mensaje
                </label>
                <textarea
                    id="emailBody"
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary sm:text-sm font-mono"
                    placeholder="Escribe tu mensaje aquí..."
                />
                <p className="text-xs text-gray-500 mt-1">
                    Nota: Al hacer clic en enviar, se abrirá tu aplicación de correo predeterminada.
                </p>
            </div>

            <div className="pt-4 flex justify-end items-center border-t border-gray-100 mt-4 gap-3">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                
                {/* Opción Frontend (Principal - Estilo WhatsApp) */}
                <Button 
                    onClick={handleOpenMailClient} 
                    disabled={!lead.email || !subject || !body}
                    leftIcon={<EnvelopeIcon className="w-5 h-5" />}
                >
                    Abrir en mi Correo
                </Button>
            </div>
        </div>
    </Modal>
  );
};

export default EmailModal;