
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

        // Pegamos a notificação do Mercado Pago
        const url = new URL(req.url)
        const topic = url.searchParams.get('topic') || url.searchParams.get('type')
        const id = url.searchParams.get('id') || url.searchParams.get('data.id')

        console.log(`Webhook recebido: Tópico=${topic}, ID=${id}`);

        if (topic === 'payment' || topic === 'payment.updated') {
            // 1. Buscar o Access Token no banco
            const { data: configs } = await supabaseClient.from('system_configs').select('*')
            const accessToken = configs?.find(c => c.key === 'mercadopago_access_token')?.value

            if (!accessToken) throw new Error('Access Token não encontrado no sistema.')

            // 2. Consultar o Mercado Pago para ver o status real desse pagamento
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            const paymentData = await mpResponse.json()

            console.log(`Status do pagamento no MP: ${paymentData.status}`);

            // 3. Se estiver aprovado, ativamos o plano
            if (paymentData.status === 'approved') {
                const userId = paymentData.external_reference || paymentData.metadata?.user_id
                const planId = paymentData.metadata?.plan_id

                if (userId && planId) {
                    console.log(`Ativando plano ${planId} para o usuário ${userId}`);

                    const nextMonth = new Date()
                    nextMonth.setMonth(nextMonth.getMonth() + 1)

                    const { error } = await supabaseClient
                        .from('broker_profiles')
                        .update({
                            subscription_plan_id: planId,
                            subscription_status: 'Ativo',
                            subscription_expires_at: nextMonth.toISOString()
                        })
                        .eq('user_id', userId)

                    if (error) throw error
                    console.log('Plano ativado com sucesso via Webhook!');
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Erro no Webhook:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 200, // MP exige 200 ou 201
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
