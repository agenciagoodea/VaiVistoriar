
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { action, accessToken, payload } = await req.json()
        const cleanToken = String(accessToken || '').trim().replace(/^["']|["']$/g, '');

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

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

        // Se for criação de preferência e deu certo, registramos no sistema financeiro
        if (action === 'create-preference' && response.status < 300 && data.init_point) {
            await supabaseAdmin.from('payment_history').insert({
                user_id: payload.external_reference || payload.metadata?.user_id,
                plan_id: payload.metadata?.plan_id,
                plan_name: payload.items?.[0]?.title?.replace('Plano VistoriaPro: ', '') || 'Plano',
                amount: payload.items?.[0]?.unit_price,
                status: 'pending',
                mp_id: data.id,
                init_point: data.init_point
            })
        }

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
