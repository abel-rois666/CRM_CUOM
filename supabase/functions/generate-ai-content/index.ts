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
        const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
        if (!OPENROUTER_API_KEY) {
            console.error('Missing OPENROUTER_API_KEY')
            throw new Error('Server configuration error')
        }

        // 4. Construct Prompt
        const messages = [
            { role: "system", content: systemPrompt || "You are a helpful assistant." },
            {
                role: "user",
                content: context ? `${instruction}\n\nContexto:\n${context}` : instruction
            }
        ]

        // 5. Call OpenRouter
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://crm-cuom.com", // Replace with actual domain
                "X-Title": "CRM CUOM System"
            },
            body: JSON.stringify({
                model: model || "meta-llama/llama-3.3-70b-instruct:free",
                messages: messages
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error?.message || `OpenRouter Error: ${response.statusText}`)
        }

        const data = await response.json()
        const generatedText = data.choices?.[0]?.message?.content || "No content generated"

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
