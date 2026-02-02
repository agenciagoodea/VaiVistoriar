import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const ICON_BASE = [
    'rocket_launch', 'verified_user', 'bolt', 'auto_fix_high', 'analytics', 'devices',
    'security', 'cloud_done', 'speed', 'workspace_premium', 'psychology', 'group_add',
    'view_carousel', 'timeline', 'lightbulb', 'layers', 'view_agenda', 'person', 'check_circle'
];

interface Feature {
    id: string;
    icon: string;
    title: string;
    desc: string;
    svgCode?: string;
    followColor: boolean;
}

interface Step {
    id: string;
    title: string;
    desc: string;
    icon: string;
}

interface FAQ {
    id: string;
    question: string;
    answer: string;
}

const HomeConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);

    // Header Config
    const [header, setHeader] = useState({
        logoPosition: 'left' as 'left' | 'center',
        bgColor: '#ffffff',
        textColor: '#0f172a',
        opacity: 100,
        isSticky: true,
        fontFamily: 'Inter',
        showMenu: true,
        showLogin: true,
        showCTA: true,
        ctaText: 'Testar Grátis',
        logoHeight: 40
    });

    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#4f46e5');
    const [secondaryColor, setSecondaryColor] = useState('#f8fafc');

    // Section Data
    const [features, setFeatures] = useState<Feature[]>([]);
    const [steps, setSteps] = useState<Step[]>([]);
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [footer, setFooter] = useState({
        col1_text: 'Simplificando vistorias imobiliárias com tecnologia e agilidade.',
        col2_title: 'Plataforma',
        col2_links: [{ label: 'Funcionalidades', url: '#recursos' }, { label: 'Preços', url: '#planos' }],
        col3_title: 'Contato',
        col3_contact: 'suporte@vaivistoriar.com.br'
    });

    const [heroText, setHeroText] = useState({
        title: 'Vistorias Imobiliárias',
        highlight: 'Inteligentes e Rápidas',
        description: 'A plataforma completa para corretores e imobiliárias que buscam profissionalismo e segurança jurídica.'
    });

    const [activeFeatureIdx, setActiveFeatureIdx] = useState<number | null>(null);
    const footerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const { data, error } = await supabase.from('system_configs').select('*');
            if (error) throw error;

            const find = (key: string) => data.find(c => c.key === key)?.value;

            const savedHeader = find('home_header_json');
            if (savedHeader) setHeader(JSON.parse(savedHeader));

            const savedLogo = find('home_logo_url');
            if (savedLogo) setLogoUrl(savedLogo);

            const savedPrimary = find('home_primary_color');
            if (savedPrimary) setPrimaryColor(savedPrimary);

            const savedSecondary = find('home_secondary_color');
            if (savedSecondary) setSecondaryColor(savedSecondary);

            const savedFeatures = find('home_features_json');
            if (savedFeatures) setFeatures(JSON.parse(savedFeatures));

            const savedSteps = find('home_steps_json');
            if (savedSteps) setSteps(JSON.parse(savedSteps));

            const savedFaqs = find('home_faqs_json');
            if (savedFaqs) setFaqs(JSON.parse(savedFaqs));

            const savedFooter = find('home_footer_json');
            if (savedFooter) setFooter(JSON.parse(savedFooter));

            const savedHero = find('home_hero_text_json');
            if (savedHero) setHeroText(JSON.parse(savedHero));

        } catch (err) {
            console.error('Erro ao carregar configurações:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'home_header_json', value: JSON.stringify(header) },
                { key: 'home_logo_url', value: logoUrl },
                { key: 'home_primary_color', value: primaryColor },
                { key: 'home_secondary_color', value: secondaryColor },
                { key: 'home_features_json', value: JSON.stringify(features) },
                { key: 'home_steps_json', value: JSON.stringify(steps) },
                { key: 'home_faqs_json', value: JSON.stringify(faqs) },
                { key: 'home_footer_json', value: JSON.stringify(footer) },
                { key: 'home_hero_text_json', value: JSON.stringify(heroText) }
            ];

            for (const up of updates) {
                await supabase.from('system_configs').upsert({
                    key: up.key,
                    value: up.value,
                    updated_at: new Date().toISOString()
                });
            }

            alert('Configurações publicadas com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpload = async (file: File, path: string, type: 'logo' | 'feature') => {
        setUploading(type);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `landing/${path}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

            if (type === 'logo') setLogoUrl(publicUrl);
        } catch (err) {
            alert('Erro no upload.');
        } finally {
            setUploading(null);
        }
    };

    const updateFeature = (idx: number, field: keyof Feature, val: any) => {
        const newF = [...features];
        (newF[idx] as any)[field] = val;
        setFeatures(newF);
    };

    const removeFeature = (idx: number) => {
        setFeatures(features.filter((_, i) => i !== idx));
        setActiveFeatureIdx(null);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f1f5f9] p-8">
            <div className="max-w-[1600px] mx-auto grid lg:grid-cols-12 gap-10">

                {/* EDIT COL */}
                <div className="lg:col-span-7 space-y-10">
                    <header className="flex items-center justify-between bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <span className="material-symbols-outlined text-3xl">auto_fix_high</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Design & Landing</h1>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Personalização Visual Premium</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-3 disabled:opacity-50"
                        >
                            {saving ? 'Publicando...' : (
                                <>
                                    <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                    Publicar Agora
                                </>
                            )}
                        </button>
                    </header>

                    {/* ESTILO GLOBAL */}
                    <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-[28px]">palette</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Identidade Visual</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cores do Sistema</label>
                                <div className="grid grid-cols-2 gap-4" key="system-colors">
                                    <div className="space-y-2" key="primary-color">
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded-lg overflow-hidden border-0 p-0 cursor-pointer" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Primária</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2" key="secondary-color">
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded-lg overflow-hidden border-0 p-0 cursor-pointer" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Fundo Sec.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Upload da Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                                        {logoUrl ? <img src={logoUrl} className="h-full w-full object-contain p-4" /> : <span className="material-symbols-outlined text-slate-300">image</span>}
                                        {uploading === 'logo' && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full" /></div>}
                                    </div>
                                    <button onClick={() => footerInputRef.current?.click()} className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                        Trocar Logo
                                    </button>
                                    <input type="file" ref={footerInputRef} className="hidden" accept="image/*" onChange={e => e.target.files && handleUpload(e.target.files[0], 'site-logo', 'logo')} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* TEXTO HERO */}
                    <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-[28px]">title</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Texto de Apresentação</h3>
                        </div>
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Título Principal</label>
                                    <input type="text" value={heroText.title} onChange={e => setHeroText({ ...heroText, title: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Texto em Destaque (Cor Principal)</label>
                                    <input type="text" value={heroText.highlight} onChange={e => setHeroText({ ...heroText, highlight: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black" style={{ color: primaryColor }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Descrição</label>
                                <textarea rows={3} value={heroText.description} onChange={e => setHeroText({ ...heroText, description: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium leading-relaxed" />
                            </div>
                        </div>
                    </section>

                    {/* RECURSOS PODEROSOS */}
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
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Rodapé Modular</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure as informações exibidas no rodapé da landing page</p>
                            </div>
                        </div>
                        <div className="grid gap-10">
                            {/* Coluna 1 - Sobre */}
                            <div className="p-8 bg-gradient-to-br from-slate-50 to-white rounded-[32px] border border-slate-100 space-y-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[18px]">info</span>
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Coluna 1: Sobre a Empresa</h4>
                                        <p className="text-[9px] text-slate-400 font-medium">Texto descritivo exibido ao lado do logo</p>
                                    </div>
                                </div>
                                <textarea
                                    rows={2}
                                    value={footer.col1_text}
                                    onChange={e => setFooter({ ...footer, col1_text: e.target.value })}
                                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    placeholder="Descreva brevemente sua empresa..."
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-10">
                                {/* Coluna 2 - Links de Navegação */}
                                <div className="p-8 bg-gradient-to-br from-blue-50 to-white rounded-[32px] border border-blue-100 space-y-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[18px]">link</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Coluna 2: Navegação</h4>
                                            <p className="text-[9px] text-slate-400 font-medium">Links rápidos para seções da página</p>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={footer.col2_title}
                                        onChange={e => setFooter({ ...footer, col2_title: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-white border border-blue-200 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        placeholder="Título da seção"
                                    />
                                    <div className="space-y-3">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Links (use # para âncoras)</p>
                                        {footer.col2_links.map((link, lidx) => (
                                            <div key={lidx} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={link.label}
                                                    onChange={e => {
                                                        const l = [...footer.col2_links];
                                                        l[lidx].label = e.target.value;
                                                        setFooter({ ...footer, col2_links: l });
                                                    }}
                                                    placeholder="Nome do link"
                                                    className="flex-1 px-4 py-2.5 bg-white rounded-xl text-xs font-bold border border-blue-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                />
                                                <input
                                                    type="text"
                                                    value={link.url}
                                                    onChange={e => {
                                                        const l = [...footer.col2_links];
                                                        l[lidx].url = e.target.value;
                                                        setFooter({ ...footer, col2_links: l });
                                                    }}
                                                    placeholder="#secao ou /pagina"
                                                    className="w-32 px-4 py-2.5 bg-white rounded-xl text-xs font-mono border border-blue-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Coluna 3 - Contato */}
                                <div className="p-8 bg-gradient-to-br from-emerald-50 to-white rounded-[32px] border border-emerald-100 space-y-6 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[18px]">contact_mail</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Coluna 3: Contato</h4>
                                            <p className="text-[9px] text-slate-400 font-medium">Informações de contato da empresa</p>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={footer.col3_title}
                                        onChange={e => setFooter({ ...footer, col3_title: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-white border border-emerald-200 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        placeholder="Título da seção"
                                    />
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mb-2">Email ou Telefone</label>
                                            <input
                                                type="text"
                                                value={footer.col3_contact}
                                                onChange={e => setFooter({ ...footer, col3_contact: e.target.value })}
                                                className="w-full px-5 py-3.5 bg-white border border-emerald-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                                placeholder="contato@empresa.com.br"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dica de uso */}
                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-[24px] flex items-start gap-4">
                                <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">lightbulb</span>
                                <div className="flex-1">
                                    <h5 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Dica de Configuração</h5>
                                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                                        Use <code className="px-2 py-0.5 bg-amber-100 rounded text-amber-900 font-bold">#funcionalidades</code>, <code className="px-2 py-0.5 bg-amber-100 rounded text-amber-900 font-bold">#como-funciona</code>, <code className="px-2 py-0.5 bg-amber-100 rounded text-amber-900 font-bold">#depoimentos</code> ou <code className="px-2 py-0.5 bg-amber-100 rounded text-amber-900 font-bold">#planos</code> nos links para navegação suave entre seções.
                                    </p>
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
                                    VaiVistoriar.com.br
                                </div>
                            </div>
                            <div className="bg-white h-[850px] overflow-y-auto custom-scrollbar scroll-smooth">
                                {/* Simulação Visual */}
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                    {logoUrl ? <img src={logoUrl} style={{ height: '20px' }} className="w-auto" /> : <span className="font-black text-xs" style={{ color: primaryColor }}>VaiVistoriar</span>}
                                    <div className="flex gap-2">
                                        <div className="w-6 h-1 bg-slate-100" />
                                        <div className="w-6 h-1 bg-slate-100" />
                                    </div>
                                </div>
                                <div className="h-64 bg-slate-900 flex flex-col items-center justify-center p-8 text-center gap-4">
                                    <h1 className="text-2xl font-black text-white">{heroText.title} <span style={{ color: primaryColor }}>{heroText.highlight}</span></h1>
                                    <p className="text-[10px] text-slate-400 px-4">{heroText.description}</p>
                                </div>
                                <div className="p-10 space-y-6" style={{ backgroundColor: secondaryColor }}>
                                    <h2 className="text-center font-black text-slate-900 text-sm uppercase tracking-widest">Funcionalidades</h2>
                                    <div className="grid gap-4">
                                        {features.slice(0, 3).map((f) => (
                                            <div key={f.id} className="bg-white p-4 rounded-3xl shadow-sm flex items-center gap-4 border border-slate-50">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center" style={{ color: primaryColor, backgroundColor: primaryColor + '10' }}>
                                                    <span className="material-symbols-outlined text-lg">{f.icon}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{f.title}</h4>
                                                    <p className="text-[9px] text-slate-400 line-clamp-1">{f.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-slate-900 p-10 text-white space-y-10">
                                    {logoUrl ? <img src={logoUrl} className="h-4 brightness-0 invert" /> : <span className="font-black">VaiVistoriar</span>}
                                    <p className="text-[9px] text-slate-500 font-bold">{footer.col1_text}</p>
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
