// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Define CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        // 2. Parse Request Body
        // Nota: el campo `model` del body es ignorado intencionalmente.
        // Se fuerza el uso de los modelos de Groq definidos en fallbackModels.
        const { instruction, context, systemPrompt } = await req.json()

        // 3. Get Groq API Key from Secrets
        // @ts-ignore: Deno runtime
        const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

        // Diagnostic logging
        // @ts-ignore: Deno runtime
        const allEnvKeys = Array.from(Object.keys(Deno.env.toObject())).filter(k => !k.startsWith('SB_') && k !== 'SUPABASE_URL' && k !== 'SUPABASE_ANON_KEY' && k !== 'SUPABASE_SERVICE_ROLE_KEY' && k !== 'SUPABASE_DB_URL')
        console.log('Available custom env keys:', JSON.stringify(allEnvKeys))
        console.log('GROQ_API_KEY exists:', !!GROQ_API_KEY)
        console.log('GROQ_API_KEY length:', GROQ_API_KEY?.length || 0)

        if (!GROQ_API_KEY) {
            console.error('CRITICAL: GROQ_API_KEY is not set. Available keys:', JSON.stringify(allEnvKeys))
            throw new Error('Server configuration error: Missing GROQ_API_KEY')
        }

        // 4. Construct Prompt
        const messages = [
            { role: "system", content: (systemPrompt || "You are a helpful assistant.") + "\n\nIMPORTANTE: SIEMPRE responde en español." },
            {
                role: "user",
                content: context ? `${instruction}\n\nContexto:\n${context}` : instruction
            }
        ]

        // 5. Define Groq fallback model chain
        const fallbackModels = [
            "qwen/qwen3.6-27b",    // Modelo principal (Excelente velocidad y muy bueno redactando en español)
            "openai/gpt-oss-20b",  // Respaldo 1 (Rápido y eficiente para mensajes cortos)
            "groq/compound-mini"   // Respaldo 2 (Por si los demás saturan)
        ]

        let lastError = ''
        let generatedText = ''

        for (const currentModel of fallbackModels) {
            console.log('Trying model:', currentModel)
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: currentModel,
                    messages: messages
                })
            })

            if (response.ok) {
                const data = await response.json()
                generatedText = data.choices?.[0]?.message?.content || "No content generated"
                console.log('Success with model:', currentModel)
                break
            }

            // If rate-limited (429), try next model
            const errorText = await response.text()
            console.warn(`Model ${currentModel} failed (${response.status}):`, errorText)
            lastError = errorText

            if (response.status !== 429) {
                // Non-rate-limit error, don't try fallbacks
                try {
                    const errorData = JSON.parse(errorText)
                    throw new Error(errorData.error?.message || `Groq API Error ${response.status}`)
                } catch (parseErr) {
                    throw new Error(`Groq API Error ${response.status}: ${errorText}`)
                }
            }
        }

        if (!generatedText) {
            throw new Error('Todos los modelos están saturados. Intenta de nuevo en unos minutos.')
        }

        // 6. Return Result
        return new Response(
            JSON.stringify({ content: generatedText }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
