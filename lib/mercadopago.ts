import { supabase } from './supabase';

export interface MPPlan {
    id?: string;
    reason: string;
    auto_recurring: {
        frequency: number;
        frequency_type: 'months';
        transaction_amount: number;
        currency_id: 'BRL';
    };
    back_url: string;
}

export const mercadopagoService = {
    async getConfigs() {
        const { data } = await supabase.from('system_configs').select('*');
        const mode = data?.find(c => c.key === 'mercadopago_mode')?.value || 'production';
        const pkProd = data?.find(c => c.key === 'mercadopago_public_key')?.value || '';
        const atProd = data?.find(c => c.key === 'mercadopago_access_token')?.value || '';
        const pkTest = data?.find(c => c.key === 'mercadopago_test_public_key')?.value || '';
        const atTest = data?.find(c => c.key === 'mercadopago_test_access_token')?.value || '';

        const accessToken = (mode === 'sandbox' && atTest) ? atTest : atProd;
        const publicKey = (mode === 'sandbox' && pkTest) ? pkTest : pkProd;

        return { publicKey, accessToken, mode, atProd, pkProd, atTest, pkTest };
    },

    async createPlan(planData: MPPlan, token?: string) {
        const activeToken = token || (await this.getConfigs()).accessToken;
        if (!activeToken) throw new Error('Access Token do Mercado Pago não configurado.');

        const { data, error } = await supabase.functions.invoke('mercadopago-api', {
            body: { action: 'create-plan', accessToken: activeToken, payload: planData }
        });

        if (error || (data && data.success === false)) throw new Error(error?.message || data?.error || 'Erro ao criar plano no Mercado Pago');
        return data;
    },

    async subscribeUser(planId: string, email: string) {
        // Implementar lógica de assinatura recorrente (Checkout PRO ou API Subscription)
    },

    async testToken(token?: string) {
        const configs = await this.getConfigs();
        const activeToken = token || configs.accessToken;
        if (!activeToken) throw new Error('Access Token não fornecido para teste.');

        const { data, error } = await supabase.functions.invoke('mercadopago-api', {
            body: { action: 'test-token', accessToken: activeToken }
        });

        if (error || (data && data.success === false)) {
            const msg = error?.message || data?.message || data?.error || `Erro técnico no Mercado Pago (Status: ${data?.mp_status || 400})`;
            throw new Error(msg);
        }

        return data;
    },

    async createPreference(plan: any, userId: string, email: string) {
        const { accessToken } = await this.getConfigs();
        if (!accessToken) throw new Error('Configuração de pagamento incompleta. Access Token do Mercado Pago não encontrado.');

        const unitPrice = parseFloat(plan.price || 0);
        if (unitPrice <= 0) {
            throw new Error('Não é possível gerar checkout para planos gratuitos. Por favor, selecione um plano pago.');
        }

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vaivistoriar.com.br';

        const preferenceData = {
            items: [{
                id: String(plan.id),
                title: `Plano VaiVistoriar: ${plan.name}`,
                description: plan.name,
                category_id: plan.type || 'subscription',
                unit_price: unitPrice,
                quantity: 1,
                currency_id: 'BRL',
            }],
            payer: { email },
            external_reference: userId,
            metadata: {
                user_id: userId,
                plan_id: plan.id,
                plan_slug: plan.slug || ''
            },
            back_urls: {
                success: `${baseUrl}/#/checkout/success?plan_id=${plan.id}`,
                failure: `${baseUrl}/#/checkout/failure`,
                pending: `${baseUrl}/#/checkout/pending`
            },
            auto_return: 'approved',
            notification_url: `https://vaivistoriar.com.br/api/functions/mercadopago-webhook`
        };

        const { data, error } = await supabase.functions.invoke('mercadopago-api', {
            body: { action: 'create-preference', accessToken, payload: preferenceData }
        });

        if (error || (data && data.success === false)) {
            const errorMsg = error?.message || (data && (data.error || data.message)) || 'Erro ao gerar preferência no Mercado Pago.';
            throw new Error(errorMsg);
        }

        return data; // Contém "init_point" ou "sandbox_init_point"
    },

    async checkPaymentStatus(userId: string, planId: string, mpPaymentId?: string, preferenceId?: string) {
        const { accessToken } = await this.getConfigs();
        if (!accessToken) return { paymentApproved: false };

        const { data, error } = await supabase.functions.invoke('mercadopago-api', {
            body: {
                action: 'check-payment-status',
                accessToken,
                userId,
                planId,
                paymentId: mpPaymentId,
                preferenceId
            }
        });

        if (error) {
            console.error('Erro ao verificar pagamento:', error);
            return { paymentApproved: false };
        }

        return data;
    }
};
