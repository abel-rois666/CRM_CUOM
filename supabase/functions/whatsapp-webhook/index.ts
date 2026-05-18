// supabase/functions/whatsapp-webhook/index.ts
// ---------------------------------------------------------------------------
// Webhook oficial de Meta — recibe mensajes entrantes Y actualizaciones
// de estado (delivered, read, sent) para mantener el historial sincronizado.
// ---------------------------------------------------------------------------
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin' : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Tipos del payload de Meta
// ---------------------------------------------------------------------------
interface MetaStatusUpdate {
    id          : string   // wa_message_id del mensaje SALIENTE
    status      : 'sent' | 'delivered' | 'read' | 'failed'
    timestamp   : string
    recipient_id: string
    errors?     : { code: number; title: string }[]
}

interface MetaEntry {
    id: string
    changes: {
        value: {
            messaging_product: string
            metadata: { display_phone_number: string; phone_number_id: string }
            contacts?: { profile: { name: string }; wa_id: string }[]
            messages?: {
                from     : string
                id       : string
                timestamp: string
                type     : string
                text?    : { body: string }
            }[]
            statuses?: MetaStatusUpdate[]
        }
        field: string
    }[]
}

interface MetaWebhookPayload {
    object: string
    entry?: MetaEntry[]
}

// ---------------------------------------------------------------------------
// Utilidad: crear cliente Supabase con Service Role (bypassa RLS)
// ---------------------------------------------------------------------------
function getSupabaseClient() {
    // @ts-ignore: Deno runtime
    const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? ''
    // @ts-ignore: Deno runtime
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    })
}

// ---------------------------------------------------------------------------
// Utilidad: resolver UUIDs obligatorios para crear un lead nuevo
// Ejecuta 4 queries en paralelo; si alguno falla lanza un error.
// ---------------------------------------------------------------------------
async function resolveNewLeadIds(supabase: ReturnType<typeof getSupabaseClient>) {
    const [statusRes, sourceRes, programRes, adminRes] = await Promise.all([
        supabase.from('statuses').select('id').ilike('name', '%sin contactar%').limit(1).maybeSingle(),
        supabase.from('sources').select('id').ilike('name', '%whatsapp%').limit(1).maybeSingle(),
        supabase.from('licenciaturas').select('id').ilike('name', '%por definir%').limit(1).maybeSingle(),
        supabase.from('profiles').select('id').eq('role', 'admin').limit(1).maybeSingle(),
    ])

    // Fallbacks: si "Sin Contactar" no existe, toma el primer status disponible
    let statusId = statusRes.data?.id
    if (!statusId) {
        const { data } = await supabase.from('statuses').select('id').order('created_at').limit(1).maybeSingle()
        statusId = data?.id
    }

    // Fallback: si "Por Definir" no existe, toma la primera licenciatura
    let programId = programRes.data?.id
    if (!programId) {
        const { data } = await supabase.from('licenciaturas').select('id').order('name').limit(1).maybeSingle()
        programId = data?.id
    }

    const sourceId  = sourceRes.data?.id
    const advisorId = adminRes.data?.id

    if (!statusId)  throw new Error('No hay ningún status en la tabla statuses.')
    if (!sourceId)  throw new Error('No hay ninguna fuente "WhatsApp" en sources.')
    if (!programId) throw new Error('No hay ningún programa en licenciaturas.')
    if (!advisorId) throw new Error('No hay ningún perfil admin en profiles.')

    return { statusId, sourceId, programId, advisorId }
}

// ---------------------------------------------------------------------------
// Handler: procesar mensaje de texto ENTRANTE
// ---------------------------------------------------------------------------
async function handleInboundMessage(
    supabase: ReturnType<typeof getSupabaseClient>,
    from        : string,
    waMessageId : string,
    messageBody : string,
    profileName : string,
) {
    let leadId: string | null = null

    // 1. Buscar lead por teléfono
    const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .ilike('phone', `%${from}%`)
        .maybeSingle()

    if (existingLead) {
        leadId = existingLead.id
        console.log(`Lead existente encontrado: ${leadId}`)
    } else {
        // 2. Lead nuevo — auto-crear respetando NOT NULL
        console.log(`Número desconocido ${from}. Creando lead...`)
        try {
            const { statusId, sourceId, programId, advisorId } = await resolveNewLeadIds(supabase)

            const firstName       = profileName.split(' ')[0]
            const paternalLastName = profileName.split(' ').slice(1).join(' ').trim() || 'Sin Identificar'

            const { data: newLead, error: insertErr } = await supabase
                .from('leads')
                .insert({
                    first_name        : firstName,
                    paternal_last_name: paternalLastName,
                    phone             : from,
                    status_id         : statusId,
                    source_id         : sourceId,
                    program_id        : programId,
                    advisor_id        : advisorId,   // Bandeja del admin
                    registration_date : new Date().toISOString(),
                })
                .select('id')
                .single()

            if (insertErr) {
                console.error('Error creando lead:', insertErr.message)
            } else {
                leadId = newLead.id
                console.log(`Lead creado: ${leadId} (${firstName} ${paternalLastName})`)
            }
        } catch (resolveErr: any) {
            console.error('No se pudieron resolver UUIDs para el lead:', resolveErr.message)
        }
    }

    // 3. Guardar mensaje — siempre, aunque leadId sea null
    const { error: msgErr } = await supabase
        .from('whatsapp_messages')
        .insert({
            lead_id        : leadId,
            direction      : 'inbound',
            message_body   : messageBody,
            wa_message_id  : waMessageId,
            wa_sender_phone: from,
            status         : 'received',
        })

    if (msgErr) {
        // Ignorar duplicados (restricción UNIQUE en wa_message_id)
        if (msgErr.code !== '23505') {
            console.error('Error guardando mensaje entrante:', msgErr.message)
        }
    } else {
        console.log(`Mensaje inbound guardado. lead_id=${leadId ?? 'null'}`)
    }
}

