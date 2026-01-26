
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { action, accessToken, payload } = await req.json()
        const cleanToken = String(accessToken || '').trim().replace(/^["']|["']$/g, '');

        if (!cleanToken) {
            return new Response(JSON.stringify({ error: 'Token ausente', success: false }), {
                status: 200, headers: corsHeaders
            })
        }

        let url = ''
        let method = 'GET'

        if (action === 'test-token') {
            url = 'https://api.mercadopago.com/v1/users/me'
        } else if (action === 'create-preference') {
            url = 'https://api.mercadopago.com/checkout/preferences'
            method = 'POST'
        } else if (action === 'create-plan') {
            url = 'https://api.mercadopago.com/preapproval_plan'
            method = 'POST'
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${cleanToken}`,
                'Content-Type': 'application/json'
            },
            body: method === 'POST' ? JSON.stringify(payload) : undefined
        })

        const data = await response.json().catch(() => ({}));

        // Retornamos um objeto unificado
        return new Response(JSON.stringify({
            ...data,
            success: response.status >= 200 && response.status < 300,
            mp_status: response.status,
            error_message: data.message || data.error || null
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message, success: false }), {
            status: 200, headers: corsHeaders
        })
    }
})
