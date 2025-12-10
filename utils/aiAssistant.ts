import { Lead } from '../types';

// Usamos la nueva variable de entorno para OpenRouter
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export const generateMessage = async (lead: Lead, context: string, type: 'whatsapp' | 'email', extraInstructions?: string): Promise<string> => {
    if (!API_KEY) {
        throw new Error('Falta la API Key de OpenRouter. Configura VITE_OPENROUTER_API_KEY en tu archivo .env');
    }

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

    try {
        // Usamos fetch directo a OpenRouter para no instalar SDKs extra
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                // "HTTP-Referer": window.location.origin, // Opcional para ranking OpenRouter
                // "X-Title": "CRM CUOM" // Opcional
            },
            body: JSON.stringify({
                "model": "meta-llama/llama-3.3-70b-instruct:free", // Modelo gratuito y potente del ejemplo
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": "Genera el mensaje solicitado." }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenRouter Error:", errorData);
            throw new Error(errorData.error?.message || `Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        // OpenRouter sigue el formato de OpenAI
        const generatedText = data.choices?.[0]?.message?.content;

        if (!generatedText) {
            throw new Error('La IA no devolvió texto.');
        }

        return generatedText.trim();

    } catch (error) {
        console.error('Error generating AI message with OpenRouter:', error);
        throw error;
    }
};
