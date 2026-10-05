import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Manejo de CORS (preflight request)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("Edge Function transferir-alumno started.");

        const {
            first_name,
            paternal_last_name,
            maternal_last_name,
            email,
            phone,
            program_id,
            lead_id
        } = await req.json();

        // Validaciones básicas
        if (!first_name || !paternal_last_name || !lead_id || !program_id) {
            throw new Error("Faltan datos requeridos: first_name, paternal_last_name, lead_id o program_id.");
        }

        // Cliente local (CRM) usando Service Role para poder actualizar
        const localSupabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const localSupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        
        if (!localSupabaseUrl || !localSupabaseKey) {
            throw new Error("Variables de entorno del CRM (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) no configuradas.");
        }

        const localSupabase = createClient(localSupabaseUrl, localSupabaseKey);

        // Consultar homologacion_programas para obtener escolar_licenciatura_nombre
        console.log(`Consultando homologacion_programas para program_id: ${program_id}`);
        const { data: homologacion, error: homError } = await localSupabase
            .from('homologacion_programas')
            .select('escolar_licenciatura_nombre')
            .eq('crm_program_id', program_id)
            .single();

        if (homError) {
            console.error("Error consultando homologacion_programas:", homError);
            throw new Error(`No se encontró homologación para el programa: ${program_id}`);
        }

        const licenciatura = homologacion.escolar_licenciatura_nombre;
        console.log(`Licenciatura homologada: ${licenciatura}`);

        // Inicializar cliente para el sistema de Control Escolar
        const escolarUrl = Deno.env.get('ESCOLAR_URL') ?? '';
        const escolarKey = Deno.env.get('ESCOLAR_SERVICE_ROLE_KEY') ?? '';

        if (!escolarUrl || !escolarKey) {
            throw new Error("Variables de entorno del Control Escolar (ESCOLAR_URL, ESCOLAR_SERVICE_ROLE_KEY) no configuradas.");
        }

        const escolarSupabase = createClient(escolarUrl, escolarKey);

        const nombre_completo = `${first_name} ${paternal_last_name} ${maternal_last_name || ''}`.trim();

        // Preparar payload para UPSERT en Control Escolar
        const upsertPayload = {
            crm_lead_id: lead_id,
            nombres: first_name,
            apellido_paterno: paternal_last_name,
            apellido_materno: maternal_last_name || null,
            email: email || null,
            telefono: phone || null,
            licenciatura: licenciatura,
            estatus: 'PENDIENTE_APROBACION',
            observaciones_rechazo: null,
            nombre_completo: nombre_completo
        };

        console.log("Haciendo UPSERT en el sistema de Control Escolar...");
        const { data: existingAlumno, error: selectError } = await escolarSupabase
            .from('alumnos')
            .select('id, estatus, observaciones_rechazo')
            .eq('crm_lead_id', lead_id)
            .maybeSingle();

        if (selectError) {
            throw new Error(`Error verificando existencia en Control Escolar: ${selectError.message}`);
        }

        let upsertError;

        if (existingAlumno) {
            // Evaluamos si el alumno fue rechazado previamente (dependiendo del estatus u observaciones)
            // Solo si fue rechazado permitimos que se sobreescriban sus datos para corregirlos.
            const fueRechazado = existingAlumno.observaciones_rechazo !== null || existingAlumno.estatus === 'RECHAZADO';

            if (fueRechazado) {
                console.log("Actualizando datos del alumno previamente rechazado...");
                const { error: updateError } = await escolarSupabase
                    .from('alumnos')
                    .update(upsertPayload)
                    .eq('id', existingAlumno.id);
                upsertError = updateError;
            } else {
                console.log("El alumno ya existe y NO fue rechazado. Omitiendo actualización por seguridad.");
                return new Response(JSON.stringify({ 
                    success: true, 
                    skipped: true,
                    message: "El alumno ya estaba registrado en Control Escolar y está activo. No se sobreescribieron sus datos por seguridad." 
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }
        } else {
            console.log("Insertando nuevo alumno...");
            const { error: insertError } = await escolarSupabase
                .from('alumnos')
                .insert([upsertPayload]);
            upsertError = insertError;
        }

        if (upsertError) {
            console.error("Error en el UPSERT del Control Escolar:", upsertError);
            throw new Error(`Error insertando/actualizando alumno en Control Escolar: ${upsertError.message}`);
        }

        console.log("Upsert exitoso en Control Escolar. Actualizando lead en el CRM...");

        // Actualizar el estado del lead en el CRM local
        const { error: updateError } = await localSupabase
            .from('leads')
            .update({
                estado_transferencia: 'EN_REVISION',
                observaciones_transferencia: null
            })
            .eq('id', lead_id);

        if (updateError) {
            console.error("Error actualizando lead en CRM:", updateError);
            throw new Error("Alumno transferido con éxito, pero ocurrió un error actualizando el estado en el CRM.");
        }

        console.log("Transferencia completada exitosamente.");

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Alumno transferido exitosamente' 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error("Error en transferir-alumno:", error.message);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
