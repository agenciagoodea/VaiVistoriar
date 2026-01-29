
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

declare global {
    interface Window {
        MercadoPago: any;
    }
}

const TransparentCheckout: React.FC<{ plan: any; email: string }> = ({ plan, email }) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initBrick = async () => {
            try {
                const { data } = await supabase.from('system_configs').select('*');
                const pk = data?.find(c => c.key === 'mercadopago_public_key')?.value;
                if (!pk) throw new Error('Public Key não configurada.');

                const mp = new window.MercadoPago(pk, {
                    locale: 'pt-BR'
                });

                const bricksBuilder = mp.bricks();

                const renderCardBrick = async (bricksBuilder: any) => {
                    const settings = {
                        initialization: {
                            amount: parseFloat(plan.price), // Valor total a ser pago
                            payer: {
                                email: email,
                            },
                        },
                        customization: {
                            visual: {
                                style: {
                                    theme: 'default', // | 'dark' | 'bootstrap' | 'flat'
                                },
                            },
                            paymentMethods: {
                                maxInstallments: 1,
                            }
                        },
                        callbacks: {
                            onReady: () => {
                                setLoading(false);
                            },
                            onSubmit: (data: any) => {
                                // Enviar dados de pagamento para sua Edge Function de Checkout Transparente
                                return new Promise((resolve, reject) => {
                                    console.log('Dados do Cartão enviando para o Backend:', data);
                                    // Aqui você chamaria: supabase.functions.invoke('process-transparent-payment', { body: data })
                                    alert('Demonstração: Os dados seriam processados via API agora.');
                                    resolve(true);
                                });
                            },
                            onError: (error: any) => {
                                console.error('Erro no Brick:', error);
                            },
                        },
                    };
                    window.cardPaymentBrickController = await bricksBuilder.create(
                        'cardPayment',
                        'cardPaymentBrick_container',
                        settings
                    );
                };

                renderCardBrick(bricksBuilder);
            } catch (err) {
                console.error('Falha ao iniciar Mercado Pago Brick:', err);
            }
        };

        if (window.MercadoPago) {
            initBrick();
        } else {
            console.error('SDK do Mercado Pago não carregou.');
        }
    }, [plan, email]);

    return (
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-600">credit_card</span>
                <h3 className="font-black text-slate-900 tracking-tight">Checkout Transparente</h3>
            </div>

            {loading && <div className="h-40 flex items-center justify-center animate-pulse text-xs font-bold text-slate-400">Iniciando ambiente seguro...</div>}

            <div id="cardPaymentBrick_container"></div>

            <p className="text-[10px] text-slate-400 text-center font-medium italic">
                Pagamento processado com segurança pelo Mercado Pago.
                <br />Sua segurança é nossa prioridade.
            </p>
        </div>
    );
};

export default TransparentCheckout;
