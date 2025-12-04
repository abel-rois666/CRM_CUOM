// components/BulkMessageModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select } from './common/FormElements';
import { Lead, WhatsAppTemplate, EmailTemplate, Profile } from '../types'; // Importar Profile
import { supabase } from '../lib/supabase';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import EnvelopeIcon from './icons/EnvelopeIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArrowRightIcon from './icons/ChevronRightIcon'; 

interface BulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'whatsapp' | 'email';
  leads: Lead[];
  whatsappTemplates: WhatsAppTemplate[];
  emailTemplates: EmailTemplate[];
  onComplete: () => void;
  currentUser: Profile | null; // NUEVA PROP
}

const BulkMessageModal: React.FC<BulkMessageModalProps> = ({
  isOpen,
  onClose,
  mode,
  leads,
  whatsappTemplates,
  emailTemplates,
  onComplete,
  currentUser // Recibir prop
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
        setSentIds(new Set());
        setSelectedTemplateId('');
    }
  }, [isOpen]);

  const getTemplateOptions = () => {
    if (mode === 'whatsapp') return whatsappTemplates.map(t => ({ value: t.id, label: t.name }));
    return emailTemplates.map(t => ({ value: t.id, label: t.name }));
  };

  const getCurrentTemplate = () => {
    if (mode === 'whatsapp') return whatsappTemplates.find(t => t.id === selectedTemplateId);
    return emailTemplates.find(t => t.id === selectedTemplateId);
  };

  const cleanPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = `52${cleaned}`;
    return cleaned;
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const processText = (text: string, lead: Lead) => {
    return text
        .replace(/{nombre}/g, lead.first_name)
        .replace(/{apellido}/g, lead.paternal_last_name);
  };

  const handleSend = async (lead: Lead) => {
    const template = getCurrentTemplate();
    if (!template) return;

    // 1. Generar Link y Abrir
    if (mode === 'whatsapp') {
        const waTemplate = template as WhatsAppTemplate;
        const message = processText(waTemplate.content, lead);
        const phone = cleanPhoneNumber(lead.phone);
        const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    } else {
        const emailTemplate = template as EmailTemplate;
        const subject = processText(emailTemplate.subject, lead);
        const body = processText(stripHtml(emailTemplate.body), lead);
        
        if (!lead.email) {
            alert("Este lead no tiene email.");
            return;
        }
        const url = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(url, '_blank');
    }

    // 2. Registrar en Bitácora (CORREGIDO: Ahora incluye created_by)
    const noteText = mode === 'whatsapp' 
        ? `📱 WhatsApp Masivo enviado: ${template.name}`
        : `✉️ Correo Masivo enviado: ${template.name}`;

    await supabase.from('follow_ups').insert({
        lead_id: lead.id,
        notes: noteText,
        date: new Date().toISOString(),
        created_by: currentUser?.id // AQUÍ SE REGISTRA EL USUARIO
    });

    // 3. Marcar como enviado visualmente
    setSentIds(prev => new Set(prev).add(lead.id));
  };

  const template = getCurrentTemplate();

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={mode === 'whatsapp' ? 'Envío Masivo de WhatsApp' : 'Envío Masivo de Correos'} 
        size="xl"
    >
      <div className="flex flex-col h-[60vh]">
        
        {/* Header Configuración */}
        <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <Select
                        label="Seleccionar Plantilla"
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        options={getTemplateOptions()}
                        placeholder="-- Elige un mensaje --"
                    />
                </div>
                <div className="text-xs text-gray-500 pb-3 hidden sm:block">
                    Se enviará a <strong>{leads.length}</strong> destinatarios seleccionados.
                </div>
            </div>
            
            {template && (
                <div className="mt-3 text-xs text-gray-500 bg-white p-2 rounded border border-gray-200 italic">
                    <strong>Vista previa: </strong> 
                    {mode === 'whatsapp' 
                        ? (template as WhatsAppTemplate).content.substring(0, 100) + '...'
                        : (template as EmailTemplate).subject
                    }
                </div>
            )}
        </div>

        {/* Lista de Envíos */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-xl bg-white relative">
            {!selectedTemplateId && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                    <p className="text-gray-400 font-medium">Selecciona una plantilla para comenzar</p>
                </div>
            )}
            
            <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Destinatario</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dato de Contacto</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {leads.map(lead => {
                        const isSent = sentIds.has(lead.id);
                        const contactInfo = mode === 'whatsapp' ? lead.phone : lead.email;
                        const isValid = !!contactInfo;

                        return (
                            <tr key={lead.id} className={`transition-colors ${isSent ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                <td className="px-4 py-3">
                                    <p className="text-sm font-bold text-gray-800">{lead.first_name} {lead.paternal_last_name}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <p className={`text-sm font-mono ${!isValid ? 'text-red-400 italic' : 'text-gray-600'}`}>
                                        {contactInfo || '(No disponible)'}
                                    </p>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {isSent ? (
                                        <span className="inline-flex items-center text-green-600 text-xs font-bold px-3 py-1.5 bg-green-100 rounded-lg">
                                            <CheckCircleIcon className="w-4 h-4 mr-1"/> Enviado
                                        </span>
                                    ) : (
                                        <Button 
                                            size="sm" 
                                            disabled={!isValid || !selectedTemplateId}
                                            onClick={() => handleSend(lead)}
                                            className={mode === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                                        >
                                            {mode === 'whatsapp' ? 'WhatsApp' : 'Correo'} 
                                            <ArrowRightIcon className="w-3 h-3 ml-1"/>
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        <div className="mt-4 flex justify-end pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkMessageModal;