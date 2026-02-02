
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Step {
    id: string;
    title: string;
    desc: string;
    icon: string;
}

const ICON_BASE = [
    'rocket_launch', 'verified_user', 'bolt', 'auto_fix_high', 'analytics', 'devices',
    'timeline', 'lightbulb', 'layers', 'view_agenda', 'check_circle', 'stars'
];

const StepsConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data: configs } = await supabase.from('system_configs').select('*');
            if (configs) {
                const savedSteps = configs.find(c => c.key === 'home_steps_json')?.value;
                if (savedSteps) setSteps(JSON.parse(savedSteps));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabase.from('system_configs').upsert({ key: 'home_steps_json', value: JSON.stringify(steps), updated_at: new Date().toISOString() }, { onConflict: 'key' });
            alert('Passos salvos!');
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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">4. Passo a Passo</h1>
                    <p className="text-slate-500 mt-1">Módulo de Funcionamento (Carrossel Home)</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="px-10 py-4 bg-orange-600 hover:bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-100 transition-all active:scale-95 disabled:opacity-50">
                    {saving ? 'Gravando...' : 'Salvar Passo a Passo'}
                </button>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
                <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Etapas do Processo</h3>
                    <button onClick={() => setSteps([...steps, { id: Date.now().toString(), title: 'Nova Etapa', desc: '...', icon: 'rocket_launch' }])} className="px-6 py-2.5 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">+ Adicionar Passo</button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {steps.map((st) => (
                        <div key={st.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] relative space-y-4 animate-in zoom-in-95 duration-300">
                            <button onClick={() => setSteps(steps.filter(item => item.id !== st.id))} className="absolute top-4 right-4 text-slate-300 hover:text-red-500">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm text-orange-600">
                                    <span className="material-symbols-outlined">{st.icon}</span>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <input type="text" value={st.title} onChange={e => setSteps(steps.map(item => item.id === st.id ? { ...item, title: e.target.value } : item))} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-orange-500/20" />
                                </div>
                            </div>
                            <textarea rows={2} value={st.desc} onChange={e => setSteps(steps.map(item => item.id === st.id ? { ...item, desc: e.target.value } : item))} className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-medium resize-none shadow-sm focus:ring-2 focus:ring-orange-500/20 outline-none" />
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {ICON_BASE.map(icon => (
                                    <button key={icon} onClick={() => setSteps(steps.map(item => item.id === st.id ? { ...item, icon } : item))} className={`p-2 rounded-lg transition-all flex-shrink-0 ${st.icon === icon ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-white text-slate-300 hover:bg-orange-50'}`}>
                                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {steps.length === 0 && <div className="md:col-span-2 p-20 text-center border-2 border-dashed border-slate-100 rounded-[40px] text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhum passo cadastrado</div>}
                </div>
            </div>
        </div>
    );
};

export default StepsConfigPage;
