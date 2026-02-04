
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { action, accessToken, payload, preferenceId, paymentId, userId, planId } = await req.json()
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
            // Se tiver o ID direto do pagamento, é o caminho mais rápido
            if (paymentId) {
                url = `https://api.mercadopago.com/v1/payments/${paymentId}`
            }
            // Senão busca pela preferência
            else if (preferenceId) {
                url = `https://api.mercadopago.com/v1/payments/search?preference_id=${preferenceId}`
            }
            // Fallback para o usuário
            else {
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

        if (action === 'check-payment-status') {
            console.log(`[CHECK] Action: check-payment-status | URL: ${url} | Status: ${response.status}`);
            console.log(`[CHECK] MP Response:`, JSON.stringify(data).slice(0, 500));
        }

        // Ação especial: Verificar status e ativar plano automaticamente
        if (action === 'check-payment-status') {
            console.log(`Checking status for PrefID: ${preferenceId}, User: ${userId}`);
            console.log(`MP Response Count: ${data.results?.length}`);

            if (paymentId && data.id) {
                // Quando buscamos por ID direto, o objeto retornado não é uma lista (results), é o objeto direto
                const latestStatus = data.status;
                const prefId = data.preference_id || preferenceId;
                const latestPayment = data;

                console.log(`Sincronizando status via ID direto: ${latestStatus} para Payment ${paymentId}`);

                // Segue a lógica de ativação igual ao search abaixo
                return await handlePaymentActivation(latestPayment, latestStatus, prefId, userId, planId, supabaseAdmin);
            }

            if (data.results?.length > 0) {
                // Sincronizar status do pagamento mais recente para essa preferência
                const latestPayment = data.results[0];
                const latestStatus = latestPayment.status;
                const prefId = latestPayment.preference_id || preferenceId;

                console.log(`Sincronizando status via search: ${latestStatus} para PrefID: ${prefId}`);

                return await handlePaymentActivation(latestPayment, latestStatus, prefId, userId, planId, supabaseAdmin);
            }

            // Caso não tenha resultados na busca por PreferenceID, tentar fallback por UserID
            if ((!data.results || data.results.length === 0) && preferenceId && userId) {
                console.log(`[RETRY] Nenhuma pagamento achado por PrefID ${preferenceId}. Tentando por UserID ${userId}...`);
                const fallbackUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${userId}&sort=date_created&criteria=desc`;
                const fallbackResp = await fetch(fallbackUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${cleanToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const fallbackData = await fallbackResp.json().catch(() => ({}));

                if (fallbackData.results?.length > 0) {
                    const splitPayment = fallbackData.results[0];
                    console.log(`[RECOVERY] Pagamento encontrado via UserID: ${splitPayment.id} (Status: ${splitPayment.status})`);
                    return await handlePaymentActivation(splitPayment, splitPayment.status, preferenceId, userId, planId, supabaseAdmin);
                }
            }

            // Caso realmente não tenha resultados
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

async function handlePaymentActivation(latestPayment: any, latestStatus: string, prefId: string, userId: string, planId: string, supabaseAdmin: any) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // 1. Atualizar histórico no banco independente do status
    let histUpdated = false;
    if (prefId) {
        const updateData: any = { status: latestStatus };
        if (latestPayment.id) {
            updateData.mp_payment_id = String(latestPayment.id);
        }

        const { error: histErr, count } = await supabaseAdmin.from('payment_history')
            .update(updateData)
            .eq('mp_id', prefId)
            .select('*', { count: 'exact' });

        if (!histErr && count && count > 0) {
            histUpdated = true;
            console.log(`Histórico atualizado via PrefID: ${count} registros.`);
        }

        if (histErr && histErr.message.includes('column "mp_payment_id" does not exist')) {
            const { count: count2 } = await supabaseAdmin.from('payment_history')
                .update({ status: latestStatus })
                .eq('mp_id', prefId)
                .select('*', { count: 'exact' });
            if (count2 && count2 > 0) histUpdated = true;
        }
    }

    // Fallback: Se não atualizou via PrefID, tenta via Metadata (User + Plan) + Data/Hora recente
    if (!histUpdated && (userId || latestPayment.metadata?.user_id)) {
        const targetUserId = latestPayment.metadata?.user_id || userId;
        const targetPlanId = latestPayment.metadata?.plan_id || planId;

        console.log(`Tentando fallback de histórico para User: ${targetUserId}, Plan: ${targetPlanId}`);

        const { error: fallbackErr, count } = await supabaseAdmin.from('payment_history')
            .update({
                status: latestStatus,
                mp_id: prefId, // Atualiza o MP_ID caso esteja errado/antigo
                mp_payment_id: latestPayment.id ? String(latestPayment.id) : undefined
            })
            .eq('user_id', targetUserId)
            .eq('plan_id', targetPlanId)
            .eq('status', 'pending')
            .select('*', { count: 'exact' });

        if (!fallbackErr && count && count > 0) {
            console.log(`Histórico atualizado via Fallback (User+Plan): ${count} registros.`);
            histUpdated = true;
        }
    }

    if (latestStatus === 'approved') {
        // BUSCA DA VERDADE NO METADATA DO PAGAMENTO
        const metadata = latestPayment.metadata || {};
        let finalUserId = metadata.user_id || userId;
        let finalPlanId = metadata.plan_id || planId;

        // Se não tiver no metadata (casos antigos/bug), tenta via payment_history
        if (!finalPlanId || !finalUserId) {
            const { data: orderData } = await supabaseAdmin
                .from('payment_history')
                .select('*')
                .eq('mp_id', prefId)
                .single();

            if (orderData) {
                finalUserId = finalUserId || orderData.user_id;
                finalPlanId = finalPlanId || orderData.plan_id;
            }
        }

        console.log(`Ativando plano ${finalPlanId} para o usuário ${finalUserId} (Status: ${latestStatus})`);

        if (finalUserId && finalPlanId) {
            // A. Ativar plano no banco
            const { data: planDetails } = await supabaseAdmin
                .from('plans')
                .select('duration_days, billing_cycle')
                .eq('id', finalPlanId)
                .single();

            // Lógica: Se o ciclo é Anual, usamos 365 dias. Senão, usamos duration_days (default 30).
            const durationDays = planDetails?.billing_cycle === 'Anual' ? 365 : (planDetails?.duration_days || 30);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + durationDays);

            const { data: updatedProfile, error: profErr } = await supabaseAdmin
                .from('broker_profiles')
                .update({
                    subscription_plan_id: finalPlanId,
                    status: 'Ativo',
                    subscription_expires_at: expiresAt.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', finalUserId)
                .select('full_name, email')
                .single();

            if (profErr) {
                console.error('Erro ao atualizar broker_profiles:', profErr.message);
            } else {
                console.log('Broker profile updated successfully');

                // B. Notificação por Email (Centralizada)
                try {
                    const recipientEmail = updatedProfile?.email || metadata.user_email || latestPayment.payer?.email;
                    const recipientName = updatedProfile?.full_name || 'Cliente';
                    const amount = latestPayment.transaction_details?.total_paid_amount || latestPayment.transaction_amount || 0;

                    if (recipientEmail) {
                        console.log(`Enviando email de sucesso para: ${recipientEmail}`);
                        const funcUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;

                        await fetch(funcUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                to: recipientEmail,
                                templateId: 'payment_success',
                                variables: {
                                    plan_name: latestPayment.description || 'Assinatura VaiVistoriar',
                                    amount: String(amount.toFixed(2).replace('.', ',')),
                                    date: new Date().toLocaleDateString('pt-BR'),
                                    full_name: recipientName
                                }
                            })
                        }).catch(e => console.error('Erro ao invocar send-email:', e.message));
                    }
                } catch (emailErr: any) {
                    console.error('Falha ao processar envio de email:', emailErr.message);
                }
            }
        } else {
            console.error('MISSING DATA: Cannot activate plan. Missing userId or planId from metadata/history.');
        }

        return new Response(JSON.stringify({
            success: true,
            paymentApproved: true,
            payment: latestPayment
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Se não for aprovado (devolvido, recusado, etc)
    if (['refunded', 'cancelled', 'rejected', 'charged_back'].includes(latestStatus)) {
        const metadata = latestPayment.metadata || {};
        const finalUserId = metadata.user_id || userId;
        const finalPlanId = metadata.plan_id || planId;

        if (finalUserId) {
            await supabaseAdmin
                .from('broker_profiles')
                .update({
                    status: latestStatus === 'refunded' ? 'Estornado' : 'Inativo',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', finalUserId)
                .eq('subscription_plan_id', finalPlanId);  // Safety check
        }
    }

    return new Response(JSON.stringify({
        success: true,
        paymentApproved: false,
        latestStatus: latestStatus,
        payment: latestPayment
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
