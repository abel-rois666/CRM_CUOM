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
                image?   : { id: string; mime_type: string; caption?: string }
                audio?   : { id: string; mime_type: string }
                document?: { id: string; mime_type: string; caption?: string; filename?: string }
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
    const [statusRes, sourceRes, programRes, turnoRes] = await Promise.all([
        supabase.from('statuses').select('id').ilike('name', '%sin contactar%').limit(1).maybeSingle(),
        supabase.from('sources').select('id').ilike('name', '%whatsapp%').limit(1).maybeSingle(),
        supabase.from('licenciaturas').select('id').ilike('name', '%sin definir%').limit(1).maybeSingle(),
        supabase.from('turnos').select('id').ilike('name', '%sin definir%').limit(1).maybeSingle(),
    ])

    // Fallbacks: si "Sin Contactar" no existe, toma el primer status disponible
    let statusId = statusRes.data?.id
    if (!statusId) {
        const { data } = await supabase.from('statuses').select('id').order('created_at').limit(1).maybeSingle()
        statusId = data?.id
    }

    // Fallback de Licenciatura por defecto
    let programId = programRes.data?.id
    if (!programId) {
        // Buscar alternativa 'Por definir'
        const { data: fallbackProgram } = await supabase.from('licenciaturas').select('id').ilike('name', '%por definir%').limit(1).maybeSingle()
        programId = fallbackProgram?.id
    }
    if (!programId) {
        // Si no existe ninguna variante, intentamos crear "Sin definir" automáticamente
        const { data: newProg, error: insertError } = await supabase.from('licenciaturas').insert({ name: 'Sin definir' }).select('id').single()
        if (!insertError && newProg) {
            programId = newProg.id
        } else {
            const { data } = await supabase.from('licenciaturas').select('id').order('name').limit(1).maybeSingle()
            programId = data?.id
        }
    }

    // Fallback de Turno por defecto
    let turnoId = turnoRes.data?.id
    if (!turnoId) {
        // Intentar insertar "Sin definir" automáticamente
        const { data: newTurno, error: insertError } = await supabase.from('turnos').insert({ name: 'Sin definir' }).select('id').single()
        if (!insertError && newTurno) {
            turnoId = newTurno.id
        } else {
            const { data } = await supabase.from('turnos').select('id').order('name').limit(1).maybeSingle()
            turnoId = data?.id
        }
    }

    const sourceId  = sourceRes.data?.id
    const advisorId = await getAssignedAdvisorId(supabase)

    if (!statusId)  throw new Error('No hay ningún status en la tabla statuses.')
    if (!sourceId)  throw new Error('No hay ninguna fuente "WhatsApp" en sources.')
    if (!programId) throw new Error('No hay ningún programa en licenciaturas.')
    if (!advisorId) throw new Error('No hay ningún perfil admin para asignar como fallback.')

    return { statusId, sourceId, programId, advisorId, turnoId }
}

