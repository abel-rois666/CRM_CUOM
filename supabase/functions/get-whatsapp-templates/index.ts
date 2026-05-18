// supabase/functions/get-whatsapp-templates/index.ts
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Preflight CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: corsHeaders })
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    try {
        // 1. Validar autenticación
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // @ts-ignore
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
        // @ts-ignore
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        })

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Obtener credenciales de Meta
        // @ts-ignore
        const WA_ACCESS_TOKEN = Deno.env.get('WA_ACCESS_TOKEN')
        // @ts-ignore
        const WHATSAPP_BUSINESS_ACCOUNT_ID = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID')

        if (!WA_ACCESS_TOKEN || !WHATSAPP_BUSINESS_ACCOUNT_ID) {
            return new Response(
                JSON.stringify({ error: 'Server configuration error: Missing Meta secrets.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Consultar Meta API
        const metaUrl = `https://graph.facebook.com/v20.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?limit=100`

        const metaResponse = await fetch(metaUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
            },
        })

        const metaData = await metaResponse.json()

        if (!metaResponse.ok) {
            return new Response(
                JSON.stringify({ error: 'Error fetching templates from Meta', details: metaData }),
                { status: metaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4. Filtrar y mapear templates (solo los APPROVED)
        const templates = metaData.data || []
        const approvedTemplates = templates.filter((t: any) => t.status === 'APPROVED').map((t: any) => ({
            id: t.id,
            name: t.name,
            language: t.language,
            category: t.category,
            components: t.components,
        }))

        return new Response(
            JSON.stringify({ data: approvedTemplates }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error in get-whatsapp-templates:', error)
        return new Response(
            JSON.stringify({ error: error.message ?? 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
