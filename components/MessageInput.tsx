// components/MessageInput.tsx
// ---------------------------------------------------------------------------
// Componente atómico: "Caja de Herramientas Inteligente"
// Reutilizable en WhatsAppModal y WhatsAppChat.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import { Input } from './common/FormElements';
import Tooltip from './common/Tooltip';
import SparklesIcon from './icons/SparklesIcon';
import BoltIcon from './icons/BoltIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import { generateMessage } from '../utils/aiAssistant';
import { Lead, Licenciatura } from '../types';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------
export interface LeadContext {
  lead        : Lead;
  licenciaturas: Licenciatura[];
  /** Historial de mensajes formateado como string para enriquecer el contexto */
  chatHistory?: string;
}

/** Opciones extra para el envío de plantillas oficiales de Meta */
export interface TemplatePayload {
  isTemplate       : true;
  templateName     : string;
  templateVariables: string[];
}

interface MessageInputProps {
  /** Llamado cuando el usuario quiere enviar el mensaje redactado libremente */
  onSendMessage   : (message: string) => void;
  leadContext      : LeadContext;
  /** Estado de carga controlado por el padre (optimistic updates, fetch, etc.) */
  isSending        : boolean;
  /** Opcional: texto inicial (ej. una plantilla ya cargada en WhatsAppModal) */
  initialMessage  ?: string;
  /** Muestra el Textarea editable en lugar del input inline (modo Modal) */
  showTextarea    ?: boolean;
  /** Placeholder del input inline (modo Chat) */
  placeholder     ?: string;
  /**
   * Nombre de la plantilla de primer contacto aprobada en Meta Business Manager.
   * Si se proporciona, se muestra el botón "Enviar Plantilla Inicial".
   * Por defecto: 'contacto_inicial'
   */
  initialTemplateName?: string;
}

