
const MAILRELAY_API_URL = 'https://cuom1.ipzmarketing.com/api/v1/send_emails';

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("Edge Function started.");

        const body = await req.json();
        const { to, subject, html_content } = body;

        // Retrieve API Key
        const apiKey = Deno.env.get('MAILRELAY_API_KEY');
        console.log("API Key present:", !!apiKey);

        if (!apiKey) {
            console.error("Missing API Key");
            return new Response(JSON.stringify({ error: "MAILRELAY_API_KEY no configurada en secretos." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const payload = {
            from: {
                email: "relaciones.publicas@cuom.edu.mx",
                name: "Relaciones Públicas CUOM"
            },
            to: to,
            subject: subject,
            html_part: html_content,
            text_part: html_content ? html_content.replace(/<[^>]*>?/gm, '') : ""
        };

        console.log("Sending to Mailrelay...");
        const response = await fetch(MAILRELAY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-AUTH-TOKEN': apiKey
            },
            body: JSON.stringify(payload)
        })
        console.log("Mailrelay Response Status:", response.status);

        const text = await response.text(); // Read text first to avoid JSON crash
        console.log("Mailrelay Raw Response:", text.substring(0, 200));

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Mailrelay returned non-JSON:", text);
            return new Response(JSON.stringify({ error: `Mailrelay devolvió una respuesta inválida (no JSON): ${text.substring(0, 100)}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 200 OK Logic for Frontend Alerting
        if (!response.ok) {
            console.error('Mailrelay Error:', data);
            return new Response(JSON.stringify({ error: `Mailrelay rechazó el envío (${response.status}): ${JSON.stringify(data)}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Internal Error:", error);
        return new Response(JSON.stringify({ error: `Error Interno: ${error.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
