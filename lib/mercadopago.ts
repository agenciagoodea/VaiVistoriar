
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

    async createPlan(planData: MPPlan) {
        const { accessToken } = await this.getConfigs();
        if (!accessToken) throw new Error('Access Token do Mercado Pago não configurado.');

        const response = await fetch('https://api.mercadopago.com/preapproval_plan', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(planData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao criar plano no Mercado Pago');
        }

        return await response.json();
    },

    async subscribeUser(planId: string, email: string) {
        // Implementar lógica de assinatura recorrente (Checkout PRO ou API Subscription)
        console.log(`Iniciando assinatura do plano ${planId} para ${email}`);
    },

    async testToken() {
        const { accessToken } = await this.getConfigs();
        if (!accessToken) throw new Error('Access Token não configurado.');

        const response = await fetch('https://api.mercadopago.com/v1/users/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Token inválido ou expirado');
        }

        return await response.json();
    }
};
