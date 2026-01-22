
import React from 'react';
import { Link } from 'react-router-dom';

const CheckoutFailure: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-['Inter']">
            <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-rose-100/50 border border-slate-100 p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="inline-flex w-24 h-24 bg-rose-50 text-rose-500 rounded-[32px] items-center justify-center">
                    <span className="material-symbols-outlined text-5xl">cancel</span>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ops! Algo deu errado.</h1>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Não foi possível processar seu pagamento. Por favor, tente novamente ou escolha outro método de pagamento.
                    </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Link
                        to="/subscriptions"
                        className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        Tentar Novamente
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                    </Link>
                    <Link
                        to="/admin"
                        className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                    >
                        Voltar ao Dashboard
                    </Link>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-500">info</span>
                    <p className="text-[11px] font-bold text-amber-700 text-left">
                        Se o valor foi debitado, entre em contato com nosso suporte informando o horário da tentativa.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CheckoutFailure;
