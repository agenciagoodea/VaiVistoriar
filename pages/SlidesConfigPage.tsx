
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface HeroSlider {
    id: string;
    image: string;
    title: string;
    subtitle: string;
    badge: string;
    btnLabel?: string;
    btnLink?: string;
    btnStyle?: 'primary' | 'outline';
}

const SlidesConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [sliders, setSliders] = useState<HeroSlider[]>([]);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data: configs } = await supabase.from('system_configs').select('*');
            if (configs) {
                const savedSliders = configs.find(c => c.key === 'home_sliders_json')?.value;
                if (savedSliders) setSliders(JSON.parse(savedSliders));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(id);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `settings/slider-${id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setSliders(prev => prev.map(s => s.id === id ? { ...s, image: publicUrl } : s));
        } catch (err) {
            alert('Erro no upload.');
        } finally {
            setUploading(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabase.from('system_configs').upsert({ key: 'home_sliders_json', value: JSON.stringify(sliders), updated_at: new Date().toISOString() }, { onConflict: 'key' });
            alert('Slides salvos!');
        } catch (err: any) {
            alert(`Erro: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const updateSliderField = (id: string, field: keyof HeroSlider, val: string) => {
        setSliders(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse">CARREGANDO...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">3. Módulo de Slides</h1>
                    <p className="text-slate-500 mt-1">Gerencie os banners e botões da Landing Page</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="px-10 py-4 bg-indigo-600 hover:bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50">
                    {saving ? 'Gravando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
                <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Configuração de Banners</h3>
                    <button onClick={() => setSliders([...sliders, { id: Date.now().toString(), badge: 'Destaque', title: 'Novo Título', subtitle: 'Subtítulo', image: '', btnLabel: 'Saiba Mais', btnLink: '/register', btnStyle: 'primary' }])} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">+ Adicionar Slide</button>
                </div>

                <div className="grid gap-12">
                    {sliders.map((s) => (
                        <div key={s.id} className="p-10 bg-slate-50 border border-slate-100 rounded-[40px] relative group animate-in slide-in-from-right-4 duration-500">
                            <button onClick={() => setSliders(sliders.filter(sl => sl.id !== s.id))} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>

                            <div className="grid lg:grid-cols-2 gap-10">
                                {/* Imagem */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Imagem de Fundo</label>
                                    <div className="h-64 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center relative cursor-pointer overflow-hidden group/img" onClick={() => (document.getElementById(`up-${s.id}`) as any).click()}>
                                        {s.image ? <img src={s.image} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-1000" /> : <span className="material-symbols-outlined text-slate-200 text-6xl">add_photo_alternate</span>}
                                        {uploading === s.id && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full" /></div>}
                                        <input type="file" id={`up-${s.id}`} className="hidden" accept="image/*" onChange={e => handleUpload(e, s.id)} />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity"><span className="material-symbols-outlined text-white text-3xl">upload</span></div>
                                    </div>
                                </div>

                                {/* Textos */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Badge Superior</label>
                                        <input type="text" value={s.badge} onChange={e => updateSliderField(s.id, 'badge', e.target.value)} className="w-full px-5 py-3 bg-white border border-slate-100 rounded-2xl outline-none text-xs font-bold text-indigo-600" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Título Grande</label>
                                        <input type="text" value={s.title} onChange={e => updateSliderField(s.id, 'title', e.target.value)} className="w-full px-5 py-3 bg-white border border-slate-100 rounded-2xl outline-none text-sm font-black" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Subtítulo / Descrição</label>
                                        <textarea rows={3} value={s.subtitle} onChange={e => updateSliderField(s.id, 'subtitle', e.target.value)} className="w-full px-5 py-3 bg-white border border-slate-100 rounded-2xl outline-none text-xs font-medium resize-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Configuração de Botão (Nova) */}
                            <div className="mt-10 pt-8 border-t border-slate-200/50 grid md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Texto do Botão</label>
                                    <input type="text" value={s.btnLabel || ''} onChange={e => updateSliderField(s.id, 'btnLabel', e.target.value)} placeholder="Ex: Começar Agora" className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Link / URL do Botão</label>
                                    <input type="text" value={s.btnLink || ''} onChange={e => updateSliderField(s.id, 'btnLink', e.target.value)} placeholder="Ex: /register ou #planos" className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl text-xs" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estilo do Botão</label>
                                    <select value={s.btnStyle || 'primary'} onChange={e => updateSliderField(s.id, 'btnStyle', e.target.value as any)} className="w-full px-5 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none cursor-pointer">
                                        <option value="primary">Sólido (Cor Primária)</option>
                                        <option value="outline">Contorno (Transparente)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                    {sliders.length === 0 && <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[40px] text-slate-300 font-bold uppercase text-[10px] tracking-widest">Nenhum slide cadastrado</div>}
                </div>
            </div>
        </div>
    );
};

export default SlidesConfigPage;
