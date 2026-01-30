
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
            console.error(`Erro ao consultar MP pelo ID ${paymentId}: ${mpResponse.status}`);

            // TENTATIVA DE RECUPERAÇÃO: Se falhou e parece um UUID, pode ser preference_id
            if (paymentId.includes('-')) {
                console.log(`Tentando buscar pagamento por preference_id: ${paymentId}`);
                const searchResp = await fetch(`https://api.mercadopago.com/v1/payments/search?preference_id=${paymentId}&sort=date_created&criteria=desc`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (searchResp.ok) {
                    const searchData = await searchResp.json();
                    if (searchData.results && searchData.results.length > 0) {
                        const foundPayment = searchData.results[0];
                        console.log(`Pagamento encontrado via busca: ${foundPayment.id} (Status: ${foundPayment.status})`);

                        // Segue processando como se tivesse achado direto
                        // Precisamos "mockar" a resposta para o código abaixo seguir
                        // O jeito mais limpo é sobrescrever paymentData logo abaixo se entrarmos aqui
                        // Mas como o código abaixo espera mpResponse.json(), vamos refatorar levemente

                        // Hack para continuar fluxo:
                        return processPayment(foundPayment, supabaseClient);
                    }
                }
            }

            return new Response(JSON.stringify({ received: true, error: 'MP API error or Payment not found' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const paymentData = await mpResponse.json();
        return processPayment(paymentData, supabaseClient);


    } catch (error: any) {
        console.error('Erro no Webhook:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 200, // Always 200 for MP
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

async function processPayment(paymentData: any, supabaseClient: any) {
    const status = paymentData.status;
    const preferenceId = paymentData.preference_id;
    console.log(`Webhook MP: Status=${status}, PrefID=${preferenceId}, InternalID=${paymentData.id}`);

    // BUSCA DEFINITIVA: Localizar o pedido original no banco usando o preference_id
    const { data: orderData, error: orderErr } = await supabaseClient
        .from('payment_history')
        .select('*')
        .eq('mp_id', preferenceId)
        .single();

    if (orderErr || !orderData) {
        console.error('Pedido não encontrado para a preferência:', preferenceId);
        // Fallback para external_reference se preferência falhar
        const fallbackUserId = paymentData.external_reference || paymentData.metadata?.user_id;
        if (!fallbackUserId) {
            return new Response(JSON.stringify({ received: true, error: 'Order not found' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        // Se achou o usuário pelo fallback, tenta seguir mas sem plan_id garantido
        console.log('Usando fallback por external_reference:', fallbackUserId);
    }

    const metadata = paymentData.metadata || {};
    const userId = metadata.user_id || orderData?.user_id || paymentData.external_reference;
    const planId = metadata.plan_id || orderData?.plan_id;

    console.log(`Processing Webhook for User=${userId}, Plan=${planId}, Status=${status}`);

    // 1. Atualizar histórico (sempre que houver mudança de status)
    let histUpdated = false;
    if (preferenceId) {
        const updateData: any = { status: status };

        // Se temos o ID real do pagamento, salvamos ele para facilitar buscas futuras
        if (paymentData.id) {
            updateData.mp_payment_id = String(paymentData.id);
        }

        const { error: histErr, count } = await supabaseClient.from('payment_history')
            .update(updateData)
            .eq('mp_id', preferenceId)
            .select('*', { count: 'exact' });

        if (!histErr && count && count > 0) {
            histUpdated = true;
            console.log(`Histórico atualizado via PreferenceID: ${count} registros.`);
        }

        if (histErr) {
            console.error('Erro ao atualizar histórico:', histErr.message);
            // Se falhou por falta da coluna, tentamos atualizar apenas o status
            if (histErr.message.includes('column "mp_payment_id" does not exist')) {
                const { count: count2 } = await supabaseClient.from('payment_history')
                    .update({ status: status })
                    .eq('mp_id', preferenceId)
                    .select('*', { count: 'exact' });
                if (count2 && count2 > 0) histUpdated = true;
            }
        }
    }

    // Fallback: Se não atualizou via PreferenceID, tenta via Metadata (User + Plan)
    if (!histUpdated && (metadata.user_id || paymentData.external_reference)) {
        const targetUserId = metadata.user_id || paymentData.external_reference;
        const targetPlanId = metadata.plan_id || planId;

        console.log(`Tentando fallback de histórico para User: ${targetUserId}, Plan: ${targetPlanId}`);

        const { error: fallbackErr, count } = await supabaseClient.from('payment_history')
            .update({
                status: status,
                mp_id: preferenceId, // Atualiza o MP_ID caso esteja errado/antigo
                mp_payment_id: paymentData.id ? String(paymentData.id) : undefined
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

    // 2. ATIVAÇÃO OU DESATIVAÇÃO REAL
    if (userId && planId) {
        if (status === 'approved') {
            const nextMonth = new Date()
            nextMonth.setMonth(nextMonth.getMonth() + 1)

            const { data: updatedProfile, error: profErr } = await supabaseClient
                .from('broker_profiles')
                .update({
                    subscription_plan_id: planId,
                    status: 'Ativo',
                    subscription_expires_at: nextMonth.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select('full_name, email')
                .single();

            if (profErr) {
                console.error(`FALHA ao ativar plano: ${profErr.message}`);
            } else {
                console.log(`SUCESSO: Plano ${planId} ativado para ${userId}`);

                // B. Notificação por Email
                try {
                    const recipientEmail = updatedProfile?.email || metadata.user_email || paymentData.payer?.email;
                    const recipientName = updatedProfile?.full_name || 'Cliente';
                    const amount = paymentData.transaction_details?.total_paid_amount || paymentData.transaction_amount || 0;

                    if (recipientEmail) {
                        console.log(`Enviando email de sucesso (Webhook) para: ${recipientEmail}`);
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
                                    plan_name: paymentData.description || 'Assinatura VaiVistoriar',
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
        }
        else if (['refunded', 'cancelled', 'rejected', 'charged_back'].includes(status)) {
            // Se o pagamento foi devolvido ou cancelado, removemos o plano ativo
            await supabaseClient
                .from('broker_profiles')
                .update({
                    status: status === 'refunded' ? 'Estornado' : 'Inativo',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('subscription_plan_id', planId); // Apenas se for o plano desse pagamento

            console.log(`AVISO: Plano ${planId} desativado para ${userId} devido ao status: ${status}`);
        }
    } else {
        console.error('DADOS INSUFICIENTES: UserID ou PlanID faltando. Não foi possivel processar ativação.');
    }

    return new Response(JSON.stringify({ received: true, status: status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}
