import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [text, setText] = useState('Utilizamos cookies para melhorar sua experiência...');

    useEffect(() => {
        const consent = localStorage.getItem('vpro_cookie_consent');
        if (!consent) {
            fetchConfig();
            setIsVisible(true);
        }
    }, []);

    const fetchConfig = async () => {
        const { data } = await supabase
            .from('system_configs')
            .select('value')
            .eq('key', 'cookie_consent_text')
            .single();
        if (data) setText(data.value);
    };

    const handleAccept = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const consentData = {
                user_id: user?.id || null,
                session_id: localStorage.getItem('vpro_session_id') || crypto.randomUUID(),
                user_agent: navigator.userAgent,
                ip_address: null
            };

            const { error: insertError } = await supabase.from('cookie_consents').insert([consentData]);

            if (insertError) {
                console.error('❌ Erro no INSERT de cookie_consents:', insertError);
                throw insertError;
            }



            localStorage.setItem('vpro_cookie_consent', 'true');
            setIsVisible(false);
        } catch (err) {
            console.error('❌ Falha ao processar consentimento:', err);
            // Salva no local storage mesmo se o banco falhar para não travar o usuário
            localStorage.setItem('vpro_cookie_consent', 'true');
            setIsVisible(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full z-[100] p-4 md:p-8 animate-in slide-in-from-bottom-full duration-700">
            <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)] rounded-[32px] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <div className="flex-1 space-y-3 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <span className="material-symbols-outlined text-sm">cookie</span>
                        Privacidade & Cookies
                    </div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Respeitamos a sua privacidade</h3>
                    <div className="text-slate-500 text-sm leading-relaxed font-medium">
                        <p>{text}</p>
                        <div className="mt-2 flex gap-4">
                            <Link to="/terms" className="text-blue-600 font-bold hover:underline">Termos de Uso</Link>
                            <Link to="/privacy" className="text-blue-600 font-bold hover:underline">Política de Privacidade</Link>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={handleAccept}
                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
                    >
                        Aceitar e Continuar
                    </button>
                    <Link
                        to="/privacy"
                        className="px-10 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all text-center"
                    >
                        Configurar
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
