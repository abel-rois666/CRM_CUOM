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
import PaperClipIcon from './icons/PaperClipIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { useToast } from '../context/ToastContext';
import ConfirmationModal from './common/ConfirmationModal';

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
  /** Plantillas locales del CRM (Respuestas rápidas) */
  whatsappTemplates?: import('../types').WhatsAppTemplate[];
  /** Indica si el chat está bloqueado por la regla de 24h (deshabilita texto libre e IA) */
  isLocked        ?: boolean;
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
  whatsappTemplates   = [],
  isLocked            = false,
}) => {
  const { lead, licenciaturas, chatHistory } = leadContext;
  const { success, error: toastError } = useToast();

  const [message,           setMessage]           = useState(initialMessage);

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [isGenerating,      setIsGenerating]      = useState(false);
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);
  const [aiMode,            setAiMode]            = useState<'quick' | 'advanced'>('advanced');

  // --- Estado para plantillas dinámicas Meta ---
  const [isLoadingTemplates, setIsLoadingTemplates]     = useState(false);
  const [metaTemplates, setMetaTemplates]               = useState<any[]>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [templateVariableValues, setTemplateVariableValues] = useState<string[]>([]);
  const [expectedVariablesCount, setExpectedVariablesCount] = useState<number>(0);

  // --- Estado para pestañas y CRM ---
  const [activeTab, setActiveTab] = useState<'crm' | 'meta'>('crm');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedCrmTemplateId, setSelectedCrmTemplateId] = useState<string>('');
  const [crmVariables, setCrmVariables] = useState<string[]>([]);
  const [crmVariableValues, setCrmVariableValues] = useState<string[]>([]);

  // isDisabled bloquea el envío general por operaciones en curso. isLocked bloquea solo el texto libre por la regla de 24h.
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const isDisabled = isSending || isGenerating || isSendingTemplate || isUploading;
  const isFreeTextDisabled = isDisabled || isLocked;

  // Nombre completo del lead para autocompletar la 1ra variable si es posible
  const leadFirstName = lead.first_name?.trim() || 'Prospecto';

  // --- Estado para Catálogo Multimedia ---
  const [showCatalog, setShowCatalog] = useState(false);
  const [mediaCatalog, setMediaCatalog] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [itemToConfirmSend, setItemToConfirmSend] = useState<any>(null);

  const fetchMediaCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const { data, error } = await supabase.from('media_catalog').select('*').order('created_at', { ascending: false });
      if (!error && data) setMediaCatalog(data);
    } catch (err) {
      console.error("Error al cargar catálogo:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleOpenCatalog = () => {
    const nextState = !showCatalog;
    setShowCatalog(nextState);
    if (nextState && mediaCatalog.length === 0) {
      fetchMediaCatalog();
    }
  };

  const handleSendCatalogItem = async () => {
    if (isDisabled || !itemToConfirmSend) return;
    setIsUploading(true);
    setShowCatalog(false);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          leadId: lead.id,
          phone: lead.phone,
          mediaUrl: itemToConfirmSend.file_url,
          mediaType: itemToConfirmSend.file_type === 'image' ? 'image' : 'document',
          mediaName: itemToConfirmSend.name,
        },
      });
      if (error || !data?.success) throw error || new Error(data?.error);
      success("Archivo del catálogo enviado.");
    } catch (err: any) {
      console.error("Error al enviar desde catálogo:", err);
      toastError(`Error al enviar archivo del catálogo: ${err.message}`);
    } finally {
      setIsUploading(false);
      setItemToConfirmSend(null);
    }
  };

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
      toastError(`Error al cargar plantillas: ${err.message}`);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Agrupar plantillas CRM
  const templatesByCategory = React.useMemo(() => {
    const grouped: Record<string, import('../types').WhatsAppTemplate[]> = {};
    whatsappTemplates.forEach(t => {
      const cat = t.category || 'Sin Categoría';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });
    return grouped;
  }, [whatsappTemplates]);

  const loadMetaTemplatesIfNeeded = () => {
    if (metaTemplates.length === 0) fetchTemplates();
  };

  useEffect(() => {
    if (activeTab === 'meta') {
      loadMetaTemplatesIfNeeded();
    }
  }, [activeTab]);

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
  // Parsear variables de CRM
  // -------------------------------------------------------------------------
  const handleCrmTemplateClick = (t: import('../types').WhatsAppTemplate) => {
    setSelectedCrmTemplateId(t.id);
    let content = t.content;
    
    const matches = content.match(/\{[^{}]+\}/g);
    if (matches) {
      const uniqueVars = Array.from(new Set(matches));
      setCrmVariables(uniqueVars);
      
      let nextAppointment = lead.appointments?.find(a => a.status === 'scheduled' && new Date(a.date) > new Date());
      if (!nextAppointment) {
         // Si no hay citas futuras, tomar la cita 'scheduled' más reciente (útil para pruebas o citas de hoy)
         const scheduled = lead.appointments?.filter(a => a.status === 'scheduled') || [];
         scheduled.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
         nextAppointment = scheduled[0];
      }
      const programName = licenciaturas.find(l => l.id === lead.program_id)?.name || 'el programa';

      const initialVars = uniqueVars.map(v => {
         const lower = v.toLowerCase().replace(/[{}]/g, '');
         if (lower === 'nombre' || lower.match(/^\d+$/)) return leadFirstName;
         if (lower === 'apellido') return `${lead.paternal_last_name || ''} ${lead.maternal_last_name || ''}`.trim();
         if (lower === 'nombre_completo' || lower === 'nombre completo') return `${leadFirstName} ${lead.paternal_last_name || ''}`.trim();
         if (lower === 'telefono' || lower === 'celular' || lower === 'whatsapp') return lead.phone;
         if (lower === 'correo' || lower === 'email') return lead.email || '';
         if (lower === 'licenciatura' || lower === 'programa') return programName;
         if (nextAppointment) {
            const d = new Date(nextAppointment.date);
            if (lower.includes('fecha') || lower.includes('dia') || lower.includes('día')) {
               return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            }
            if (lower.includes('hora') || lower.includes('tiempo')) {
               return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            }
         }
         if (lower === 'asesor') return 'Cargando...';
         return '';
      });

      setCrmVariableValues(initialVars);
      syncCrmToMessage(content, uniqueVars, initialVars);

      const asesorIndex = uniqueVars.findIndex(v => v.toLowerCase().replace(/[{}]/g, '') === 'asesor');
      if (asesorIndex !== -1 && lead.advisor_id) {
          supabase.from('profiles').select('full_name').eq('id', lead.advisor_id).single()
          .then((res) => {
              const data = res.data as { full_name: string } | null;
              if (data?.full_name) {
                  setCrmVariableValues(prev => {
                      const updated = [...prev];
                      updated[asesorIndex] = data.full_name;
                      syncCrmToMessage(content, uniqueVars, updated);
                      return updated;
                  });
              } else {
                  setCrmVariableValues(prev => {
                      const updated = [...prev];
                      updated[asesorIndex] = 'Tu Asesor';
                      syncCrmToMessage(content, uniqueVars, updated);
                      return updated;
                  });
              }
          });
      }
    } else {
      setCrmVariables([]);
      setCrmVariableValues([]);
      setMessage(content);
    }
  };

  const syncCrmToMessage = (baseContent: string, vars: string[], values: string[]) => {
    let preview = baseContent;
    vars.forEach((v, idx) => {
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      preview = preview.replace(new RegExp(escaped, 'g'), values[idx]);
    });
    setMessage(preview);
  };

  const handleCrmVariableChange = (index: number, value: string) => {
    const newVars = [...crmVariableValues];
    newVars[index] = value;
    setCrmVariableValues(newVars);
    
    const t = whatsappTemplates.find(x => x.id === selectedCrmTemplateId);
    if (t) {
      syncCrmToMessage(t.content, crmVariables, newVars);
    }
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
      toastError('No se pudo generar el mensaje. Por favor intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------------------------------------------------------
  // Envío Multimedia (Temporales)
  // -------------------------------------------------------------------------
  const calculateSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Límite de 16MB
    if (file.size > 16 * 1024 * 1024) {
      toastError("El archivo excede el límite de 16MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
    
    // Limpiamos el input para poder seleccionar el mismo archivo si se cancela
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmFileUpload = async () => {
    if (!selectedFile) return;

    const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'document';
    setIsUploading(true);

    try {
      const hash = await calculateSHA256(selectedFile);
      const ext = selectedFile.name.split('.').pop() || 'bin';
      const fileName = `${hash}.${ext}`;
      const bucket = 'temp_media';

      // Verificar existencia intentando generar Signed URL directamente (10 años de validez)
      let { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 315360000);

      // Si da error, significa que no existe, entonces lo subimos
      if (signedUrlError || !signedUrlData?.signedUrl) {
         const { error: uploadError } = await supabase.storage
           .from(bucket)
           .upload(fileName, selectedFile, { upsert: true });
         
         if (uploadError) throw uploadError;

         // Obtener Signed URL nuevamente (10 años de validez)
         const { data: newSignedUrl, error: newSignedError } = await supabase.storage
           .from(bucket)
           .createSignedUrl(fileName, 315360000);
         
         if (newSignedError) throw newSignedError;
         signedUrlData = newSignedUrl;
      }

      const mediaUrl = signedUrlData?.signedUrl;
      if (!mediaUrl) throw new Error("No se pudo obtener la URL firmada.");

      // Enviar el mensaje multimedia
      const { data, error: invokeError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          leadId: lead.id,
          phone: lead.phone,
          mediaUrl: mediaUrl,
          mediaType: fileType,
          mediaName: selectedFile.name,
        },
      });

      if (invokeError || !data?.success) {
          let errMsg = data?.details ?? data?.error ?? invokeError?.message ?? 'Por favor intenta de nuevo.';
          if (invokeError && 'context' in invokeError) {
            try {
              const errBody = await (invokeError as any).context.json();
              errMsg = errBody.details || errBody.error || errMsg;
            } catch (e) { /* ignorar */ }
          }
          throw new Error(errMsg);
      }
      success("Archivo enviado.");
    } catch (error: any) {
      console.error("Error al procesar/enviar multimedia:", error);
      toastError(`Error al enviar archivo: ${error.message}`);
    } finally {
      setIsUploading(false);
      clearSelectedFile();
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (expectedVariablesCount > 0 && templateVariableValues.some(v => !v.trim())) {
      toastError("Por favor llena todas las variables de la plantilla.");
      return;
    }

    const template = metaTemplates.find((t) => t.name === selectedTemplateName);
    const languageCode = template?.language || 'es'; // Fallback seguro

    // Generar el texto exacto que se previsualiza para guardarlo en la base de datos
    let previewText = '';
    const header = template?.components.find((c: any) => c.type === 'HEADER');
    if (header && header.format === 'TEXT' && header.text) previewText += `*${header.text}*\n\n`;
    
    let bodyPreview = template?.components.find((c: any) => c.type === 'BODY')?.text || '';
    templateVariableValues.forEach((val, idx) => {
      bodyPreview = bodyPreview.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val.trim());
    });
    previewText += bodyPreview;
    
    const footer = template?.components.find((c: any) => c.type === 'FOOTER');
    if (footer && footer.text) previewText += `\n\n_${footer.text}_`; // Guardar footer en itálica simulada

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
          previewText      : previewText, // <-- Nuevo campo para el historial
        },
      });

      if (invokeError || !data?.success) {
        let errMsg = data?.details ?? data?.error ?? invokeError?.message ?? 'Por favor intenta de nuevo.';
        
        // Extraer el error real de la API si supabase-js devuelve un error 400/500 (context)
        if (invokeError && 'context' in invokeError) {
          try {
            const errBody = await (invokeError as any).context.json();
            errMsg = errBody.details || errBody.error || errMsg;
          } catch (e) { /* ignorar si no es JSON */ }
        }

        toastError(`Error al enviar plantilla: ${errMsg}`);
        return;
      }

      // Éxito
      success("Plantilla enviada exitosamente.");
      setSelectedTemplateName('');
      setTemplateVariableValues([]);
      
    } catch (err: any) {
      console.error('Template send error:', err);
      toastError(`Error inesperado al enviar plantilla: ${err.message}`);
    } finally {
      setIsSendingTemplate(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <>
    <div className="space-y-3">
      {/* ── BOTÓN TOGGLE DE OPCIONES AVANZADAS ── */}
      <div className="pb-1">
        <button
          onClick={() => {
            const nextState = !isAdvancedOpen;
            setIsAdvancedOpen(nextState);
            if (!nextState) {
               setActiveTab('crm');
            }
          }}
          className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-brand-primary" />
            <span>Plantillas e IA Avanzada</span>
          </span>
          {isAdvancedOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
      </div>

      {isAdvancedOpen && (
        <div className="space-y-3 animate-fade-in border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 bg-white/50 dark:bg-slate-900/50">
          {/* PESTAÑAS (Solo si hay plantillas CRM o si se usa en contexto general) */}
          <div className="flex border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('crm')}
          className={`flex-1 sm:flex-none px-4 py-2.5 font-bold text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'crm' 
              ? 'border-brand-primary text-brand-primary dark:text-brand-secondary dark:border-brand-secondary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
          }`}
          title="Gratuitas. Úsalas en vivo mientras la ventana de 24h esté activa."
        >
          Respuestas Rápidas (CRM)
        </button>
        <button
          onClick={() => setActiveTab('meta')}
          className={`flex-1 sm:flex-none px-4 py-2.5 font-bold text-xs sm:text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'meta' 
              ? 'border-brand-primary text-brand-primary dark:text-brand-secondary dark:border-brand-secondary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
          }`}
          title="Tienen costo. Úsalas para iniciar o reactivar chat tras 24h."
        >
          Plantillas Oficiales (Meta)
        </button>
      </div>

      {activeTab === 'crm' && (
        <>
          {/* PLANTILLAS CRM */}
          {whatsappTemplates.length > 0 && (
            <div className="bg-white dark:bg-slate-900 space-y-4">
              <Select
                id="crm-template-select"
                label="Selecciona una Respuesta Rápida"
                value={selectedCrmTemplateId}
                disabled={isFreeTextDisabled}
                onChange={(e) => {
                  const t = whatsappTemplates.find(x => x.id === e.target.value);
                  if (t) {
                    handleCrmTemplateClick(t);
                  } else {
                    setSelectedCrmTemplateId('');
                    setCrmVariables([]);
                    setCrmVariableValues([]);
                    setMessage('');
                  }
                }}
                options={[
                  { value: '', label: '-- Elegir respuesta rápida --' },
                  ...Object.entries(templatesByCategory).flatMap(([category, catTemplates]) => [
                    // Opciones agrupadas simuladas (el componente Select nativo soporta optgroup si modificamos el componente Select, pero por ahora lo aplanamos con un prefijo visual)
                    ...catTemplates.map(t => ({ value: t.id, label: `[${category}] ${t.name}` }))
                  ])
                ]}
              />
            </div>
          )}

          {/* VARIABLES CRM DINÁMICAS (Cualquier texto entre llaves) */}
          {selectedCrmTemplateId && crmVariables.length > 0 && (
            <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 animate-fade-in">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Variables de la Respuesta Rápida</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {crmVariables.map((v, idx) => (
                  <Input
                    key={idx}
                    id={`crm-template-var-${idx}`}
                    label={`Variable ${v}`}
                    value={crmVariableValues[idx]}
                    onChange={(e) => handleCrmVariableChange(idx, e.target.value)}
                    placeholder={`Valor para ${v}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-gray-400 italic">Los cambios se reflejarán inmediatamente en la caja de mensaje abajo.</p>
            </div>
          )}

          {/* ── Fila superior: instrucción IA + botones IA ───────────────────── */}
          <div className="flex flex-col sm:flex-row items-end gap-2">
            <div className="flex-grow w-full">
              <Input
                id="msg-input-extra-instructions"
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                placeholder="Instrucción extra para la IA (opcional)..."
                label={showTextarea ? 'Instrucción extra (Opcional)' : undefined}
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              {/* IA Rápida */}
              <Tooltip content="IA Rápida: Mensaje breve y directo." position="top">
                <button
                  onClick={() => handleAiGenerate('quick')}
                  disabled={isFreeTextDisabled}
                  className={`flex-1 sm:flex-none justify-center flex items-center gap-1 px-3 py-1.5 sm:py-1 rounded-full text-xs font-bold shadow-sm transition-all transform hover:-translate-y-0.5 ${
                    isFreeTextDisabled
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
                  disabled={isFreeTextDisabled}
                  className={`flex-1 sm:flex-none justify-center flex items-center gap-1 px-3 py-1.5 sm:py-1 rounded-full text-xs font-bold text-white shadow-sm transition-all transform hover:-translate-y-0.5 ${
                    isFreeTextDisabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-purple-200 dark:shadow-none hover:shadow-md'
                  }`}
                >
                  <SparklesIcon className={`w-3 h-3 ${isGenerating && aiMode === 'advanced' ? 'animate-spin' : ''}`} />
                  {isGenerating && aiMode === 'advanced' ? '...' : 'IA Avanzada'}
                </button>
              </Tooltip>
            </div>
          </div>
        </>
      )}

      {/* PESTAÑA META */}
      {activeTab === 'meta' && (
        <div className="border border-green-200 dark:border-green-800 rounded-xl overflow-hidden animate-fade-in">
          <div className="bg-green-50 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b border-green-100 dark:border-green-800/50">
            <span aria-hidden="true">👋</span>
            <span>Plantillas Aprobadas (Meta)</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 space-y-4">
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
                  <div className="space-y-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 animate-fade-in">
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

                {/* VISTA PREVIA DE PLANTILLA */}
                {selectedTemplateName && (
                  <div className="relative mt-2 p-3 bg-[#efeae2] dark:bg-[#0b141a] rounded-lg border border-[#d1c9c1] dark:border-[#202c33] shadow-inner overflow-hidden animate-fade-in">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Vista Previa</p>
                    <div className="relative bg-white dark:bg-[#202C33] p-3 rounded-xl rounded-tl-none shadow-sm text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed inline-block max-w-full break-words">
                      {/* Triangulito simulando burbuja de WhatsApp */}
                      <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white dark:border-t-[#202C33] border-l-[10px] border-l-transparent"></div>
                      {(() => {
                        const template = metaTemplates.find(t => t.name === selectedTemplateName);
                        let previewText = '';
                        
                        // Agregar HEADER si existe (ej. texto)
                        const header = template?.components.find((c: any) => c.type === 'HEADER');
                        if (header && header.format === 'TEXT' && header.text) {
                          previewText += `*${header.text}*\n\n`; // WhatsApp bold
                        }

                        // Agregar BODY
                        const body = template?.components.find((c: any) => c.type === 'BODY')?.text || '';
                        let bodyPreview = body;
                        templateVariableValues.forEach((val, idx) => {
                          const replacement = val.trim() !== '' ? val : `[Variable ${idx + 1}]`;
                          bodyPreview = bodyPreview.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), replacement);
                        });
                        previewText += bodyPreview;

                        // Agregar FOOTER si existe
                        const footer = template?.components.find((c: any) => c.type === 'FOOTER');
                        if (footer && footer.text) {
                          previewText += `\n\n<span class="text-xs text-gray-400 dark:text-gray-500">${footer.text}</span>`;
                        }

                        if (!previewText) return <span className="text-gray-400 italic">Sin contenido preview</span>;

                        return (
                          <div dangerouslySetInnerHTML={{ 
                            __html: previewText.replace(/\n/g, '<br/>')
                          }} />
                        );
                      })()}
                    </div>
                  </div>
                )}

                {selectedTemplateName && (
                  <button
                    onClick={handleSendTemplate}
                    disabled={isSendingTemplate || templateVariableValues.some(v => !v.trim())}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md shadow-green-200 dark:shadow-none transition-all disabled:opacity-50 mt-4"
                  >
                    {isSendingTemplate ? (
                      <><SparklesIcon className="w-4 h-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><PaperAirplaneIcon className="w-4 h-4" /> Enviar Plantilla Oficial</>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
        </div>
      )}

      {/* ── MODO TEXTAREA Y MODO INPUT INLINE ── (Solo se muestra en CRM para enviar) ────── */}
      {activeTab === 'crm' && (
        <div className="animate-fade-in mt-4">
          {showTextarea ? (
            <div>
              {selectedCrmTemplateId && (
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Vista Previa / Edición Libre</p>
              )}
              <textarea
                id="msg-input-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                disabled={isFreeTextDisabled}
                placeholder={isLocked ? "🔒 Envío bloqueado (Regla 24h Meta). Usa una plantilla oficial o desbloquea manualmente." : "El mensaje generado o redactado aparecerá aquí..."}
                className="
                  w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent
                  disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
                  resize-none transition-all
                "
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2 relative">
              {/* VISTA PREVIA DE ARCHIVO SELECCIONADO */}
              {selectedFile && (
                <div className="mb-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col gap-2 animate-fade-in relative shadow-sm">
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    disabled={isUploading}
                    className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-gray-700/80 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full text-gray-600 hover:text-red-600 dark:text-gray-300 transition-colors z-10 shadow-sm"
                    title="Cancelar envío de archivo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                  
                  <div className="flex items-center gap-3">
                    {filePreviewUrl ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0 bg-black/5">
                        <img src={filePreviewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-lg flex items-center justify-center border border-blue-200 dark:border-blue-800 flex-shrink-0">
                        <DocumentTextIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden pr-6">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleConfirmFileUpload}
                    disabled={isUploading}
                    className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {isUploading ? (
                      <><SparklesIcon className="w-4 h-4 animate-spin" /> Enviando Adjunto...</>
                    ) : (
                      <><PaperAirplaneIcon className="w-4 h-4" /> Enviar {selectedFile.type.startsWith('image/') ? 'Imagen' : 'Documento'}</>
                    )}
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2 relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp,application/pdf" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isDisabled || !!selectedFile}
                  title="Adjuntar imagen o PDF (Temporal)"
                  className="absolute left-2 bottom-2 text-gray-400 hover:text-green-500 disabled:opacity-50 transition-colors p-1 z-10"
                >
                  <PaperClipIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenCatalog}
                  disabled={isDisabled || !!selectedFile}
                  title="Catálogo Oficial"
                  className="absolute left-9 bottom-2 text-gray-400 hover:text-green-500 disabled:opacity-50 transition-colors p-1 z-10"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                </button>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isFreeTextDisabled}
                  rows={3}
                  placeholder={
                    isLocked            ? '🔒 Envío bloqueado (Regla 24h de Meta)...' :
                    isGenerating        ? 'Generando mensaje con IA...' :
                    isSendingTemplate   ? 'Enviando plantilla...'       :
                    isUploading         ? 'Subiendo y procesando archivo...' :
                    placeholder
                  }
                  className="
                    flex-1 pl-16 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600
                    bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent
                    disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:cursor-not-allowed 
                    transition-all resize-none custom-scrollbar
                  "
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || isFreeTextDisabled || !!selectedFile}
                  title="Enviar mensaje"
                className="
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  bg-green-500 hover:bg-green-600 active:scale-95
                  text-white shadow-md shadow-green-200 dark:shadow-none
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                  transition-all duration-150 mb-1
                "
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
            {isUploading && !selectedFile && (
              <p className="text-xs text-green-500 dark:text-green-400 animate-pulse flex items-center gap-1 pl-1 mt-1">
                <SparklesIcon className="w-3 h-3" />
                Procesando archivo...
              </p>
            )}

            {/* Menú de Catálogo Multimedia */}
            {showCatalog && (
              <div className="absolute bottom-16 left-0 w-64 max-h-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-y-auto custom-scrollbar p-2">
                <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-500 uppercase">Catálogo Oficial</span>
                  <button onClick={() => setShowCatalog(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
                {isLoadingCatalog ? (
                  <p className="text-xs text-gray-400 p-2 text-center">Cargando...</p>
                ) : mediaCatalog.length === 0 ? (
                  <p className="text-xs text-gray-400 p-2 text-center">No hay archivos en el catálogo.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {mediaCatalog.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setItemToConfirmSend(item); setShowCatalog(false); }}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-left transition-colors"
                      >
                        {item.file_type === 'image' ? <PaperClipIcon className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <DocumentTextIcon className="w-4 h-4 text-red-500 flex-shrink-0" />}
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          )}
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
      <ConfirmationModal
        isOpen={!!itemToConfirmSend}
        onClose={() => setItemToConfirmSend(null)}
        onConfirm={handleSendCatalogItem}
        title="Enviar Archivo del Catálogo"
        message={
          <>
            ¿Estás seguro de enviar <strong>{itemToConfirmSend?.name}</strong> a este prospecto?
            <br /><br />
            El archivo se enviará inmediatamente al confirmar.
          </>
        }
        confirmButtonText="Sí, enviar archivo"
        confirmButtonVariant="primary"
      />
    </>
  );
};

export default MessageInput;
