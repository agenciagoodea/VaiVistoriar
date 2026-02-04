
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PoliciesConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [terms, setTerms] = useState('');
    const [privacy, setPrivacy] = useState('');
    const [cookieText, setCookieText] = useState('');
    const [consents, setConsents] = useState<any[]>([]);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data } = await supabase.from('system_configs').select('*');
            if (data) {
                const termsConfig = data.find(c => c.key === 'legal_terms');
                const privacyConfig = data.find(c => c.key === 'legal_privacy');
                const cookieConfig = data.find(c => c.key === 'cookie_consent_text');

                if (termsConfig) setTerms(termsConfig.value);
                if (privacyConfig) setPrivacy(privacyConfig.value);
                if (cookieConfig) setCookieText(cookieConfig.value);
            }

            const { data: consentData } = await supabase
                .from('cookie_consents')
                .select('id, created_at, user_id, session_id')
                .order('created_at', { ascending: false })
                .limit(50);
            if (consentData) setConsents(consentData);
        } catch (err) {
            console.error('Erro ao buscar configurações:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'legal_terms', value: terms, updated_at: new Date() },
                { key: 'legal_privacy', value: privacy, updated_at: new Date() },
                { key: 'cookie_consent_text', value: cookieText, updated_at: new Date() }
            ];

            for (const up of updates) {
                await supabase.from('system_configs').upsert(up);
            }

            alert('Políticas atualizadas com sucesso!');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse">Carregando Políticas...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Políticas e Termos</h1>
                    <p className="text-slate-500 mt-1">Gerencie os aspectos legais e de conformidade LGPD da plataforma.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600">gavel</span>
                        <h3 className="font-bold text-slate-900">Termos, Privacidade e LGPD</h3>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Banner de Cookies (LGPD)</label>
                            <textarea
                                rows={3}
                                value={cookieText}
                                onChange={(e) => setCookieText(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 font-medium"
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Conteúdo dos Termos de Uso</label>
                                <textarea
                                    rows={12}
                                    value={terms}
                                    onChange={(e) => setTerms(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Política de Privacidade</label>
                                <textarea
                                    rows={12}
                                    value={privacy}
                                    onChange={(e) => setPrivacy(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 font-medium"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600">history</span>
                        <h3 className="font-bold text-slate-900">Logs de Aceite (LGPD)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                                <tr>
                                    <th className="px-8 py-4">Data</th>
                                    <th className="px-8 py-4">Usuário</th>
                                    <th className="px-8 py-4">Sessão</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {consents.map(c => (
                                    <tr key={c.id}>
                                        <td className="px-8 py-4 font-medium">{new Date(c.created_at).toLocaleString('pt-BR')}</td>
                                        <td className="px-8 py-4 text-xs font-mono text-slate-500">{c.user_id || 'Visitante'}</td>
                                        <td className="px-8 py-4 text-xs font-mono text-slate-500 truncate max-w-[100px]">{c.session_id}</td>
                                    </tr>
                                ))}
                                {consents.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-8 py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum log encontrado</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PoliciesConfigPage;
