
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Feature {
    id: string;
    icon: string;
    title: string;
    desc: string;
}

const ICON_BASE = [
    'rocket_launch', 'verified_user', 'bolt', 'auto_fix_high', 'analytics', 'devices',
    'security', 'cloud_done', 'speed', 'workspace_premium', 'psychology', 'group_add',
    'layers', 'view_agenda', 'check_circle', 'stars', 'home', 'settings'
];

const SystemResourcesPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [heroText, setHeroText] = useState({
        title: 'Vistorias Imobiliárias',
        highlight: 'Inteligentes e Rápidas',
        description: 'A plataforma completa para corretores e imobiliárias.'
    });
    const [features, setFeatures] = useState<Feature[]>([]);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data: configs } = await supabase.from('system_configs').select('*');
            if (configs) {
                const find = (key: string) => configs.find(c => c.key === key)?.value;
                const savedHero = find('home_hero_text_json');
                if (savedHero) setHeroText(JSON.parse(savedHero));
                const savedFeatures = find('home_features_json');
                if (savedFeatures) setFeatures(JSON.parse(savedFeatures));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateFeature = (idx: number, field: keyof Feature, val: string) => {
        const newF = [...features];
        (newF[idx] as any)[field] = val;
        setFeatures(newF);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'home_hero_text_json', value: JSON.stringify(heroText) },
                { key: 'home_features_json', value: JSON.stringify(features) }
            ];
            for (const up of updates) {
                await supabase.from('system_configs').upsert({ key: up.key, value: up.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            }
            alert('Configurações salvas!');
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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">2. Recursos do Sistema</h1>
                    <p className="text-slate-500 mt-1">Texto de Apresentação e Cards de Recursos</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="px-10 py-4 bg-indigo-600 hover:bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50">
                    {saving ? 'Gravando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-12">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Título Hero</label>
                        <input type="text" value={heroText.title} onChange={e => setHeroText({ ...heroText, title: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Destaque (Cor)</label>
                        <input type="text" value={heroText.highlight} onChange={e => setHeroText({ ...heroText, highlight: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-indigo-600" />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descrição</label>
                        <textarea rows={2} value={heroText.description} onChange={e => setHeroText({ ...heroText, description: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium resize-none" />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4 border-slate-50">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Cards de Recursos</h3>
                        <button onClick={() => setFeatures([...features, { id: Date.now().toString(), icon: 'stars', title: 'Novo Recurso', desc: 'Descrição' }])} className="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100">
                            + Adicionar Recurso
                        </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {features.map((f, i) => (
                            <div key={f.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] relative space-y-4 animate-in zoom-in-95 duration-300">
                                <button onClick={() => setFeatures(features.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 text-slate-300 hover:text-red-500">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-indigo-600">{f.icon}</span>
                                    <input type="text" value={f.title} onChange={e => updateFeature(i, 'title', e.target.value)} className="flex-1 bg-white px-4 py-2 rounded-xl text-xs font-black border border-slate-100" />
                                </div>
                                <textarea rows={2} value={f.desc} onChange={e => updateFeature(i, 'desc', e.target.value)} className="w-full bg-white px-4 py-2 rounded-xl text-xs font-medium border border-slate-100" />
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                    {ICON_BASE.map(icon => (
                                        <button key={icon} onClick={() => updateFeature(i, 'icon', icon)} className={`p-2 rounded-lg transition-all flex-shrink-0 ${f.icon === icon ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300 hover:bg-indigo-50'}`}>
                                            <span className="material-symbols-outlined text-[16px]">{icon}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemResourcesPage;
