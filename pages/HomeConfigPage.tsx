
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface HeroSlider {
    id: string;
    image: string;
    title: string;
    subtitle: string;
    badge: string;
}

interface Feature {
    id: string;
    icon: string;
    svgCode?: string;
    followColor?: boolean;
    title: string;
    desc: string;
}

interface FooterConfig {
    col1_text: string;
    col2_title: string;
    col2_links: { label: string; url: string }[];
    col3_title: string;
    col3_contact: string;
    socials: { provider: 'whatsapp' | 'instagram' | 'facebook' | 'linkedin'; url: string }[];
}

const ICON_BASE = ['phonelink_setup', 'photo_camera', 'cloud_done', 'compare_arrows', 'format_list_bulleted', 'ink_pen', 'verified', 'security', 'rocket_launch'];

const HomeConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);

    // Configs Gerais
    const [primaryColor, setPrimaryColor] = useState('#137fec');
    const [secondaryColor, setSecondaryColor] = useState('#f8fafc');
    const [logoUrl, setLogoUrl] = useState('');

    // Hero Sliders
    const [sliders, setSliders] = useState<HeroSlider[]>([
        { id: '1', badge: 'Novidade: Assinatura Digital', title: 'Revolucione suas Vistorias', subtitle: 'A plataforma #1...', image: '' }
    ]);

    // Features (Acordeom)
    const [features, setFeatures] = useState<Feature[]>([]);
    const [activeFeatureIdx, setActiveFeatureIdx] = useState<number | null>(0);

    // Footer
    const [footer, setFooter] = useState<FooterConfig>({
        col1_text: 'Simplificando processos imobiliários com tecnologia de ponta.',
        col2_title: 'Menu Rápido',
        col2_links: [{ label: 'Funcionalidades', url: '#funcionalidades' }, { label: 'Planos', url: '#planos' }],
        col3_title: 'Contato',
        col3_contact: 'contato@vistoriapro.com.br',
        socials: [{ provider: 'instagram', url: '#' }]
    });

    const logoInputRef = useRef<HTMLInputElement>(null);
    const sliderInputRefs = useRef<{ [key: string]: HTMLInputElement }>({});

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data } = await supabase.from('system_configs').select('*');
            if (data) {
                const find = (key: string) => data.find(c => c.key === key)?.value;
                if (find('home_primary_color')) setPrimaryColor(find('home_primary_color'));
                if (find('home_secondary_color')) setSecondaryColor(find('home_secondary_color'));
                if (find('home_logo_url')) setLogoUrl(find('home_logo_url'));

                const savedSliders = find('home_sliders_json');
                if (savedSliders) setSliders(JSON.parse(savedSliders));

                const savedFeatures = find('home_features_json');
                if (savedFeatures) setFeatures(JSON.parse(savedFeatures));

                const savedFooter = find('home_footer_json');
                if (savedFooter) setFooter(JSON.parse(savedFooter));
            }
        } catch (err) {
            console.error('Erro ao buscar configurações:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (file: File, path: string, targetState: 'logo' | 'slider', sliderId?: string) => {
        setUploading(sliderId || path);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${path}-${Date.now()}.${fileExt}`;
            const filePath = `landing/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

            if (targetState === 'logo') setLogoUrl(publicUrl);
            if (targetState === 'slider' && sliderId) {
                setSliders(prev => prev.map(s => s.id === sliderId ? { ...s, image: publicUrl } : s));
            }
        } catch (err: any) {
            alert(`Erro: ${err.message}`);
        } finally {
            setUploading(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'home_primary_color', value: primaryColor },
                { key: 'home_secondary_color', value: secondaryColor },
                { key: 'home_logo_url', value: logoUrl },
                { key: 'home_sliders_json', value: JSON.stringify(sliders) },
                { key: 'home_features_json', value: JSON.stringify(features) },
                { key: 'home_footer_json', value: JSON.stringify(footer) }
            ];
            for (const up of updates) await supabase.from('system_configs').upsert({ ...up, updated_at: new Date() });
            alert('Landing Page Premium publicada!');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-32 max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-lg z-50 py-4 border-b border-slate-100">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Home Premium</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Editor Visual de Alta Performance</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-12 py-4 bg-slate-900 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center gap-3"
                >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <span className="material-symbols-outlined text-[18px]">rocket_launch</span>}
                    {saving ? 'Publicando...' : 'Publicar Agora'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* EDITOR COL */}
                <div className="lg:col-span-7 space-y-10">

                    {/* IDENTIDADE: Logo & Cores */}
                    <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-[28px]">palette</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Marca e Identidade</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logotipo do Sistema</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain p-2" /> : <span className="material-symbols-outlined text-slate-300 transform group-hover:scale-110 transition-transform">add_a_photo</span>}
                                        {uploading === 'logo' && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" /></div>}
                                    </div>
                                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={e => e.target.files && handleUpload(e.target.files[0], 'logo', 'logo')} />
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500">Tamanho ideal: 200x60px</p>
                                        <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="Ou cole a URL..." className="w-full px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-mono border-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cor de Destaque</label>
                                    <div className="flex gap-2">
                                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-12 border-none p-0 bg-transparent cursor-pointer rounded-xl" />
                                        <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl text-xs font-mono font-bold border-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* HERO SLIDERS */}
                    <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
                                    <span className="material-symbols-outlined text-[28px]">view_carousel</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Hero Sliders</h3>
                            </div>
                            <button onClick={() => setSliders([...sliders, { id: Date.now().toString(), badge: 'Novo Destaque', title: 'Título Aqui', subtitle: 'Subtítulo...', image: '' }])} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">add</span> Adicionar Slide
                            </button>
                        </div>
                        <div className="space-y-8">
                            {sliders.map((s, idx) => (
                                <div key={s.id} className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 space-y-6 relative group animate-in slide-in-from-right-4 duration-500">
                                    <button onClick={() => setSliders(sliders.filter(sl => sl.id !== s.id))} className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-full shadow-lg flex items-center justify-center transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Texto Badge</label>
                                                <input type="text" value={s.badge} onChange={e => setSliders(sliders.map(sl => sl.id === s.id ? { ...sl, badge: e.target.value } : sl))} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Título Principal</label>
                                                <input type="text" value={s.title} onChange={e => setSliders(sliders.map(sl => sl.id === s.id ? { ...sl, title: e.target.value } : sl))} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black" />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Imagem (Upload)</label>
                                            <div className="h-28 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center relative group cursor-pointer overflow-hidden" onClick={() => sliderInputRefs.current[s.id]?.click()}>
                                                {s.image ? <img src={s.image} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-300">image</span>}
                                                {uploading === s.id && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" /></div>}
                                            </div>
                                            <input type="file" ref={el => el && (sliderInputRefs.current[s.id] = el)} className="hidden" accept="image/*" onChange={e => e.target.files && handleUpload(e.target.files[0], `slider-${s.id}`, 'slider', s.id)} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subtítulo</label>
                                        <textarea rows={2} value={s.subtitle} onChange={e => setSliders(sliders.map(sl => sl.id === s.id ? { ...sl, subtitle: e.target.value } : sl))} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-medium leading-relaxed" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* FUNCIONALIDADES (ACORDEOM) */}
                    <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                                    <span className="material-symbols-outlined text-[28px]">layers</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recursos Poderosos</h3>
                            </div>
                            <button onClick={() => {
                                const newF = { id: Date.now().toString(), icon: 'rocket', title: 'Novo Recurso', desc: 'Descrição...', followColor: true };
                                setFeatures([...features, newF]);
                                setActiveFeatureIdx(features.length);
                            }} className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">add_task</span> Novo Card
                            </button>
                        </div>
                        <div className="space-y-4">
                            {features.map((f, idx) => (
                                <div key={f.id} className={`rounded-[32px] border transition-all ${activeFeatureIdx === idx ? 'border-emerald-500 ring-4 ring-emerald-500/5 bg-slate-50/30' : 'border-slate-100 hover:border-slate-200'}`}>
                                    <button onClick={() => setActiveFeatureIdx(activeFeatureIdx === idx ? null : idx)} className="w-full px-8 py-6 flex items-center justify-between text-left">
                                        <div className="flex items-center gap-4">
                                            <span className="material-symbols-outlined text-emerald-600 opacity-50">{f.icon}</span>
                                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{f.title || 'Novo Recurso'}</span>
                                        </div>
                                        <span className={`material-symbols-outlined transition-transform duration-300 ${activeFeatureIdx === idx ? 'rotate-180' : ''}`}>expand_more</span>
                                    </button>
                                    {activeFeatureIdx === idx && (
                                        <div className="px-8 pb-8 pt-2 space-y-8 animate-in slide-in-from-top-4 duration-300">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Título</label>
                                                        <input type="text" value={f.title} onChange={e => updateFeature(idx, 'title', e.target.value)} className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                                                        <textarea rows={3} value={f.desc} onChange={e => updateFeature(idx, 'desc', e.target.value)} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-xs font-medium" />
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seletor de Ícones</label>
                                                        <div className="grid grid-cols-5 gap-2 p-4 bg-white rounded-[24px] border border-slate-100 shadow-inner">
                                                            {ICON_BASE.map(icon => (
                                                                <button key={icon} onClick={() => updateFeature(idx, 'icon', icon)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${f.icon === icon ? 'bg-emerald-500 text-white shadow-lg scale-110' : 'text-slate-300 hover:bg-slate-50'}`}>
                                                                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Upload SVG Customizado</label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="checkbox" checked={f.followColor} onChange={e => updateFeature(idx, 'followColor', e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Herdar Cor</span>
                                                            </label>
                                                        </div>
                                                        <textarea value={f.svgCode} onChange={e => updateFeature(idx, 'svgCode', e.target.value)} placeholder="Cole aqui o <svg>..." className="w-full h-24 px-4 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-mono leading-relaxed" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <button onClick={() => removeFeature(idx)} className="px-6 py-2.5 text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 rounded-xl transition-all">Remover Recurso</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* RODAPÉ PREMIUM */}
                    <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-[28px]">view_agenda</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Rodapé Modular</h3>
                        </div>
                        <div className="grid gap-10">
                            <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 space-y-6">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Coluna 1: Bio e Logo</h4>
                                <textarea rows={2} value={footer.col1_text} onChange={e => setFooter({ ...footer, col1_text: e.target.value })} className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium" />
                            </div>
                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 space-y-6">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Coluna 2: Links Rápidos</h4>
                                    <input type="text" value={footer.col2_title} onChange={e => setFooter({ ...footer, col2_title: e.target.value })} className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest" />
                                    <div className="space-y-3">
                                        {footer.col2_links.map((link, lidx) => (
                                            <div key={lidx} className="flex gap-2">
                                                <input type="text" value={link.label} onChange={e => {
                                                    const l = [...footer.col2_links];
                                                    l[lidx].label = e.target.value;
                                                    setFooter({ ...footer, col2_links: l });
                                                }} placeholder="Link" className="flex-1 px-4 py-2 bg-white rounded-xl text-xs border border-slate-100" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 space-y-6">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Coluna 3: Contato</h4>
                                    <input type="text" value={footer.col3_title} onChange={e => setFooter({ ...footer, col3_title: e.target.value })} className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest" />
                                    <input type="text" value={footer.col3_contact} onChange={e => setFooter({ ...footer, col3_contact: e.target.value })} className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-bold" />
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

                {/* PREVIEW COL */}
                <div className="lg:col-span-5 relative">
                    <div className="sticky top-28 space-y-8">
                        <div className="bg-slate-900 rounded-[60px] shadow-3xl overflow-hidden border-[16px] border-slate-800 ring-8 ring-slate-100 relative">
                            <div className="bg-slate-800 px-8 py-5 flex items-center justify-between border-b border-slate-700">
                                <div className="flex gap-2.5">
                                    <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/30" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />
                                </div>
                                <div className="flex items-center gap-2 px-6 py-2 bg-slate-900/40 rounded-full text-[10px] text-slate-500 font-black tracking-[0.2em] shadow-inner uppercase">
                                    <span className="material-symbols-outlined text-[14px]">lock</span>
                                    VistoriaPro.com
                                </div>
                                <div className="w-16" />
                            </div>
                            <div className="bg-white h-[850px] overflow-y-auto custom-scrollbar scroll-smooth">

                                {/* NAV PREVIEW */}
                                <div className="p-8 flex justify-between items-center border-b border-slate-50 sticky top-0 bg-white/95 backdrop-blur-md z-10 transition-all">
                                    <div className="flex items-center gap-2 max-h-8">
                                        {logoUrl ? <img src={logoUrl} className="h-6 w-auto object-contain" /> : <div className="flex items-center gap-1 font-black leading-none" style={{ color: primaryColor }}><span className="material-symbols-outlined">home_app_logo</span> VistoriaPro</div>}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white"><span className="material-symbols-outlined text-sm">person</span></div>
                                </div>

                                {/* HERO SLIDER PREVIEW (SIMULADO) */}
                                <div className="relative h-[400px] bg-slate-900 overflow-hidden flex items-center justify-center text-center p-12 group">
                                    {sliders[0]?.image && <img src={sliders[0].image} className="absolute inset-0 w-full h-full object-cover opacity-50 scale-110 blur-[2px]" />}
                                    <div className="relative z-10 space-y-6">
                                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/10 text-white backdrop-blur-sm border border-white/5">{sliders[0]?.badge}</span>
                                        <h1 className="text-3xl font-black text-white leading-tight drop-shadow-2xl">{sliders[0]?.title}</h1>
                                        <p className="text-[11px] text-slate-300 font-medium leading-relaxed px-8 opacity-80">{sliders[0]?.subtitle.slice(0, 100)}...</p>
                                        <div className="flex justify-center gap-3 pt-4">
                                            <div className="w-10 h-1 rounded-full bg-white" />
                                            <div className="w-2 h-1 rounded-full bg-white/30" />
                                            <div className="w-2 h-1 rounded-full bg-white/30" />
                                        </div>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
                                </div>

                                {/* FEATURES PREVIEW */}
                                <div className="p-10 space-y-10" style={{ backgroundColor: secondaryColor }}>
                                    <h2 className="text-xl font-black text-center text-slate-900 tracking-tight">O que oferecemos</h2>
                                    <div className="grid gap-6">
                                        {features.slice(0, 3).map((f, i) => (
                                            <div key={i} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-5 transition-transform hover:scale-105 duration-500">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-emerald-50 text-emerald-600" style={{ color: primaryColor, backgroundColor: primaryColor + '10' }}>
                                                    {f.svgCode ? <div className="w-8 h-8 flex items-center justify-center grayscale opacity-70" dangerouslySetInnerHTML={{ __html: f.svgCode }} /> : <span className="material-symbols-outlined text-[28px]">{f.icon}</span>}
                                                </div>
                                                <div className="space-y-1 flex-1">
                                                    <h4 className="text-xs font-black text-slate-900">{f.title}</h4>
                                                    <p className="text-[10px] text-slate-400 font-medium leading-tight">{f.desc.slice(0, 60)}...</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* FOOTER PREVIEW */}
                                <div className="bg-slate-900 text-white p-12 space-y-12 rounded-t-[50px]">
                                    <div className="space-y-6">
                                        {logoUrl ? <img src={logoUrl} className="h-6 w-auto brightness-0 invert opacity-50" /> : <span className="font-black text-blue-500">VistoriaPro</span>}
                                        <p className="text-[10px] text-slate-500 leading-relaxed font-bold">{footer.col1_text}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-800">
                                        <div className="space-y-4">
                                            <h5 className="text-[10px] font-black uppercase text-white/40 tracking-widest">{footer.col2_title}</h5>
                                            <div className="space-y-2">
                                                {footer.col2_links.slice(0, 2).map((l, i) => <p key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{l.label}</p>)}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h5 className="text-[10px] font-black uppercase text-white/40 tracking-widest">{footer.col3_title}</h5>
                                            <p className="text-[10px] font-bold text-slate-400">{footer.col3_contact}</p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Experiência Multidevice</p>
                            <div className="flex justify-center gap-4 text-slate-200 opacity-50">
                                <span className="material-symbols-outlined text-4xl">laptop</span>
                                <span className="material-symbols-outlined text-4xl">tablet_mac</span>
                                <span className="material-symbols-outlined text-4xl">smartphone</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HomeConfigPage;
