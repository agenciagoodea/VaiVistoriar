
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ConsentLog {
    id: string;
    email: string;
    accepted_at: string;
    ip_address?: string;
    user_agent?: string;
}

const LegalSettingsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logs, setLogs] = useState<ConsentLog[]>([]);
    const [legal, setLegal] = useState({
        terms: '',
        privacy: '',
        cookieBanner: 'Nós utilizamos cookies para melhorar sua experiência. Ao continuar, você concorda com nossa política.'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: configs } = await supabase.from('system_configs').select('*');
            if (configs) {
                const find = (key: string) => configs.find(c => c.key === key)?.value;
                setLegal({
                    terms: find('terms_content') || '',
                    privacy: find('privacy_content') || '',
                    cookieBanner: find('cookie_consent_text') || legal.cookieBanner
                });
            }

            const { data: logData } = await supabase
                .from('cookie_consents')
                .select('*')
                .order('accepted_at', { ascending: false })
                .limit(50);

            if (logData) setLogs(logData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'terms_content', value: legal.terms },
                { key: 'privacy_content', value: legal.privacy },
                { key: 'cookie_consent_text', value: legal.cookieBanner }
            ];
            for (const up of updates) {
                await supabase.from('system_configs').upsert({ key: up.key, value: up.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            }
            alert('Políticas salvas!');
        } catch (err: any) {
            alert(`Erro: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse">CARREGANDO...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">7. Políticas & Logs LGPD</h1>
                    <p className="text-slate-500 mt-1">Editor jurídico e registros de conformidade</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="px-10 py-4 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50">
                    {saving ? 'GRAVANDO...' : 'SALVAR POLÍTICAS'}
                </button>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-12">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Banner de Cookies (LGPD)</label>
                    <input type="text" value={legal.cookieBanner} onChange={e => setLegal({ ...legal, cookieBanner: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium" />
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Termos de Uso</label>
                        <textarea rows={12} value={legal.terms} onChange={e => setLegal({ ...legal, terms: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[32px] text-xs font-medium leading-relaxed resize-none shadow-sm" placeholder="Cole aqui seus Termos de Uso..." />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Política de Privacidade</label>
                        <textarea rows={12} value={legal.privacy} onChange={e => setLegal({ ...legal, privacy: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[32px] text-xs font-medium leading-relaxed resize-none shadow-sm" placeholder="Cole aqui sua Política de Privacidade..." />
                    </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Registros de Aceite (LGPD)</h3>
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase">{logs.length} Registros</span>
                    </div>
                    <div className="overflow-hidden rounded-3xl border border-slate-50 shadow-sm">
                        <table className="w-full text-left text-[10px] bg-slate-50/30">
                            <thead className="bg-slate-50 font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3">E-mail</th>
                                    <th className="px-6 py-3">Data/Hora</th>
                                    <th className="px-6 py-3">IP / Plataforma</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white transition-colors">
                                        <td className="px-6 py-3 font-bold text-slate-700">{log.email}</td>
                                        <td className="px-6 py-3 text-slate-400">{new Date(log.accepted_at).toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-3">
                                            <p className="text-slate-400">{log.ip_address || '--'}</p>
                                            <p className="text-[8px] text-slate-300 truncate max-w-[200px]">{log.user_agent}</p>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-300 font-bold uppercase">Nenhum registro encontrado</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalSettingsPage;