// ---------------------------------------------------------------------------
// Utilidad: Obtener el asesor correcto según las reglas de enrutamiento
// ---------------------------------------------------------------------------
async function getAssignedAdvisorId(supabase: ReturnType<typeof getSupabaseClient>): Promise<string | undefined> {
    try {
        const { data: routingData } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'whatsapp_routing')
            .maybeSingle()

        const cfg = routingData?.value || { auto_assign: false, strategy: 'round_robin' }

        if (cfg.auto_assign) {
            // Solo asesores o coordinadores
            const { data: eligibleAdvisors } = await supabase
                .from('profiles')
                .select('id, role')
                .in('role', ['advisor', 'moderator', 'asesor', 'coordinador'])
                .order('created_at', { ascending: true })

            if (eligibleAdvisors && eligibleAdvisors.length > 0) {
                if (cfg.strategy === 'least_leads') {
                    // Buscar al asesor con menos leads
                    const { data: leadsData } = await supabase
                        .from('leads')
                        .select('advisor_id')

                    const leadsCount: Record<string, number> = {}
                    eligibleAdvisors.forEach((a: any) => leadsCount[a.id] = 0)
                    
                    leadsData?.forEach((lead: any) => {
                        if (lead.advisor_id && leadsCount[lead.advisor_id] !== undefined) {
                            leadsCount[lead.advisor_id]++
                        }
                    })

                    let leastLeadsAdvisor = eligibleAdvisors[0].id
                    let minCount = Infinity

                    for (const id in leadsCount) {
                        if (leadsCount[id] < minCount) {
                            minCount = leadsCount[id]
                            leastLeadsAdvisor = id
                        }
                    }

                    return leastLeadsAdvisor
                } else {
                    // Default / Round Robin
                    const { data: lastAssignedData } = await supabase
                        .from('system_settings')
                        .select('value')
                        .eq('key', 'last_assigned_whatsapp_advisor')
                        .maybeSingle()

                    const lastAssignedId = lastAssignedData?.value?.id

                    let nextIndex = 0
                    if (lastAssignedId) {
                        const currentIndex = eligibleAdvisors.findIndex((a: any) => a.id === lastAssignedId)
                        if (currentIndex !== -1) {
                            nextIndex = (currentIndex + 1) % eligibleAdvisors.length
                        }
                    }

                    const nextAdvisorId = eligibleAdvisors[nextIndex].id

                    // Actualizar el puntero en background
                    try {
                        await supabase.from('system_settings').upsert({
                            key: 'last_assigned_whatsapp_advisor',
                            value: { id: nextAdvisorId }
                        }, { onConflict: 'key' })
                    } catch (upsertError: any) {
                        console.error('Error actualizando puntero de reparto:', upsertError.message)
                    }

                    return nextAdvisorId
                }
            }
        }
    } catch (e: any) {
        console.error('Error en enrutamiento:', e.message)
    }

    // Fallback: Cualquier asesor o moderador (en lugar de admin)
    try {
        const { data: fallbackAdvisor } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['advisor', 'moderator', 'asesor', 'coordinador'])
            .limit(1)
            .maybeSingle()

        if (fallbackAdvisor) {
            console.log('Asignación de respaldo activada: Asesor/Coordinador')
            return fallbackAdvisor.id
        }
    } catch (fallbackErr: any) {
        console.error('Error buscando asesor de respaldo:', fallbackErr.message)
    }

    // Último recurso absoluto: Admin
    try {
        const { data: adminRes } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .limit(1)
            .maybeSingle()
            
        return adminRes?.id
    } catch (e) {
        return undefined
    }
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
    mediaUrl?   : string,
    mediaType?  : string,
) {
    let leadId: string | null = null

    // 1. Buscar lead por teléfono — matching en dos pasos para manejar prefijos
    // Paso A: Coincidencia exacta (leads automáticos de WhatsApp con número completo)
    let existingLead: { id: string; has_unread_messages: boolean; advisor_id: string; first_name: string } | null = null;
    const exactMatch = await supabase
        .from('leads')
        .select('id, has_unread_messages, advisor_id, first_name')
        .eq('phone', from)
        .maybeSingle()

    if (exactMatch.data) {
        existingLead = exactMatch.data
    } else {
        // Paso B: Buscar por los últimos 10 dígitos (leads manuales sin prefijo)
        // Tomar los últimos 10 dígitos del número recibido como sufijo de búsqueda
        const last10 = from.replace(/\D/g, '').slice(-10)
        if (last10.length === 10) {
            const fuzzyMatch = await supabase
                .from('leads')
                .select('id, has_unread_messages, advisor_id, first_name')
                .ilike('phone', `%${last10}`)
                .maybeSingle()
            if (fuzzyMatch.data) {
                existingLead = fuzzyMatch.data
                // Actualizar el teléfono al formato E.164 completo para futuras coincidencias exactas
                await supabase
                    .from('leads')
                    .update({ phone: from })
                    .eq('id', fuzzyMatch.data.id)
                console.log(`Teléfono del lead ${fuzzyMatch.data.id} normalizado a ${from}`)
            }
        }
    }

    if (existingLead) {
        leadId = existingLead.id
        console.log(`Lead existente encontrado: ${leadId}`)
        
        // Activar la alerta de mensaje no leído
        await supabase
            .from('leads')
            .update({ has_unread_messages: true, updated_at: new Date().toISOString() })
            .eq('id', leadId)
            
        // Si no tenía mensajes sin leer, disparamos una nueva notificación Push
        if (!existingLead.has_unread_messages) {
            // Notificar al asesor asignado
            if (existingLead.advisor_id) {
                await supabase.from('notifications').insert({
                    user_id: existingLead.advisor_id,
                    title: 'Nuevo Mensaje de WhatsApp',
                    message: `${existingLead.first_name || 'El prospecto'} te ha enviado un nuevo mensaje.`,
                    type: 'info',
                    link: `/whatsapp/${leadId}`
                });
            }

            // Notificar también a los administradores
            const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
            if (admins && admins.length > 0) {
                const adminNotifs = admins
                    .filter(admin => admin.id !== existingLead.advisor_id) // Evitar duplicados si el admin es el asesor
                    .map(admin => ({
                        user_id: admin.id,
                        title: 'Nuevo Mensaje de WhatsApp (Admin)',
                        message: `${existingLead.first_name || 'El prospecto'} te ha enviado un nuevo mensaje.`,
                        type: 'info',
                        link: `/whatsapp/${leadId}`
                    }));
                if (adminNotifs.length > 0) {
                    await supabase.from('notifications').insert(adminNotifs);
                }
            }
        }
            
    } else {
        // 2. Lead nuevo — auto-crear respetando NOT NULL
        console.log(`Número desconocido ${from}. Creando lead...`)
        try {
            const { statusId, sourceId, programId, advisorId, turnoId } = await resolveNewLeadIds(supabase)

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
                    turno_id          : turnoId,
                    advisor_id        : advisorId,   // Bandeja del admin
                    registration_date : new Date().toISOString(),
                    has_unread_messages: true,
                })
                .select('id')
                .single()

            if (insertErr) {
                console.error('Error creando lead:', insertErr.message)
            } else {
                leadId = newLead.id
                console.log(`Lead creado: ${leadId} (${firstName} ${paternalLastName})`)
                
                // Disparar notificación Push
                if (advisorId) {
                    await supabase.from('notifications').insert({
                        user_id: advisorId,
                        title: 'Nuevo Prospecto por WhatsApp',
                        message: `${firstName} se ha comunicado por primera vez.`,
                        type: 'info',
                        link: `/whatsapp/${leadId}`
                    });
                }

                // Notificar a admins
                const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
                if (admins && admins.length > 0) {
                    const adminNotifs = admins
                        .filter(admin => admin.id !== advisorId)
                        .map(admin => ({
                            user_id: admin.id,
                            title: 'Nuevo Prospecto por WhatsApp (Admin)',
                            message: `${firstName} se ha comunicado por primera vez.`,
                            type: 'info',
                            link: `/whatsapp/${leadId}`
                        }));
                    if (adminNotifs.length > 0) {
                        await supabase.from('notifications').insert(adminNotifs);
                    }
                }
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
            media_url      : mediaUrl ?? null,
            media_type     : mediaType ?? null,
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

        // ── Rama A: mensajes de texto/botones entrantes ──────────────────
        const message = value.messages?.[0]

        if (message && (message.type === 'text' || message.type === 'button' || message.type === 'interactive')) {
            const from        = message.from
            const waMessageId = message.id
            let messageBody = ''

            // Extraer el texto real dependiendo del tipo
            if (message.type === 'text') {
                messageBody = message.text?.body ?? ''
            } else if (message.type === 'button') {
                messageBody = `[Botón seleccionado]: ${message.button?.text ?? ''}`
            } else if (message.type === 'interactive') {
                const interactive = message.interactive
                if (interactive?.type === 'button_reply') {
                    messageBody = `[Opción seleccionada]: ${interactive.button_reply?.title ?? ''}`
                } else if (interactive?.type === 'list_reply') {
                    messageBody = `[Lista seleccionada]: ${interactive.list_reply?.title ?? ''}\n${interactive.list_reply?.description ?? ''}`
                } else {
                    messageBody = '[Interacción recibida]'
                }
            }

            const profileName = value.contacts?.[0]?.profile?.name || `Lead-${from.slice(-4)}`

            console.log(`Inbound de ${from} (${profileName}): "${messageBody}"`)

            try {
                await handleInboundMessage(supabase, from, waMessageId, messageBody, profileName)
            } catch (err) {
                console.error('Error inesperado en handleInboundMessage:', err)
            }
        }

        // ── Rama B: mensajes multimedia (imagen, audio, video, etc.) ───────
        if (message && message.type !== 'text' && message.type !== 'button' && message.type !== 'interactive') {
            const type = message.type;
            const from = message.from;
            const waMessageId = message.id;
            const profileName = value.contacts?.[0]?.profile?.name || `Lead-${from.slice(-4)}`;

            if (type === 'image' || type === 'audio' || type === 'document') {
                const mediaObj = type === 'image' ? message.image : (type === 'audio' ? message.audio : message.document);
                const mediaId = mediaObj?.id;
                const mimeType = mediaObj?.mime_type || '';

                if (mediaId) {
                    try {
                        // @ts-ignore
                        const WA_ACCESS_TOKEN = Deno.env.get('WA_ACCESS_TOKEN')
                        
                        // 1. Obtener URL de descarga temporal desde Meta
                        const urlRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
                            headers: { 'Authorization': `Bearer ${WA_ACCESS_TOKEN}` }
                        })
                        const urlData = await urlRes.json()
                        const mediaDownloadUrl = urlData.url

                        if (mediaDownloadUrl) {
                            // 2. Descargar el archivo binario desde Meta
                            const mediaRes = await fetch(mediaDownloadUrl, {
                                headers: { 'Authorization': `Bearer ${WA_ACCESS_TOKEN}` }
                            })
                            const arrayBuffer = await mediaRes.arrayBuffer()
                            
                            // 3. Subir a Supabase Storage
                            let ext = type === 'image' ? 'jpeg' : (type === 'audio' ? 'ogg' : 'bin')
                            if (mimeType.includes('png')) ext = 'png'
                            if (mimeType.includes('mp4') || mimeType.includes('aac')) ext = 'm4a'
                            if (mimeType.includes('pdf')) ext = 'pdf'
                            
                            // Si el documento trae nombre de archivo, intentamos extraer su extensión real
                            if (type === 'document' && message.document?.filename) {
                                const parts = message.document.filename.split('.')
                                if (parts.length > 1) {
                                    ext = parts.pop() || ext;
                                }
                            }
                            
                            const fileName = `${waMessageId}.${ext}`
                            
                            const { error: uploadError } = await supabase.storage
                                .from('whatsapp_media')
                                .upload(fileName, arrayBuffer, {
                                    contentType: mimeType || (type === 'image' ? 'image/jpeg' : (type === 'audio' ? 'audio/ogg' : 'application/octet-stream')),
                                    upsert: true
                                })

                            if (uploadError) {
                                console.error('Error subiendo archivo a Supabase Storage:', uploadError)
                            } else {
                                // 4. Obtener URL Pública
                                const { data: publicUrlData } = supabase.storage
                                    .from('whatsapp_media')
                                    .getPublicUrl(fileName)
                                
                                const publicUrl = publicUrlData.publicUrl
                                
                                // Extraer caption si existe
                                const caption = (mediaObj as any)?.caption;
                                const defaultMessage = type === 'image' ? '📷 Imagen recibida' : (type === 'audio' ? '🎵 Audio recibido' : '📄 Documento recibido');
                                const finalMessageBody = caption ? caption : defaultMessage;

                                // 5. Insertar en base de datos usando handleInboundMessage
                                await handleInboundMessage(
                                    supabase, 
                                    from, 
                                    waMessageId, 
                                    finalMessageBody, 
                                    profileName,
                                    publicUrl,
                                    type
                                )
                                // Terminar ejecución exitosamente
                                return new Response('EVENT_RECEIVED', { status: 200 })
                            }
                        }
                    } catch (e: any) {
                        console.error('Error procesando multimedia:', e.message)
                        // No lanzamos error para que no se rompa el webhook y devuelva 200
                    }
                }
            }

            console.log(`Mensaje tipo "${message.type}" recibido de ${message.from}. Fallback a nota silenciosa.`)
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
                        message_body   : `[Mensaje de tipo "${message.type}" — no soportado o error en descarga]`,
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