// ---------------------------------------------------------------------------
// Handler: procesar actualización de estado de mensaje SALIENTE
// Meta envía estos eventos cuando el destinatario recibe/lee un mensaje.
// Los usamos para actualizar el campo `status` en whatsapp_messages.
// ---------------------------------------------------------------------------
async function handleStatusUpdate(
    supabase      : ReturnType<typeof getSupabaseClient>,
    statusUpdate  : MetaStatusUpdate,
) {
    const { id: waMessageId, status } = statusUpdate

    // Solo persistimos estados relevantes para la UI del chat
    if (!['sent', 'delivered', 'read', 'failed'].includes(status)) return

    const { error } = await supabase
        .from('whatsapp_messages')
        .update({ status })
        .eq('wa_message_id', waMessageId)

    if (error) {
        console.error(`Error actualizando status (${status}) para ${waMessageId}:`, error.message)
    } else {
        console.log(`Status actualizado: ${waMessageId} → ${status}`)
    }
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------
serve(async (req) => {
    // Preflight CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // ── GET: verificación del webhook por Meta ──────────────────────────
    if (req.method === 'GET') {
        const url       = new URL(req.url)
        const mode      = url.searchParams.get('hub.mode')
        const token     = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        // @ts-ignore: Deno runtime
        const WA_VERIFY_TOKEN = Deno.env.get('WA_VERIFY_TOKEN')

        console.log('Webhook verification:', { mode, token, challenge })

        if (mode === 'subscribe' && token === WA_VERIFY_TOKEN) {
            console.log('Webhook verificado correctamente.')
            return new Response(challenge ?? '', {
                status : 200,
                headers: { 'Content-Type': 'text/plain' },
            })
        }

        console.warn('Verificación FALLIDA — token incorrecto.')
        return new Response('Forbidden', { status: 403 })
    }

    // ── POST: eventos entrantes de Meta ─────────────────────────────────
    // CRÍTICO: Meta reintentar si recibe algo distinto de 200 en < 20s.
    // Todo error de lógica debe capturarse internamente.
    if (req.method === 'POST') {
        let body: MetaWebhookPayload

        try {
            body = await req.json()
        } catch {
            return new Response('EVENT_RECEIVED', { status: 200 })
        }

        if (body.object !== 'whatsapp_business_account') {
            return new Response('EVENT_RECEIVED', { status: 200 })
        }

        const entry  = body.entry?.[0]
        const change = entry?.changes?.[0]
        const value  = change?.value

        if (!value) return new Response('EVENT_RECEIVED', { status: 200 })

        const supabase = getSupabaseClient()

        // ── Rama A: mensajes de texto entrantes ──────────────────────────
        const message = value.messages?.[0]

        if (message && message.type === 'text') {
            const from        = message.from
            const waMessageId = message.id
            const messageBody = message.text?.body ?? ''
            const profileName = value.contacts?.[0]?.profile?.name || `Lead-${from.slice(-4)}`

            console.log(`Inbound de ${from} (${profileName}): "${messageBody}"`)

            try {
                await handleInboundMessage(supabase, from, waMessageId, messageBody, profileName)
            } catch (err) {
                console.error('Error inesperado en handleInboundMessage:', err)
            }
        }

        // ── Rama B: mensajes no-texto (imagen, audio, video, etc.) ───────
        if (message && message.type !== 'text') {
            console.log(`Mensaje tipo "${message.type}" recibido de ${message.from}. Solo texto soportado.`)
            // Guardamos un registro del mensaje no soportado si el lead existe
            try {
                const { data: lead } = await supabase
                    .from('leads')
                    .select('id')
                    .ilike('phone', `%${message.from}%`)
                    .maybeSingle()

                if (lead?.id) {
                    await supabase.from('whatsapp_messages').insert({
                        lead_id        : lead.id,
                        direction      : 'inbound',
                        message_body   : `[Mensaje de tipo "${message.type}" — no soportado en texto]`,
                        wa_message_id  : message.id,
                        wa_sender_phone: message.from,
                        status         : 'received',
                    })
                }
            } catch { /* silencioso */ }
        }

        // ── Rama C: actualizaciones de estado (delivered, read, etc.) ────
        const statuses = value.statuses ?? []
        for (const statusUpdate of statuses as MetaStatusUpdate[]) {
            try {
                await handleStatusUpdate(supabase, statusUpdate)
            } catch (err) {
                console.error('Error en handleStatusUpdate:', err)
            }
        }

        // SIEMPRE 200 a Meta
        return new Response('EVENT_RECEIVED', { status: 200 })
    }

    return new Response('Method Not Allowed', { status: 405 })
})
