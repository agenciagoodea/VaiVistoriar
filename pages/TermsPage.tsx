
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TermsPage: React.FC = () => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const { data } = await supabase
                    .from('system_configs')
                    .select('value')
                    .eq('key', 'legal_terms')
                    .single();

                if (data?.value) {
                    setContent(data.value);
                }
            } catch (err) {
                console.error('Erro ao carregar termos:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-['Inter']">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-blue-600">
                        <span className="material-symbols-outlined font-bold text-3xl">home_app_logo</span>
                        <span className="text-xl font-black text-slate-900 tracking-tight">VaiVistoriar</span>
                    </Link>
                    <Link to="/login" className="text-sm font-black text-blue-600 uppercase tracking-widest hover:underline">Entrar</Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-10 md:p-16 border-b border-slate-50 bg-slate-50/30">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Termos de Uso</h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>

                    <div className="p-10 md:p-16">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="prose prose-slate max-w-none">
                                <div className="text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                                    {content}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">
                        Aceitar e Continuar
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                </div>
            </main>

            <footer className="py-12 text-center border-t border-slate-100 bg-white mt-20">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">© {new Date().getFullYear()} VaiVistoriar • Todos os direitos reservados</p>
            </footer>
        </div>
    );
};

export default TermsPage;
