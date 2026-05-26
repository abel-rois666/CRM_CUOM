// components/WhatsAppModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';
import { Select } from './common/FormElements';
import { Lead, WhatsAppTemplate, Licenciatura } from '../types';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import { supabase } from '../lib/supabase';
import MessageInput from './MessageInput';
import Tooltip from './common/Tooltip';

interface WhatsAppModalProps {
  isOpen           : boolean;
  onClose          : () => void;
  lead             : Lead | null;
  templates        : WhatsAppTemplate[];
  licenciaturas    : Licenciatura[];
  initialTemplateId?: string;
  onMessageSent    : (leadId: string, note: string) => void;
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  lead,
  templates,
  licenciaturas,
  initialTemplateId,
  onMessageSent,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [message,             setMessage]            = useState('');
  const [isSending,           setIsSending]          = useState(false);
  const [activeTab,           setActiveTab]          = useState<'crm' | 'meta'>('crm');

  // -------------------------------------------------------------------------
  // Reset al abrir / cambiar plantilla inicial
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      if (initialTemplateId) {
        const template = templates.find(t => t.id === initialTemplateId);
        if (template) {
          setSelectedTemplateId(template.id);
          setMessage(template.content);
          return;
        }
      }
      setSelectedTemplateId('');
      setMessage('');
      setActiveTab('crm');
    }
  }, [isOpen, initialTemplateId, templates]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) injectTemplateContent(template.content);
    else setMessage('');
  };

  const templatesByCategory = React.useMemo(() => {
    const grouped: Record<string, WhatsAppTemplate[]> = {};
    templates.forEach(t => {
      const cat = t.category || 'Sin Categoría';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });
    return grouped;
  }, [templates]);

  const injectTemplateContent = (content: string) => {
    if (!lead) return;
    let finalContent = content;
    finalContent = finalContent.replace(/\{\{1\}\}/g, lead.first_name);
    finalContent = finalContent.replace(/\{nombre\}/gi, lead.first_name);
    setMessage(finalContent);
  };

  // -------------------------------------------------------------------------
  // Envío via Edge Function send-whatsapp
  // Recibe el mensaje ya redactado desde MessageInput.onSendMessage
  // -------------------------------------------------------------------------
  const handleSend = async (finalMessage: string) => {
    if (!lead || !finalMessage.trim()) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          leadId : lead.id,
          phone  : lead.phone,
          message: finalMessage.trim(),
        },
      });

      if (error || !data?.success) {
        let errMsg = data?.details ?? data?.error ?? error?.message ?? 'No se pudo enviar el mensaje.';
        
        // Extraer el error real de la API si supabase-js devuelve un error 400/500 (context)
        if (error && 'context' in error) {
          try {
            const errBody = await (error as any).context.json();
            errMsg = errBody.details || errBody.error || errMsg;
          } catch (e) { /* ignorar si no es JSON */ }
        }

        console.error('Error invocando send-whatsapp:', error);
        alert(`Error al enviar el mensaje: ${errMsg}`);
        return;
      }

      onMessageSent(lead.id, `📱 WhatsApp enviado: ${finalMessage.trim()}`);
      onClose();
    } catch (err: any) {
      console.error('Unexpected error sending WhatsApp:', err);
      alert(`Error inesperado: ${err.message || 'Por favor intenta de nuevo.'}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!lead) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enviar WhatsApp" size="md">
      <div className="space-y-5">

        {/* Cabecera del lead */}
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-full text-green-600">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">
              {lead.first_name} {lead.paternal_last_name}
            </p>
            <p className="text-xs text-green-600 font-mono">{lead.phone}</p>
          </div>
        </div>

        {/* Caja de Herramientas Inteligente (IA + Textarea + Envío) */}
        <MessageInput
          onSendMessage={handleSend}
          leadContext={{ lead, licenciaturas }}
          isSending={isSending}
          initialMessage={message}
          showTextarea={true}
          whatsappTemplates={templates}
        />

        {/* Footer */}
        <div className="pt-4 flex justify-between items-center border-t border-gray-100">
          <Button variant="ghost" onClick={onClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleSend(message)}
            disabled={!message.trim() || !lead.phone || isSending}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 border-transparent focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Enviando...' : '📱 Enviar WhatsApp'}
          </Button>
        </div>

      </div>
    </Modal>
  );
};

export default WhatsAppModal;