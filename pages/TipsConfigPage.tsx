
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TipsConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tips, setTips] = useState<string[]>([]);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data: configs } = await supabase.from('system_configs').select('*').eq('key', 'inspection_tips').maybeSingle();
            if (configs?.value) {
                try {
                    const parsed = JSON.parse(configs.value);
                    if (Array.isArray(parsed)) {
                        setTips(parsed.filter(t => typeof t === 'string' && t.trim() !== ''));
                    } else if (typeof parsed === 'string' && parsed.trim() !== '') {
                        setTips([parsed]);
                    } else {
                        setTips([]);
                    }
                } catch (e) {
                    // SE FALHAR O PARSE: Pode ser uma string bruta (legado)
                    console.warn('Dicas no banco não são JSON válido, tentando recuperar como string bruta:', e);
                    if (typeof configs.value === 'string' && configs.value.trim() !== '') {
                        setTips([configs.value.trim()]);
                    } else {
                        setTips([]);
                    }
                }
            }
        } catch (err) {
            console.error('Erro ao buscar dicas:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const cleanTips = tips.map(t => t.trim()).filter(t => t !== '');

        if (cleanTips.length === 0 && tips.length > 0) {
            if (!confirm('Deseja realmente apagar todas as dicas?')) return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from('system_configs').upsert({
                key: 'inspection_tips',
                value: JSON.stringify(cleanTips),
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

            if (error) throw error;
            setTips(cleanTips);
            alert('✅ Dicas salvas com sucesso!');
        } catch (err: any) {
            alert(`❌ Erro ao salvar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse">CARREGANDO...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">5. Dicas de Vistoria</h1>
                    <p className="text-slate-500 mt-1">Orientações sugeridas ao corretor (Etapa de Inspeção)</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="px-10 py-4 bg-emerald-600 hover:bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50">
                    {saving ? 'Gravando...' : 'Salvar Dicas'}
                </button>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-8">
                <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Lista de Orientações</h3>
                    <button onClick={() => setTips([...tips, ''])} className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-colors">+ Nova Dica</button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    {tips.map((tip, idx) => (
                        <div key={idx} className="flex gap-3 items-center group animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-400 transition-colors">{idx + 1}</div>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={tip}
                                    onChange={e => {
                                        const newTips = [...tips];
                                        newTips[idx] = e.target.value;
                                        setTips(newTips);
                                    }}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium pr-10"
                                    placeholder="Descreva a dica aqui..."
                                />
                                <button onClick={() => setTips(tips.filter((_, i) => i !== idx))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {tips.length === 0 && <div className="md:col-span-2 p-20 text-center border-2 border-dashed border-slate-100 rounded-[40px] text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhuma dica cadastrada</div>}
                </div>
            </div>
        </div>
    );
};

export default TipsConfigPage;
