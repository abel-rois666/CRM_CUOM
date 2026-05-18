// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ---------------------------------------------------------------------------
// CORS Headers — necesarios para peticiones desde el frontend React
// ---------------------------------------------------------------------------
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Utilidad: limpiar y normalizar número de teléfono
// Reglas:
//   - Eliminar todo lo que no sea dígito
//   - Si quedan 10 dígitos (México sin lada internacional) → prefijo "52"
//   - Si ya tiene 12 dígitos empezando con "52" → dejarlo como está
//   - Cualquier otro caso → dejarlo como está (puede ser internacional)
// ---------------------------------------------------------------------------
function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 10) return `52${digits}`
    return digits
}

// ---------------------------------------------------------------------------
// Utilidad: construir el payload para Meta según tipo de mensaje
//
// Modo texto libre  → type: "text"
// Modo plantilla    → type: "template"
//   - Si templateVariables tiene elementos, se incluye el componente "body"
//     con cada variable mapeada a { type: "text", text: valor }
//   - Si no hay variables, se omite el array components para simplificar
//     (Meta no requiere components cuando la plantilla no tiene parámetros)
// ---------------------------------------------------------------------------
function buildMetaPayload(
    cleanPhone: string,
    isTemplate: boolean,
    message: string,
    templateName?: string,
    templateVariables?: string[],
): Record<string, unknown> {
    if (isTemplate && templateName) {
        const hasVars = Array.isArray(templateVariables) && templateVariables.length > 0

        return {
            messaging_product: 'whatsapp',
            to               : cleanPhone,
            type             : 'template',
            template         : {
                name    : templateName,
                language: { code: 'es_MX' },
                ...(hasVars && {
                    components: [
                        {
                            type      : 'body',
                            parameters: templateVariables!.map((val) => ({
                                type: 'text',
                                text: val,
                            })),
                        },
                    ],
                }),
            },
        }
    }

    // Mensaje de texto libre (comportamiento original)
    return {
        messaging_product: 'whatsapp',
        to               : cleanPhone,
        type             : 'text',
        text             : { body: message },
    }
}

// ---------------------------------------------------------------------------
// Utilidad: generar el texto descriptivo que se guarda en la BD para plantillas
// Si la plantilla tiene variables, las interpolamos en orden para dar contexto
// en el historial del chat (ej: "[Plantilla: bienvenida_prospecto | Hola, Abel]")
// ---------------------------------------------------------------------------
function buildDbMessageBody(
    isTemplate: boolean,
    message: string,
    templateName?: string,
    templateVariables?: string[],
): string {
    if (!isTemplate || !templateName) return message

    const vars = Array.isArray(templateVariables) && templateVariables.length > 0
        ? ` | Variables: ${templateVariables.join(', ')}`
        : ''

    return `[Plantilla enviada: ${templateName}${vars}]`
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
serve(async (req) => {
    // Preflight CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method Not Allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    try {
        // -----------------------------------------------------------------------
        // 1. Validar autenticación del frontend
        // -----------------------------------------------------------------------
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // -----------------------------------------------------------------------
        // 2. Parsear body — soporta tanto texto libre como plantillas
        // -----------------------------------------------------------------------
        const {
            leadId,
            phone,
            message           = '',      // Puede ser vacío cuando se usa plantilla
            isTemplate        = false,
            templateName,
            templateVariables,
        } = await req.json()

        // Validación: o hay mensaje de texto, o hay nombre de plantilla
        if (!phone) {
            return new Response(
                JSON.stringify({ error: 'El campo phone es obligatorio.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!isTemplate && !message) {
            return new Response(
                JSON.stringify({ error: 'El campo message es obligatorio para mensajes de texto libre.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (isTemplate && !templateName) {
            return new Response(
                JSON.stringify({ error: 'El campo templateName es obligatorio cuando isTemplate es true.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const cleanPhone = normalizePhone(String(phone))

        if (cleanPhone.length < 10) {
            return new Response(
                JSON.stringify({ error: `Número de teléfono inválido: "${phone}"` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // -----------------------------------------------------------------------
        // 3. Leer secrets de entorno
        // -----------------------------------------------------------------------
        // @ts-ignore: Deno runtime
        const WA_ACCESS_TOKEN           = Deno.env.get('WA_ACCESS_TOKEN')
        // @ts-ignore: Deno runtime
        const WA_PHONE_NUMBER_ID        = Deno.env.get('WA_PHONE_NUMBER_ID')
        // @ts-ignore: Deno runtime
        const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? ''
        // @ts-ignore: Deno runtime
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID) {
            console.error('CRITICAL: WA_ACCESS_TOKEN o WA_PHONE_NUMBER_ID no configurados.')
            return new Response(
                JSON.stringify({ error: 'Server configuration error: Missing WhatsApp secrets.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // -----------------------------------------------------------------------
        // 4. Construir payload y enviar a Meta WhatsApp Cloud API
        // -----------------------------------------------------------------------
        const metaUrl     = `https://graph.facebook.com/v19.0/${WA_PHONE_NUMBER_ID}/messages`
        const metaPayload = buildMetaPayload(cleanPhone, isTemplate, message, templateName, templateVariables)

        console.log(
            `Sending WhatsApp ${isTemplate ? `template "${templateName}"` : 'text'} to ${cleanPhone}`
        )

        const metaResponse = await fetch(metaUrl, {
            method : 'POST',
            headers: {
                'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
                'Content-Type' : 'application/json',
            },
            body: JSON.stringify(metaPayload),
        })

        const metaData = await metaResponse.json()

        if (!metaResponse.ok) {
            console.error('Meta API error:', JSON.stringify(metaData))
            return new Response(
                JSON.stringify({
                    error  : 'Error al enviar el mensaje por WhatsApp.',
                    details: metaData?.error?.message ?? 'Unknown Meta error',
                }),
                { status: metaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const metaMessageId: string = metaData?.messages?.[0]?.id ?? null
        console.log(`Message sent successfully. Meta message ID: ${metaMessageId}`)

        // -----------------------------------------------------------------------
        // 5. Guardar en whatsapp_messages con descripción adecuada según tipo
        // -----------------------------------------------------------------------
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false },
        })

        const dbMessageBody = buildDbMessageBody(isTemplate, message, templateName, templateVariables)

        const { error: dbError } = await supabase
            .from('whatsapp_messages')
            .insert({
                lead_id        : leadId ?? null,
                direction      : 'outbound',
                message_body   : dbMessageBody,
                wa_message_id  : metaMessageId,
                wa_sender_phone: cleanPhone,
                status         : 'sent',
            })

        if (dbError) {
            // Fallo no crítico: el mensaje ya fue enviado a Meta, solo loggeamos
            console.error('DB insert error (message was sent to Meta):', dbError.message)
        } else {
            console.log('Outbound message saved to whatsapp_messages.')
        }

        // -----------------------------------------------------------------------
        // 6. Respuesta de éxito al frontend
        // -----------------------------------------------------------------------
        return new Response(
            JSON.stringify({
                success      : true,
                metaMessageId: metaMessageId,
                to           : cleanPhone,
                isTemplate   : isTemplate,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Unexpected error in send-whatsapp:', error)
        return new Response(
            JSON.stringify({ error: error.message ?? 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
