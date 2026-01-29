
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { action, accessToken, payload, preferenceId, userId, planId } = await req.json()
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
        } else if (action === 'check-payment-status') {
            // Buscar pagamentos associados à preferência específica (mais seguro) ou usuário
            if (preferenceId) {
                url = `https://api.mercadopago.com/v1/payments/search?preference_id=${preferenceId}`
            } else {
                url = `https://api.mercadopago.com/v1/payments/search?external_reference=${userId}&sort=date_created&criteria=desc`
            }
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

        // Ação especial: Verificar status e ativar plano automaticamente
        if (action === 'check-payment-status') {
            console.log(`Checking status for PrefID: ${preferenceId}, User: ${userId}`);
            console.log(`MP Response Count: ${data.results?.length}`);

            if (data.results?.length > 0) {
                // Sincronizar status do pagamento mais recente para essa preferência
                const latestPayment = data.results[0];
                const latestStatus = latestPayment.status;
                const prefId = latestPayment.preference_id || preferenceId;

                console.log(`Sincronizando status: ${latestStatus} para PrefID: ${prefId}`);

                // Atualizar histórico no banco independente do status
                await supabaseAdmin.from('payment_history')
                    .update({ status: latestStatus })
                    .eq('mp_id', prefId);

                if (latestStatus === 'approved') {
                    // BUSCA DEFINITIVA DO USUÁRIO/PLANO
                    const { data: orderData } = await supabaseAdmin
                        .from('payment_history')
                        .select('*')
                        .eq('mp_id', prefId)
                        .single();

                    const finalUserId = orderData?.user_id || userId;
                    const finalPlanId = orderData?.plan_id || planId;

                    console.log(`Ativando plano ${finalPlanId} para o usuário ${finalUserId}`);

                    // Ativar plano no banco
                    const nextMonth = new Date()
                    nextMonth.setMonth(nextMonth.getMonth() + 1)

                    const { error: profErr } = await supabaseAdmin
                        .from('broker_profiles')
                        .update({
                            subscription_plan_id: finalPlanId,
                            subscription_status: 'Ativo',
                            subscription_expires_at: nextMonth.toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', finalUserId);

                    if (profErr) console.error('Erro ao atualizar broker_profiles:', profErr.message);

                    return new Response(JSON.stringify({
                        success: true,
                        paymentApproved: true,
                        payment: latestPayment
                    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                // Se não for aprovado (devolvido, recusado, etc)
                if (['refunded', 'cancelled', 'rejected', 'charged_back'].includes(latestStatus)) {
                    const { data: orderData } = await supabaseAdmin
                        .from('payment_history')
                        .select('*')
                        .eq('mp_id', prefId)
                        .single();

                    if (orderData?.user_id && orderData?.plan_id) {
                        await supabaseAdmin
                            .from('broker_profiles')
                            .update({
                                subscription_status: latestStatus === 'refunded' ? 'Estornado' : 'Inativo',
                                updated_at: new Date().toISOString()
                            })
                            .eq('user_id', orderData.user_id)
                            .eq('subscription_plan_id', orderData.plan_id);
                    }
                }

                return new Response(JSON.stringify({
                    success: true,
                    paymentApproved: false,
                    latestStatus: latestStatus,
                    payment: latestPayment
                }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // Caso não tenha resultados
            return new Response(JSON.stringify({
                success: true,
                paymentApproved: false,
                message: 'Nenhum pagamento encontrado para esta preferência/usuário.'
            }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Registro no sistema financeiro para criação de preferência
        if (action === 'create-preference' && response.status < 300 && data.init_point) {
            try {
                const { error: insertError } = await supabaseAdmin.from('payment_history').insert({
                    user_id: payload.external_reference || payload.metadata?.user_id,
                    plan_id: payload.metadata?.plan_id,
                    plan_name: payload.items?.[0]?.title?.replace('Plano VaiVistoriar: ', '') || 'Plano',
                    amount: payload.items?.[0]?.unit_price,
                    status: 'pending',
                    mp_id: data.id,
                    init_point: data.init_point
                });
                if (insertError) console.error('Erro ao gravar histórico:', insertError.message);
            } catch (dbErr: any) {
                console.error('Falha ao acessar payment_history:', dbErr.message);
            }
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
