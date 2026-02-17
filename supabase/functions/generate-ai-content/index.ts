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
        // The user's JWT is automatically validated by Supabase Edge Functions when passed in Authorization header
        // access to context.user is available but we can rely on RLS/Auth layer mostly.
        // However, we should check if the Authorization header is present to ensure it's an authenticated request.
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        // 2. Parse Request Body
        const { instruction, context, systemPrompt, model } = await req.json()

        // 3. Get API Key from Secrets
        // @ts-ignore: Deno runtime
        const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')

        // Diagnostic logging
        // @ts-ignore: Deno runtime
        const allEnvKeys = Array.from(Object.keys(Deno.env.toObject())).filter(k => !k.startsWith('SB_') && k !== 'SUPABASE_URL' && k !== 'SUPABASE_ANON_KEY' && k !== 'SUPABASE_SERVICE_ROLE_KEY' && k !== 'SUPABASE_DB_URL')
        console.log('Available custom env keys:', JSON.stringify(allEnvKeys))
        console.log('OPENROUTER_API_KEY exists:', !!OPENROUTER_API_KEY)
        console.log('OPENROUTER_API_KEY length:', OPENROUTER_API_KEY?.length || 0)

        if (!OPENROUTER_API_KEY) {
            console.error('CRITICAL: OPENROUTER_API_KEY is not set. Available keys:', JSON.stringify(allEnvKeys))
            throw new Error('Server configuration error: Missing OPENROUTER_API_KEY')
        }

        // 4. Construct Prompt
        const messages = [
            { role: "system", content: (systemPrompt || "You are a helpful assistant.") + "\n\nIMPORTANTE: SIEMPRE responde en español." },
            {
                role: "user",
                content: context ? `${instruction}\n\nContexto:\n${context}` : instruction
            }
        ]

        const fallbackModels = [
            model || "arcee-ai/trinity-large-preview:free",
            "deepseek/deepseek-r1-0528:free",
        ]

        let lastError = ''
        let generatedText = ''

        for (const currentModel of fallbackModels) {
            console.log('Trying model:', currentModel)
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://crm-cuom.com",
                    "X-Title": "CRM CUOM System"
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
                    throw new Error(errorData.error?.message || `OpenRouter Error ${response.status}`)
                } catch (parseErr) {
                    throw new Error(`OpenRouter Error ${response.status}: ${errorText}`)
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
