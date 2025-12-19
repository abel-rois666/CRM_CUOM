import { Lead } from '../types';
import { supabase } from '../lib/supabase';

// Helper Wrapper to call Edge Function
const callAIFunction = async (systemPrompt: string, userInstruction: string, context?: string, model?: string) => {
    try {
        const { data, error } = await supabase.functions.invoke('generate-ai-content', {
            body: {
                instruction: userInstruction,
                context,
                systemPrompt,
                model
            }
        });

        if (error) {
            console.error('Supabase Edge Function Error:', error);
            throw new Error(error.message || 'Error invocando función de IA');
        }

        if (!data || !data.content) {
            throw new Error('La IA no devolvió contenido.');
        }

        return data.content;

    } catch (err: any) {
        console.error('AI Service Error:', err);
        throw new Error(err.message || 'Error al conectar con el servicio de IA.');
    }
};

export const generateMessage = async (lead: Lead, context: string, type: 'whatsapp' | 'email', extraInstructions?: string): Promise<string> => {
    const systemPrompt = `
    Eres un experto asesor educativo de una universidad (CUOM). Tu tono es amable, profesional pero cercano, y persuasivo.
    Tu objetivo es reactivar el interés del alumno o confirmar su asistencia.
    
    Datos del alumno:
    - Nombre: ${lead.first_name} ${lead.paternal_last_name}
    - Programa de interés: ${lead.program_id || 'No especificado'}
    - Estatus actual: ${lead.status_id}
    
    Contexto adicional: ${context}
    
    Instrucciones base:
    - Escribe un mensaje corto para ${type === 'whatsapp' ? 'WhatsApp (máximo 50 palabras, usa emojis moderados)' : 'Email (breve y cordial)'}.
    - No uses saludos genéricos como "Estimado prospecto".
    - Ve al grano.
    - Si es WhatsApp, no uses "Asunto:".

    ${extraInstructions ? `INSTRUCCIÓN ADICIONAL PRIORITARIA: ${extraInstructions}` : ''}
    `;

    return callAIFunction(systemPrompt, "Genera el mensaje solicitado.");
};

export const generateLeadSummary = async (lead: Lead, statusName: string, programName: string): Promise<string> => {
    // 1. Historial de Notas
    const notesHistory = lead.follow_ups && lead.follow_ups.length > 0
        ? lead.follow_ups.map(f => `- ${new Date(f.created_at || f.date).toLocaleDateString()}: ${f.notes}`).join('\n')
        : 'Sin historial de notas.';

    // 2. Historial de Citas (Nuevo)
    const appointmentsHistory = lead.appointments && lead.appointments.length > 0
        ? lead.appointments.map(a => `- ${new Date(a.date).toLocaleDateString()} (${a.status}): ${a.title}`).join('\n')
        : 'Sin citas registradas.';

    const systemPrompt = `
    Eres un asistente analítico de CRM universitario.
    Tu objetivo es leer el historial COMPLETO (notas y citas) de un prospecto y generar un RESUMEN EJECUTIVO MUY BREVE (máximo 3 líneas).
    
    Datos del prospecto:
    - Nombre: ${lead.first_name} ${lead.paternal_last_name}
    - Programa de Interés: ${programName}
    - Estatus Actual: ${statusName}
    
    Historial de Notas:
    ${notesHistory}
    
    Historial de Citas:
    ${appointmentsHistory}
    
    Instrucciones:
    1. Integra la información de citas y notas. Si falló a una cita, es CRÍTICO mencionarlo. Si ya tiene cita agendada, menciónalo.
    2. Identifica el nivel de interés real, tomando en cuenta el estatus actual "${statusName}".
    3. Menciona el bloqueo principal o siguiente paso.
    4. Sé directo. Ejemplo: "Faltó a su cita de ayer. Dice tener problemas de transporte. Interés medio, reagendar para la próxima semana."
    `;

    return callAIFunction(systemPrompt, "Genera el resumen ejecutivo.");
};

export const generateAdvisorEvaluation = async (
    advisorName: string,
    metrics: {
        totalLeads: number;
        enrolled: number;
        active: number;
        lost: number;
        interactions: number;
        overdue: number;
        conversionRate: string;
        interactionRatio: string;
    }
): Promise<string> => {
    const systemPrompt = `
    Eres un gerente de ventas experto evaluando el desempeño de un asesor educativo.
    
    Datos del Asesor: ${advisorName}
    - Total Leads Asignados: ${metrics.totalLeads}
    - Inscritos (Cierres): ${metrics.enrolled}
    - Tasa de Conversión: ${metrics.conversionRate}%
    - Leads Activos (En seguimiento): ${metrics.active}
    - Leads Perdidos (Bajas): ${metrics.lost}
    - Interacciones Totales: ${metrics.interactions} (Promedio ${metrics.interactionRatio} por lead)
    - Tareas/Citas Vencidas: ${metrics.overdue}

    Objetivo: Generar un feedback constructivo y directo (máximo 4 líneas).
    Consideraciones:
    - Si la conversión es > 15%, felicita.
    - Si hay muchos leads activos pero pocos cierres, sugiere técnicas de cierre.
    - Si hay muchos atrasos (${metrics.overdue} > 5), sé firme sobre la gestión del tiempo.
    - Si hay pocas interacciones, motiva a contactar más.

    Formato de respuesta: Un párrafo breve de análisis y una recomendación accionable. Usa emojis.
    `;

    return callAIFunction(systemPrompt, "Genera la evaluación de desempeño.");
};

export const generateContent = async (instruction: string, context?: string): Promise<string> => {
    const systemPrompt = `
    Eres un asistente de redacción experto para una universidad (CRM).
    Tu objetivo es ayudar al usuario a redactar correos, boletines o mensajes profesionales.
    
    Directrices:
    - Redacción impecable, tono profesional pero cercano.
    - Si es un correo, incluye asunto sugerido si no se pide lo contrario.
    - Estructura clara (párrafos cortos).
    - Adaptate al objetivo (Venta, Cobranza, Invitación, etc.).
    `;

    return callAIFunction(systemPrompt, instruction, context);
};

