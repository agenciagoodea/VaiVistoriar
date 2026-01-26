
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
        const topic = url.searchParams.get('topic') || url.searchParams.get('type')
        const id = url.searchParams.get('id') || url.searchParams.get('data.id')

        console.log(`Webhook recebido: Tópico=${topic}, ID=${id}`);

        if (topic === 'payment' || topic === 'payment.updated' || id) {
            const { data: configs } = await supabaseClient.from('system_configs').select('*')
            const accessToken = configs?.find(c => c.key === 'mercadopago_access_token')?.value

            if (!accessToken) throw new Error('Access Token não encontrado.')

            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            const paymentData = await mpResponse.json()

            console.log(`Status do pagamento no MP: ${paymentData.status}`);

            const userId = paymentData.external_reference || paymentData.metadata?.user_id
            const planId = paymentData.metadata?.plan_id
            const mpId = String(paymentData.id)

            // 1. SEMPRE atualizamos o histórico financeiro
            if (userId) {
                await supabaseClient.from('payment_history')
                    .update({ status: paymentData.status })
                    .eq('mp_id', mpId || paymentData.order?.id || id)
            }

            // 2. Se estiver aprovado, ativamos o plano no perfil
            if (paymentData.status === 'approved' && userId && planId) {
                const nextMonth = new Date()
                nextMonth.setMonth(nextMonth.getMonth() + 1)

                await supabaseClient
                    .from('broker_profiles')
                    .update({
                        subscription_plan_id: planId,
                        subscription_status: 'Ativo',
                        subscription_expires_at: nextMonth.toISOString()
                    })
                    .eq('user_id', userId)

                console.log('Plano e Histórico atualizados!');
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Erro no Webhook:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
