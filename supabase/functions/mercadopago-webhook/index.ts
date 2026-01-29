
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

        // Parse notification - MP sends data in different formats
        const url = new URL(req.url)
        let paymentId = url.searchParams.get('id') || url.searchParams.get('data.id');
        const type = url.searchParams.get('type') || url.searchParams.get('topic');

        // Also try to get from body for newer API
        if (!paymentId) {
            try {
                const body = await req.json();
                paymentId = body?.data?.id || body?.id;
            } catch { }
        }

        console.log(`Webhook recebido: Tipo=${type}, PaymentID=${paymentId}`);

        if (!paymentId) {
            console.log('Nenhum ID de pagamento recebido');
            return new Response(JSON.stringify({ received: true, error: 'No payment ID' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Get access token from database
        const { data: configs } = await supabaseClient.from('system_configs').select('*')
        const accessToken = configs?.find(c => c.key === 'mercadopago_access_token')?.value

        if (!accessToken) throw new Error('Access Token não encontrado.')

        // Fetch payment details from Mercado Pago
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        if (!mpResponse.ok) {
            console.error(`Erro ao consultar MP: ${mpResponse.status}`);
            return new Response(JSON.stringify({ received: true, error: 'MP API error' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const paymentData = await mpResponse.json()
        const status = paymentData.status;
        console.log(`Payment Status: ${status}, User: ${paymentData.external_reference}`);

        const userId = paymentData.external_reference || paymentData.metadata?.user_id
        let planId = paymentData.metadata?.plan_id

        if (!userId) {
            console.log('Nenhum user_id encontrado no pagamento');
            return new Response(JSON.stringify({ received: true, warning: 'No user_id' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 1. Fetch latest pending payment to get plan_id if missing
        if (!planId) {
            const { data: latestPayment } = await supabaseClient
                .from('payment_history')
                .select('plan_id')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (latestPayment) {
                planId = latestPayment.plan_id;
                console.log(`PlanID recuperado do histórico: ${planId}`);
            }
        }

        // 2. Update payment history
        const { error: histErr } = await supabaseClient.from('payment_history')
            .update({ status: status })
            .eq('user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

        if (histErr) console.error('Erro ao atualizar histórico:', histErr.message);

        // 3. Activate plan if approved
        if (status === 'approved' && planId) {
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

            if (profErr) {
                console.error('Erro ao ativar plano no broker_profiles:', profErr.message);
            } else {
                console.log(`Sucesso: Plano ${planId} ativado para ${userId}`);
            }
        } else {
            console.log(`Plano não ativado. Status=${status}, PlanID=${planId}`);
        }

        return new Response(JSON.stringify({ received: true, status: paymentData.status }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        console.error('Erro no Webhook:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 200, // Always 200 for MP
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
