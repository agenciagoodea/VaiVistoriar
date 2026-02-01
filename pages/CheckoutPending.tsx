
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { mercadopagoService } from '../lib/mercadopago';

const CheckoutPending: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const paymentId = searchParams.get('payment_id');
    const preferenceId = searchParams.get('preference_id');
    const [checking, setChecking] = useState(false);
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        let interval: any;

        const checkStatus = async () => {
            if (checking) return;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                console.log('Verificando status do pagamento pendente...');
                const result = await mercadopagoService.checkPaymentStatus(user.id, '', paymentId || undefined, preferenceId || undefined);

                if (result?.paymentApproved) {
                    setStatus('approved');
                    console.log('Pagamento aprovado! Redirecionando...');
                    setTimeout(() => {
                        navigate('/checkout/success?' + searchParams.toString());
                    }, 2000);
                } else if (result?.latestStatus === 'rejected') {
                    setStatus('rejected');
                }
            } catch (err) {
                console.error('Erro ao verificar status:', err);
            }
        };

        // Verifica imediatamente
        checkStatus();

        // Polling mais frequente (a cada 3 segundos)
        interval = setInterval(checkStatus, 3000);

        // Listener Real-time no histórico de pagamento
        // Removido filtro estrito para garantir recebimento de qualquer update neste user
        const historyChannel = supabase
            .channel('checkout-payment-history')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'payment_history',
            }, (payload) => {
                console.log('Real-time: Mudança no histórico detectada:', payload.new.status);
                // Verifica se é o pagamento atual ou se foi aprovado recentemente
                if (payload.new.status === 'approved') {
                    // Confirmação extra via API antes de liberar
                    checkStatus();
                    setStatus('approved');
                    setTimeout(() => {
                        navigate('/checkout/success?' + searchParams.toString());
                    }, 1000);
                } else if (['rejected', 'cancelled'].includes(payload.new.status)) {
                    setStatus('rejected');
                }
            })
            .subscribe();

        // Listener Real-time no Perfil (Garante ativação mesmo se o histórico falhar)
        const profileChannel = supabase
            .channel('checkout-profile')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'broker_profiles',
            }, (payload) => {
                // Se o status mudou para Ativo e o plano é o que esperamos (ou apenas mudou para Ativo)
                if (payload.new.status === 'Ativo') {
                    console.log('Real-time: Perfil ativado detectado!');
                    setStatus('approved');
                    setTimeout(() => {
                        navigate('/checkout/success?' + searchParams.toString());
                    }, 1000);
                }
            })
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(historyChannel);
            supabase.removeChannel(profileChannel);
        };
    }, [paymentId, preferenceId, navigate, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-['Inter']">
            <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-blue-100/50 border border-slate-100 p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">

                {status === 'approved' ? (
                    <div className="inline-flex w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[32px] items-center justify-center animate-bounce">
                        <span className="material-symbols-outlined text-5xl">check_circle</span>
                    </div>
                ) : status === 'rejected' ? (
                    <div className="inline-flex w-24 h-24 bg-rose-50 text-rose-500 rounded-[32px] items-center justify-center">
                        <span className="material-symbols-outlined text-5xl">cancel</span>
                    </div>
                ) : (
                    <div className="inline-flex w-24 h-24 bg-blue-50 text-blue-500 rounded-[32px] items-center justify-center animate-pulse">
                        <span className="material-symbols-outlined text-5xl">schedule</span>
                    </div>
                )}

                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {status === 'approved' ? 'Pagamento Confirmado!' : status === 'rejected' ? 'Pagamento Recusado' : 'Pagamento Pendente'}
                    </h1>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        {status === 'approved'
                            ? 'Sua assinatura foi ativada com sucesso. Estamos te redirecionando...'
                            : status === 'rejected'
                                ? 'Infelizmente seu pagamento não foi aprovado pela operadora.'
                                : 'Seu pagamento está sendo processado. Assim que ouvirmos a confirmação do banco, esta página atualizará automaticamente.'}
                    </p>
                </div>

                {status === 'pending' && (
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[11px] font-bold text-blue-700 text-left">
                            Aguardando confirmação do Mercado Pago... não feche esta página.
                        </p>
                    </div>
                )}

                <div className="pt-4 flex flex-col gap-3">
                    <Link
                        to="/pj"
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        Voltar ao Dashboard
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPending;
