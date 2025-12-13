import { supabase } from '../lib/supabase';

// Datos de prueba básica
const SAMPLE_LICENCIATURAS = [
    { name: 'Derecho' },
    { name: 'Administración' },
    { name: 'Psicología' },
    { name: 'Contaduría' },
    { name: 'Ingeniería en Sistemas' }
];

const SAMPLE_SOURCES = [
    { name: 'Facebook Ads' },
    { name: 'Google Ads' },
    { name: 'Recomendación' },
    { name: 'Feria Vocacional' },
    { name: 'Instagram' }
];

const SAMPLE_STATUSES = [
    { name: 'Primer Contacto', color: 'bg-yellow-500', category: 'active' },
    { name: 'Interesado', color: 'bg-blue-500', category: 'active' },
    { name: 'Cita Agendada', color: 'bg-purple-500', category: 'active' },
    { name: 'Inscrito', color: 'bg-green-500', category: 'won' },
    { name: 'Baja / No Interesa', color: 'bg-red-500', category: 'lost' }
];

const SAMPLE_WHATSAPP_TEMPLATES = [
    { name: 'Bienvenida', content: 'Hola {{nombre}}, gracias por tu interés en nuestra universidad. ¿Te gustaría agendar una visita?' },
    { name: 'Seguimiento', content: 'Hola {{nombre}}, ¿pudiste revisar el plan de estudios que te enviamos?' },
    { name: 'Confirmación Cita', content: 'Tu cita está confirmada para el día de mañana. ¡Te esperamos!' }
];

const SAMPLE_EMAIL_TEMPLATES = [
    { name: 'Información General', subject: 'Bienvenido a la Universidad', body: '<p>Hola {{nombre}}, adjunto encontrarás la información solicitada.</p>' },
    { name: 'Recordatorio de Inscripción', subject: 'Últimos días para inscribirte', body: '<p>Hola {{nombre}}, te recordamos que el periodo de inscripción cierra pronto.</p>' }
];

export const seedSampleData = async () => {
    const results = {
        licenciaturas: 0,
        sources: 0,
        statuses: 0,
        whatsapp: 0,
        email: 0,
        leads: 0,
        errors: [] as string[]
    };

    const client = supabase as any;

    try {
        // 1. Licenciaturas
        const { data: lics, error: licError } = await client.from('licenciaturas').select('id');
        if (!licError && lics.length === 0) {
            const { error } = await client.from('licenciaturas').insert(SAMPLE_LICENCIATURAS);
            if (!error) results.licenciaturas = SAMPLE_LICENCIATURAS.length;
            else results.errors.push(`Licenciaturas: ${error.message}`);
        }

        // 2. Sources
        const { data: srcs, error: srcError } = await client.from('sources').select('id');
        if (!srcError && srcs.length === 0) {
            const { error } = await client.from('sources').insert(SAMPLE_SOURCES);
            if (!error) results.sources = SAMPLE_SOURCES.length;
            else results.errors.push(`Fuentes: ${error.message}`);
        }

        // 3. Statuses (Check names to avoid dupes if some exist)
        const { data: stats, error: statError } = await client.from('statuses').select('name');
        if (!statError) {
            const existingNames = new Set(stats.map((s: any) => s.name));
            const toInsert = SAMPLE_STATUSES.filter(s => !existingNames.has(s.name));
            if (toInsert.length > 0) {
                const { error } = await client.from('statuses').insert(toInsert);
                if (!error) results.statuses = toInsert.length;
                else results.errors.push(`Estados: ${error.message}`);
            }
        }

        // 4. WhatsApp Templates
        const { data: wa, error: waError } = await client.from('whatsapp_templates').select('id');
        if (!waError && wa.length === 0) {
            const { error } = await client.from('whatsapp_templates').insert(SAMPLE_WHATSAPP_TEMPLATES);
            if (!error) results.whatsapp = SAMPLE_WHATSAPP_TEMPLATES.length;
            else results.errors.push(`WhatsApp: ${error.message}`);
        }

        // 5. Email Templates
        const { data: em, error: emError } = await client.from('email_templates').select('id');
        if (!emError && em.length === 0) {
            const { error } = await client.from('email_templates').insert(SAMPLE_EMAIL_TEMPLATES);
            if (!error) results.email = SAMPLE_EMAIL_TEMPLATES.length;
            else results.errors.push(`Email: ${error.message}`);
        }

        // 6. Test Leads (Only if no leads exist)
        const { count, error: countError } = await client.from('leads').select('*', { count: 'exact', head: true });
        if (!countError && count === 0) {
            // Fetch IDs to link
            const { data: sIds } = await client.from('statuses').select('id, category').limit(10);
            const { data: lIds } = await client.from('licenciaturas').select('id').limit(1);
            const { data: srcIds } = await client.from('sources').select('id').limit(1);

            if (sIds && lIds && srcIds && sIds.length > 0) {
                const activeStatus = sIds.find((s: any) => s.category === 'active')?.id || sIds[0].id;
                const wonStatus = sIds.find((s: any) => s.category === 'won')?.id || sIds[0].id;
                const lostStatus = sIds.find((s: any) => s.category === 'lost')?.id || sIds[0].id;

                const leads = [
                    {
                        first_name: 'Juan', last_name: 'Pérez (Prueba)', email: 'juan.prueba@example.com', phone: '5551234567',
                        status_id: activeStatus, program_id: lIds[0]?.id, source_id: srcIds[0]?.id, notes: 'Lead de prueba activo.'
                    },
                    {
                        first_name: 'María', last_name: 'García (Prueba)', email: 'maria.prueba@example.com', phone: '5559876543',
                        status_id: wonStatus, program_id: lIds[0]?.id, source_id: srcIds[0]?.id, notes: 'Lead de prueba inscrito.'
                    },
                    {
                        first_name: 'Pedro', last_name: 'López (Prueba)', email: 'pedro.prueba@example.com', phone: '5551112222',
                        status_id: lostStatus, program_id: lIds[0]?.id, source_id: srcIds[0]?.id, notes: 'Lead de prueba baja.'
                    }
                ];

                const { error } = await client.from('leads').insert(leads);
                if (!error) results.leads = 3;
                else results.errors.push(`Leads: ${error.message}`);
            }
        }

    } catch (e: any) {
        results.errors.push(`Error general: ${e.message}`);
    }

    return results;
};
