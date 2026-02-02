
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const TermsOfServicePage: React.FC = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            const { data } = await supabase
                .from('system_configs')
                .select('value')
                .eq('key', 'legal_terms')
                .single();

            if (data) setContent(data.value || '');
        } catch (err) {
            console.error('Erro ao carregar termos:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-20">
            <div className="max-w-4xl mx-auto px-6">
                <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-bold mb-10 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                    Voltar para Home
                </Link>

                <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-12 space-y-8">
                    <div className="border-b border-slate-100 pb-8">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Termos de Uso</h1>
                        <p className="text-slate-500 mt-3">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>

                    <div className="prose prose-slate max-w-none">
                        {content ? (
                            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                                {content}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-slate-400">
                                <p className="font-bold">Termos de Uso não configurados.</p>
                                <p className="text-sm mt-2">Entre em contato com o administrador do sistema.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfServicePage;
