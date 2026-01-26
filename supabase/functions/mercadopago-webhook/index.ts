
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const url = new URL(req.url)
        // Tenta pegar o ID de várias formas (data.id é comum nas novas APIs)
        const id = url.searchParams.get('id') || url.searchParams.get('data.id');
        const type = url.searchParams.get('type') || url.searchParams.get('topic');

        console.log(`Webhook recebido: Tipo=${type}, ID=${id}`);

        if (id && (type === 'payment' || !type)) {
            const { data: configs } = await supabaseClient.from('system_configs').select('*')
            const accessToken = configs?.find(c => c.key === 'mercadopago_access_token')?.value

            if (!accessToken) throw new Error('Access Token não encontrado.')

            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })

            if (!mpResponse.ok) throw new Error(`Erro ao consultar MP: ${mpResponse.status}`);

            const paymentData = await mpResponse.json()
            console.log(`Status do pagamento ${id}: ${paymentData.status}`);

            const userId = paymentData.external_reference || paymentData.metadata?.user_id
            const planId = paymentData.metadata?.plan_id
            const mpIdString = String(paymentData.id)

            // 1. Atualizar Histórico Financeiro
            if (userId) {
                const { error: histErr } = await supabaseClient.from('payment_history')
                    .update({ status: paymentData.status })
                    .eq('mp_id', mpIdString)

                if (histErr) console.error('Aviso: Não foi possível atualizar histórico:', histErr.message);
            }

            // 2. Ativar Plano se aprovado
            if (paymentData.status === 'approved' && userId && planId) {
                const nextMonth = new Date()
                nextMonth.setMonth(nextMonth.getMonth() + 1)

                const { error: profErr } = await supabaseClient
                    .from('broker_profiles')
                    .update({
                        subscription_plan_id: planId,
                        subscription_status: 'Ativo',
                        subscription_expires_at: nextMonth.toISOString()
                    })
                    .eq('user_id', userId)

                if (profErr) throw profErr;
                console.log(`Sucesso: Plano ${planId} ativado para ${userId}`);
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Erro no Webhook:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 200, // Sempre 200 para o MP não ficar tentando
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
