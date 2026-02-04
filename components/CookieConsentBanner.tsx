import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CookieConsentBanner: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [bannerText, setBannerText] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkConsent();
    }, []);

    const checkConsent = async () => {
        try {
            // Verificar se já aceitou (localStorage)
            const hasConsented = localStorage.getItem('cookie_consent_accepted');
            if (hasConsented) {
                setLoading(false);
                return;
            }

            // Buscar texto do banner
            const { data } = await supabase
                .from('system_configs')
                .select('value')
                .eq('key', 'cookie_consent_text')
                .single();

            if (data?.value) {
                setBannerText(data.value);
                setVisible(true);
            }
        } catch (err) {
            console.error('Erro ao verificar consentimento:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        try {
            // Salvar aceite no banco
            const { data: { user } } = await supabase.auth.getUser();
            const sessionId = crypto.randomUUID();

            await supabase.from('cookie_consents').insert({
                user_id: user?.id || null,
                session_id: sessionId,
                user_agent: navigator.userAgent,
                ip_address: null // IP será capturado pelo backend se necessário
            });

            // Salvar no localStorage
            localStorage.setItem('cookie_consent_accepted', 'true');
            setVisible(false);
        } catch (err) {
            console.error('Erro ao salvar consentimento:', err);
            // Mesmo com erro, ocultar o banner
            localStorage.setItem('cookie_consent_accepted', 'true');
            setVisible(false);
        }
    };

    if (loading || !visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                        <span className="material-symbols-outlined text-blue-400 text-3xl shrink-0">cookie</span>
                        <div className="space-y-2">
                            <p className="text-white text-sm leading-relaxed">
                                {bannerText || 'Este site utiliza cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa Política de Privacidade e Termos de Uso.'}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <Link to="/privacy" className="text-blue-400 hover:text-blue-300 font-bold underline">
                                    Política de Privacidade
                                </Link>
                                <Link to="/terms" className="text-blue-400 hover:text-blue-300 font-bold underline">
                                    Termos de Uso
                                </Link>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleAccept}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all shrink-0"
                    >
                        Aceitar e Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsentBanner;
