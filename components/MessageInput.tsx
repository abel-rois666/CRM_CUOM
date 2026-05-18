// components/MessageInput.tsx
// ---------------------------------------------------------------------------
// Componente atómico: "Caja de Herramientas Inteligente"
// Reutilizable en WhatsAppModal y WhatsAppChat.
// ---------------------------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { Input, Select } from './common/FormElements';
import Tooltip from './common/Tooltip';
import SparklesIcon from './icons/SparklesIcon';
import BoltIcon from './icons/BoltIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import { generateMessage } from '../utils/aiAssistant';
import { Lead, Licenciatura } from '../types';
import { supabase } from '../lib/supabase';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChevronUpIcon from './icons/ChevronUpIcon';

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
  /** No se usa con el selector dinámico, pero se mantiene por retrocompatibilidad */
  initialTemplateName?: string;
}

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
}) => {
  const { lead, licenciaturas, chatHistory } = leadContext;

  const [message,           setMessage]           = useState(initialMessage);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [isGenerating,      setIsGenerating]      = useState(false);
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);
  const [aiMode,            setAiMode]            = useState<'quick' | 'advanced'>('advanced');

  // --- Estado para plantillas dinámicas ---
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates]     = useState(false);
  const [metaTemplates, setMetaTemplates]               = useState<any[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [templateVariableValues, setTemplateVariableValues] = useState<string[]>([]);
  const [expectedVariablesCount, setExpectedVariablesCount] = useState<number>(0);

  const isDisabled = isSending || isGenerating || isSendingTemplate;

  // Nombre completo del lead para autocompletar la 1ra variable si es posible
  const leadFirstName = lead.first_name?.trim() || 'Prospecto';

  // -------------------------------------------------------------------------
  // Obtener plantillas de Meta API
  // -------------------------------------------------------------------------
  const fetchTemplates = async () => {
    if (metaTemplates.length > 0) return; // Ya se cargaron
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-whatsapp-templates');
      if (error) throw error;
      if (data?.data) {
        setMetaTemplates(data.data);
      }
    } catch (err: any) {
      console.error("Error al cargar plantillas de Meta:", err);
      alert(`Error al cargar plantillas: ${err.message}`);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const toggleTemplateSelector = () => {
    if (!showTemplateSelector) {
      fetchTemplates();
    }
    setShowTemplateSelector(!showTemplateSelector);
  };

  // -------------------------------------------------------------------------
  // Parsear variables cuando el usuario selecciona una plantilla
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (selectedTemplateName) {
      const template = metaTemplates.find((t) => t.name === selectedTemplateName);
      if (template) {
        const bodyComponent = template.components.find((c: any) => c.type === 'BODY');
        if (bodyComponent && bodyComponent.text) {
          // Meta usa variables como {{1}}, {{2}}
          const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
          if (matches) {
            setExpectedVariablesCount(matches.length);
            // Autocompletar la variable 1 con el nombre del lead
            const initialVars = new Array(matches.length).fill('');
            if (matches.length > 0) initialVars[0] = leadFirstName;
            setTemplateVariableValues(initialVars);
          } else {
            setExpectedVariablesCount(0);
            setTemplateVariableValues([]);
          }
        } else {
          setExpectedVariablesCount(0);
          setTemplateVariableValues([]);
        }
      }
    }
  }, [selectedTemplateName, metaTemplates, leadFirstName]);

  const handleVariableChange = (index: number, value: string) => {
    const newVars = [...templateVariableValues];
    newVars[index] = value;
    setTemplateVariableValues(newVars);
  };

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
  // Envío de plantilla oficial de Meta
  // -------------------------------------------------------------------------
  const handleSendTemplate = async () => {
    if (isDisabled || !selectedTemplateName) return;

    // Verificar que todas las variables obligatorias estén llenas
    const hasEmptyVars = templateVariableValues.some((v) => !v.trim());
    if (hasEmptyVars) {
      alert("Por favor llena todas las variables de la plantilla.");
      return;
    }

    const template = metaTemplates.find((t) => t.name === selectedTemplateName);
    const languageCode = template?.language || 'es'; // Fallback seguro

    setIsSendingTemplate(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          leadId           : lead.id,
          phone            : lead.phone,
          isTemplate       : true,
          templateName     : selectedTemplateName,
          templateVariables: templateVariableValues,
          languageCode     : languageCode,
        },
      });

      if (invokeError || !data?.success) {
        const errMsg = data?.error ?? invokeError?.message ?? 'Por favor intenta de nuevo.';
        alert(`Error al enviar plantilla: ${errMsg}`);
        return;
      }

      // Éxito
      setShowTemplateSelector(false);
      setSelectedTemplateName('');
      setTemplateVariableValues([]);
      
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

      {/* ── BOTÓN Y PANEL DE PLANTILLAS DINÁMICAS (Meta API) ───────────── */}
      <div className="border border-green-200 dark:border-green-800 rounded-xl overflow-hidden">
        <button
          onClick={toggleTemplateSelector}
          disabled={isDisabled || !lead.phone}
          className={`
            w-full flex items-center justify-between px-4 py-2 text-xs font-semibold
            transition-all duration-150
            ${isDisabled || !lead.phone
              ? 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
              : showTemplateSelector 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
                : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true">👋</span>
            <span>Plantillas Aprobadas (Meta)</span>
          </div>
          {showTemplateSelector ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>

        {showTemplateSelector && (
          <div className="p-4 bg-white dark:bg-slate-900 space-y-4 border-t border-green-100 dark:border-green-800/50">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center gap-2 text-xs text-green-600 animate-pulse">
                <SparklesIcon className="w-4 h-4 animate-spin" />
                Cargando plantillas desde Meta...
              </div>
            ) : metaTemplates.length === 0 ? (
              <p className="text-xs text-center text-gray-500">No se encontraron plantillas aprobadas.</p>
            ) : (
              <>
                <Select
                  id="meta-template-select"
                  label="Selecciona una plantilla"
                  value={selectedTemplateName}
                  onChange={(e) => setSelectedTemplateName(e.target.value)}
                  options={[
                    { value: '', label: '-- Elegir plantilla --' },
                    ...metaTemplates.map(t => ({ value: t.name, label: t.name.replace(/_/g, ' ') }))
                  ]}
                />

                {expectedVariablesCount > 0 && (
                  <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Variables Dinámicas</p>
                    {templateVariableValues.map((val, idx) => (
                      <Input
                        key={idx}
                        id={`template-var-${idx}`}
                        label={`Variable {{${idx + 1}}}`}
                        value={val}
                        onChange={(e) => handleVariableChange(idx, e.target.value)}
                        placeholder="Ej. Nombre, Fecha, etc."
                        required
                      />
                    ))}
                  </div>
                )}

                {selectedTemplateName && (
                  <button
                    onClick={handleSendTemplate}
                    disabled={isSendingTemplate || templateVariableValues.some(v => !v.trim())}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md shadow-green-200 dark:shadow-none transition-all disabled:opacity-50"
                  >
                    {isSendingTemplate ? (
                      <><SparklesIcon className="w-4 h-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><PaperAirplaneIcon className="w-4 h-4" /> Enviar Plantilla</>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

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
