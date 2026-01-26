
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
            return new Response(JSON.stringify({ error: 'Nenhum token foi enviado.', success: false }), {
                status: 200, headers: corsHeaders
            })
        }

        let url = ''
        let method = 'GET'

        if (action === 'test-token') {
            url = 'https://api.mercadopago.com/v1/users/me'
        } else if (action === 'create-plan') {
            url = 'https://api.mercadopago.com/preapproval_plan'
            method = 'POST'
        } else if (action === 'create-preference') {
            url = 'https://api.mercadopago.com/checkout/preferences'
            method = 'POST'
        } else {
            return new Response(JSON.stringify({ error: `Ação inválida: ${action}`, success: false }), {
                status: 200, headers: corsHeaders
            })
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

        if (response.status >= 400) {
            return new Response(JSON.stringify({
                success: false,
                error: data.message || data.error || `Erro no Mercado Pago (Status: ${response.status})`,
                mp_status: response.status,
                details: data
            }), { status: 200, headers: corsHeaders })
        }

        return new Response(JSON.stringify({
            nickname: data.nickname || 'Usuário MP',
            init_point: data.init_point,
            ...data,
            success: true,
            mp_status: response.status
        }), { status: 200, headers: corsHeaders })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message, success: false }), {
            status: 200, headers: corsHeaders
        })
    }
})
