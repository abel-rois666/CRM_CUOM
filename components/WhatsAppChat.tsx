// components/WhatsAppChat.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import ArrowPathIcon from './icons/ArrowPathIcon';
import MessageInput, { LeadContext } from './MessageInput';
import { Lead, Licenciatura } from '../types';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface WhatsAppMessage {
  id           : string;
  lead_id      : string | null;
  direction    : 'inbound' | 'outbound';
  message_body : string;
  status       : string | null;
  created_at   : string;
  media_url?   : string | null;
  media_type?  : string | null;
}

interface WhatsAppChatProps {
  leadId       : string;
  phone        : string;
  lead         : Lead;           // necesario para la IA
  licenciaturas: Licenciatura[]; // necesario para la IA
}

// ---------------------------------------------------------------------------
// Utilidades de formato
// ---------------------------------------------------------------------------
const formatTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
};

const groupByDate = (messages: WhatsAppMessage[]) => {
  const groups: { date: string; messages: WhatsAppMessage[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const msgDate = formatDate(msg.created_at);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msgDate, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
const WhatsAppChat: React.FC<WhatsAppChatProps> = ({ leadId, phone, lead, licenciaturas }) => {
  const [messages,  setMessages]  = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Auto-scroll
  // -------------------------------------------------------------------------
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // -------------------------------------------------------------------------
  // Carga inicial
  // -------------------------------------------------------------------------
  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching WhatsApp messages:', fetchError);
      setError('No se pudieron cargar los mensajes.');
    } else {
      setMessages((data as WhatsAppMessage[]) ?? []);
    }
    setIsLoading(false);
  }, [leadId]);

  useEffect(() => { 
    fetchMessages(); 
    // Marcar como leído
    supabase.from('leads').update({ has_unread_messages: false }).eq('id', leadId).then();
  }, [fetchMessages, leadId]);

  // -------------------------------------------------------------------------
  // Realtime — INSERT en whatsapp_messages
  // -------------------------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel(`whatsapp_chat_${leadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          const newMsg = payload.new as WhatsAppMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leadId]);

  // -------------------------------------------------------------------------
  // Envío de mensaje (viene del MessageInput via onSendMessage)
  // -------------------------------------------------------------------------
  const handleSendMessage = async (text: string) => {
    if (!text || isSending) return;

    setIsSending(true);

    // Optimistic update: mostrar el mensaje de inmediato con estado "sending"
    const tempMsg: WhatsAppMessage = {
      id          : `temp_${Date.now()}`,
      lead_id     : leadId,
      direction   : 'outbound',
      message_body: text,
      status      : 'sending',
      created_at  : new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('send-whatsapp', {
        body: { leadId, phone, message: text },
      });

      // Siempre eliminar el tempMsg tras el invoke:
      // - Si hubo error → lo quitamos y mostramos alerta (no hay mensaje real en DB)
      // - Si tuvo éxito → lo quitamos aquí; Realtime añadirá el mensaje real desde DB
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));

      if (invokeError || !data?.success) {
        alert(`Error al enviar: ${data?.error ?? invokeError?.message ?? 'Por favor intenta de nuevo.'}`);
      }
    } catch (err: any) {
      // Garantizar limpieza también si el fetch mismo lanza (red, timeout, etc.)
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      alert(`Error inesperado: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // -------------------------------------------------------------------------
  // chatHistory para la IA: últimos 10 mensajes como texto
  // -------------------------------------------------------------------------
  const chatHistory = messages
    .slice(-10)
    .map(m => {
      const speaker = m.direction === 'outbound' ? 'Asesor' : 'Prospecto';
      const time    = formatTime(m.created_at);
      return `[${time}] ${speaker}: ${m.message_body}`;
    })
    .join('\n');

  const leadContext: LeadContext = { lead, licenciaturas, chatHistory };

  // -------------------------------------------------------------------------
  // Render: estados de carga / error
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <ArrowPathIcon className="w-6 h-6 animate-spin" />
        <p className="text-sm">Cargando conversación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500 gap-3">
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchMessages}
          className="text-xs text-brand-primary underline hover:opacity-80 transition-opacity"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const groups = groupByDate(messages);

  // -------------------------------------------------------------------------
  // Render: chat
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-4 py-3 bg-green-600 text-white flex items-center gap-2">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
          📱
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Conversación WhatsApp</p>
          <p className="text-xs text-green-100 font-mono">{phone}</p>
        </div>
        <button
          onClick={fetchMessages}
          title="Recargar mensajes"
          className="ml-auto text-white/70 hover:text-white transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Área de mensajes */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#ece5dd] dark:bg-gray-800"
        style={{ height: '380px', minHeight: '200px' }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Sin mensajes aún. ¡Inicia la conversación! 👋
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.date}>
              {/* Separador de fecha */}
              <div className="flex items-center justify-center my-3">
                <span className="bg-white/80 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs px-3 py-1 rounded-full shadow-sm">
                  {group.date}
                </span>
              </div>

              {/* Burbujas */}
              <div className="space-y-1">
                {group.messages.map((msg) => {
                  const isOutbound     = msg.direction === 'outbound';
                  const isTempSending  = msg.id.startsWith('temp_');

                  return (
                    <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`
                          max-w-[75%] px-3 py-2 rounded-2xl shadow-sm text-sm leading-relaxed
                          ${isOutbound
                            ? 'bg-green-100 dark:bg-green-800 text-gray-800 dark:text-green-50 rounded-tr-sm'
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                          }
                          ${isTempSending ? 'opacity-60' : 'opacity-100'}
                          transition-opacity duration-300
                        `}
                      >
                        {msg.media_type === 'image' && msg.media_url && (
                          <div className="relative group mb-2 inline-block">
                            <img src={msg.media_url} alt="Multimedia" className="max-w-full h-auto rounded-lg" style={{ maxHeight: '250px' }} />
                            <a 
                              href={msg.media_url} 
                              download 
                              target="_blank" 
                              rel="noreferrer"
                              className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Descargar imagen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                          </div>
                        )}
                        {msg.media_type === 'audio' && msg.media_url && (
                          <audio controls src={msg.media_url} className="w-full max-w-[240px] mb-2" />
                        )}
                        {msg.media_type === 'document' && msg.media_url && (
                          <a 
                            href={msg.media_url} 
                            download 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/10 rounded-lg hover:bg-black/10 dark:hover:bg-white/20 transition-colors mb-2 text-sm font-semibold text-blue-600 dark:text-blue-400"
                          >
                            <span>📄</span>
                            Descargar Documento
                          </a>
                        )}
                        {msg.message_body && (
                          <p className="whitespace-pre-wrap break-words">{msg.message_body}</p>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-gray-400">
                            {isTempSending ? 'Enviando...' : formatTime(msg.created_at)}
                          </span>
                          {isOutbound && !isTempSending && (
                            <span className="text-[10px] text-green-500" title={msg.status ?? ''}>
                              {msg.status === 'sent' ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Caja de herramientas inteligente */}
      <div className="px-3 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <MessageInput
          onSendMessage={handleSendMessage}
          leadContext={leadContext}
          isSending={isSending}
          showTextarea={false}
          placeholder="Escribe un mensaje..."
        />
      </div>
    </div>
  );
};

export default WhatsAppChat;
