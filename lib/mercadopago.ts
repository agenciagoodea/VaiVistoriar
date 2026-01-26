
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
        const pk = data?.find(c => c.key === 'mercadopago_public_key')?.value;
        const at = data?.find(c => c.key === 'mercadopago_access_token')?.value;
        return { publicKey: pk, accessToken: at };
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
        console.log(`Iniciando assinatura do plano ${planId} para ${email}`);
    },

    async testToken(token?: string) {
        const activeToken = token || (await this.getConfigs()).accessToken;
        if (!activeToken) throw new Error('Access Token não configurado.');

        const { data, error } = await supabase.functions.invoke('mercadopago-api', {
            body: { action: 'test-token', accessToken: activeToken }
        });

        if (error || (data && data.success === false)) {
            const msg = error?.message || data?.message || data?.error || `Erro técnico (Status: ${data?.mp_status})`;
            throw new Error(msg);
        }

        return data;
    },

    async createPreference(plan: any, userId: string, email: string) {
        const { accessToken } = await this.getConfigs();
        if (!accessToken) throw new Error('Configuração de pagamento incompleta.');

        // Proteção para planos gratuitos (Preço deve ser > 0 para o Mercado Pago)
        const unitPrice = parseFloat(plan.price || 0);
        if (unitPrice <= 0) {
            throw new Error('Não é possível gerar checkout para planos gratuitos. Por favor, selecione um plano pago.');
        }

        const preferenceData = {
            items: [{
                id: plan.id,
                title: `Plano VistoriaPro: ${plan.name}`,
                unit_price: unitPrice,
                quantity: 1,
                currency_id: 'BRL',
            }],
            payer: { email },
            external_reference: userId,
            metadata: {
                user_id: userId,
                plan_id: plan.id,
                plan_slug: plan.slug
            },
            back_urls: {
                // Removemos o hash (#) temporariamente pois o MP pode invalidar a URL de retorno automática
                success: `${window.location.origin}/checkout/success`,
                failure: `${window.location.origin}/checkout/failure`,
                pending: `${window.location.origin}/checkout/pending`
            },
            auto_return: 'all',
        };

        console.log('Solicitando Preferência:', preferenceData);

        const { data, error } = await supabase.functions.invoke('mercadopago-api', {
            body: { action: 'create-preference', accessToken, payload: preferenceData }
        });

        console.log('Resposta MP API:', { data, error });

        if (error || (data && data.success === false)) {
            const errorMsg = error?.message || (data && (data.error || data.message)) || 'Erro ao gerar checkout.';
            throw new Error(errorMsg);
        }

        return data; // Contém "init_point"
    }
};
