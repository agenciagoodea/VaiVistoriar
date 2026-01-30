
import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { mercadopagoService } from '../lib/mercadopago';

const CheckoutSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');

    const [activating, setActivating] = React.useState(false);
    const externalRef = searchParams.get('external_reference'); // Usado pelo MP para passar o userId

    useEffect(() => {
        const handleSuccess = async () => {
            console.log(`Pagamento ${paymentId} concluído com status ${status} para o usuário ${externalRef}`);

            if (status === 'approved') {
                setActivating(true);
                try {
                    // 1. ATIVAÇÃO DO PLANO VIA API SECURE (LADO SERVER)
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const planId = searchParams.get('plan_id');

                        // Chama a API para verificar e ativar
                        // A API agora é inteligente e busca os dados reais no metadata do pagamento
                        const result = await mercadopagoService.checkPaymentStatus(user.id, planId || '', paymentId || undefined);

                        if (result?.success || result?.paymentApproved) {
                            console.log('Plano ativado/verificado com sucesso via API!');
                        } else {
                            console.warn('Pagamento não confirmado pela API ainda.');
                        }
                    }
                } catch (err) {
                    console.error('Erro na ativação pós-pagamento:', err);
                } finally {
                    setActivating(false);
                }
            }
        };
        handleSuccess();
    }, [paymentId, status, externalRef, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-['Inter']">
            <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-emerald-100/50 border border-slate-100 p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="inline-flex w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[32px] items-center justify-center animate-bounce">
                    <span className="material-symbols-outlined text-5xl">check_circle</span>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pagamento Aprovado!</h1>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Parabéns! Sua assinatura foi processada com sucesso. Você já pode desfrutar de todos os recursos do seu novo plano.
                    </p>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                        <span>ID do Pagamento</span>
                        <span className="text-slate-900">{paymentId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                        <span>Status</span>
                        <span className="text-emerald-600">Aprovado</span>
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Link
                        to="/admin"
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        Ir para o Dashboard
                        <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    </Link>
                    <Link
                        to="/reports"
                        className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                    >
                        Ver minhas faturas
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