// Nombre por defecto de la plantilla de primer contacto
const DEFAULT_TEMPLATE_NAME = 'contacto_inicial';

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  leadContext,
  isSending,
  initialMessage      = '',
  showTextarea        = false,
  placeholder         = 'Escribe un mensaje...',
  initialTemplateName = DEFAULT_TEMPLATE_NAME,
}) => {
  const { lead, licenciaturas, chatHistory } = leadContext;

  const [message,           setMessage]           = useState(initialMessage);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [isGenerating,      setIsGenerating]      = useState(false);
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);
  const [aiMode,            setAiMode]            = useState<'quick' | 'advanced'>('advanced');

  const isDisabled = isSending || isGenerating || isSendingTemplate;

  // -------------------------------------------------------------------------
  // Nombre completo del lead (primer variable de la plantilla)
  // -------------------------------------------------------------------------
  const leadFirstName = lead.first_name?.trim() || 'Prospecto';

  // -------------------------------------------------------------------------
  // Generación IA — llama a generateMessage (Groq via Edge Fn)
  // -------------------------------------------------------------------------
  const handleAiGenerate = async (mode: 'quick' | 'advanced') => {
    setAiMode(mode);
    setIsGenerating(true);
    try {
      const lastNote =
        lead.follow_ups && lead.follow_ups.length > 0
          ? lead.follow_ups[0].notes
          : 'Ninguna nota reciente';

      const programName =
        licenciaturas.find(l => l.id === lead.program_id)?.name ||
        'nuestro programa académico';

      const context = [
        `Última nota de seguimiento: ${lastNote}.`,
        `Programa de interés: ${programName}.`,
        chatHistory ? `\nHistorial de conversación WhatsApp reciente:\n${chatHistory}` : '',
      ].filter(Boolean).join('\n');

      const text = await generateMessage(lead, context, 'whatsapp', extraInstructions, mode);
      setMessage(text);
    } catch (err) {
      console.error('AI generation error:', err);
      alert('No se pudo generar el mensaje. Por favor intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------------------------------------------------------
  // Envío de texto libre — delega al padre
  // -------------------------------------------------------------------------
  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isDisabled) return;
    onSendMessage(trimmed);
    // En modo chat (inline), limpiamos de inmediato
    if (!showTextarea) setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // -------------------------------------------------------------------------
  // Envío de plantilla oficial de Meta (primer contacto / ventana 24h)
  // Llama directamente a la Edge Function con isTemplate: true
  // -------------------------------------------------------------------------
  const handleSendTemplate = async () => {
    if (isDisabled) return;

    setIsSendingTemplate(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          leadId           : lead.id,
          phone            : lead.phone,
          isTemplate       : true,
          templateName     : initialTemplateName,
          templateVariables: [leadFirstName],   // {{1}} en la plantilla de Meta
        },
      });

      if (invokeError || !data?.success) {
        const errMsg = data?.error ?? invokeError?.message ?? 'Por favor intenta de nuevo.';
        alert(`Error al enviar plantilla: ${errMsg}`);
        return;
      }

      // Limpiar el área de texto si el asesor tenía algo escrito
      setMessage('');
      // El mensaje aparecerá en el chat vía Realtime (INSERT en whatsapp_messages)
    } catch (err: any) {
      console.error('Template send error:', err);
      alert(`Error inesperado al enviar plantilla: ${err.message}`);
    } finally {
      setIsSendingTemplate(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-3">

      {/* ── Fila superior: instrucción IA + botones IA ───────────────────── */}
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Input
            id="msg-input-extra-instructions"
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            placeholder="Instrucción extra para la IA (opcional)..."
            label={showTextarea ? 'Instrucción extra (Opcional)' : undefined}
          />
        </div>

        {/* IA Rápida */}
        <Tooltip content="IA Rápida: Mensaje breve y directo." position="top">
          <button
            onClick={() => handleAiGenerate('quick')}
            disabled={isDisabled}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-sm transition-all transform hover:-translate-y-0.5 ${
              isDisabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 text-white'
            }`}
          >
            <BoltIcon className={`w-3 h-3 ${isGenerating && aiMode === 'quick' ? 'animate-spin' : ''}`} />
            {isGenerating && aiMode === 'quick' ? '...' : 'IA Rápida'}
          </button>
        </Tooltip>

        {/* IA Avanzada */}
        <Tooltip content="IA Avanzada: Mensaje detallado y persuasivo." position="top">
          <button
            onClick={() => handleAiGenerate('advanced')}
            disabled={isDisabled}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm transition-all transform hover:-translate-y-0.5 ${
              isDisabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-purple-200 dark:shadow-none hover:shadow-md'
            }`}
          >
            <SparklesIcon className={`w-3 h-3 ${isGenerating && aiMode === 'advanced' ? 'animate-spin' : ''}`} />
            {isGenerating && aiMode === 'advanced' ? '...' : 'IA Avanzada'}
          </button>
        </Tooltip>
      </div>

      {/* ── Botón de Plantilla Oficial (primer contacto / ventana 24 h) ─── */}
      <Tooltip
        content={`Envía la plantilla oficial aprobada por Meta "${initialTemplateName}" para iniciar conversación fuera de la ventana de 24 horas.`}
        position="top"
      >
        <button
          onClick={handleSendTemplate}
          disabled={isDisabled || !lead.phone}
          className={`
            w-full flex items-center justify-center gap-2
            px-3 py-1.5 rounded-xl border text-xs font-semibold
            transition-all duration-150
            ${isDisabled || !lead.phone
              ? 'border-gray-200 text-gray-400 bg-gray-50 dark:border-gray-700 dark:text-gray-600 dark:bg-gray-800/50 cursor-not-allowed'
              : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 dark:border-green-700 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40 active:scale-[0.98]'
            }
          `}
        >
          {isSendingTemplate ? (
            <>
              <SparklesIcon className="w-3 h-3 animate-spin" />
              Enviando plantilla...
            </>
          ) : (
            <>
              <span aria-hidden="true">👋</span>
              Enviar Plantilla Inicial
              <span className="ml-1 text-[10px] font-normal opacity-70">
                ({initialTemplateName})
              </span>
            </>
          )}
        </button>
      </Tooltip>

      {/* ── MODO TEXTAREA (WhatsAppModal — redacción antes de enviar) ────── */}
      {showTextarea ? (
        <textarea
          id="msg-input-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="El mensaje generado o redactado aparecerá aquí..."
          className="
            w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-600
            bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent
            resize-none transition-all
          "
        />
      ) : (
        /* ── MODO INPUT INLINE (WhatsAppChat — escritura directa) ──────── */
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            placeholder={
              isGenerating        ? 'Generando mensaje con IA...' :
              isSendingTemplate   ? 'Enviando plantilla...'       :
              placeholder
            }
            className="
              flex-1 px-4 py-2 text-sm rounded-full border border-gray-200 dark:border-gray-600
              bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent
              disabled:opacity-50 transition-all
            "
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isDisabled}
            title="Enviar mensaje"
            className="
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              bg-green-500 hover:bg-green-600 active:scale-95
              text-white shadow-md shadow-green-200 dark:shadow-none
              disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
              transition-all duration-150
            "
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Estado de generación IA (solo modo textarea) ─────────────────── */}
      {showTextarea && isGenerating && (
        <p className="text-xs text-indigo-500 dark:text-indigo-400 animate-pulse flex items-center gap-1">
          <SparklesIcon className="w-3 h-3" />
          Generando mensaje con {aiMode === 'quick' ? 'IA Rápida' : 'IA Avanzada'}...
        </p>
      )}
    </div>
  );
};

export default MessageInput;
