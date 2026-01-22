
import React from 'react';
import { Link } from 'react-router-dom';

const CheckoutPending: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-['Inter']">
            <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-blue-100/50 border border-slate-100 p-10 text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="inline-flex w-24 h-24 bg-blue-50 text-blue-500 rounded-[32px] items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-5xl">schedule</span>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pagamento Pendente</h1>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Seu pagamento está sendo processado. Isso pode levar alguns minutos dependendo do método escolhido (ex: boleto ou análise de cartão).
                    </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500">info</span>
                    <p className="text-[11px] font-bold text-blue-700 text-left">
                        Assim que o pagamento for confirmado, seu plano será atualizado automaticamente. Você receberá um e-mail de confirmação.
                    </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Link
                        to="/admin"
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
