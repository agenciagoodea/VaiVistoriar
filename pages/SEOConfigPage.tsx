
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SEOConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [configs, setConfigs] = useState({
        seo_title: 'VistoriaPro - Laudos de Vistoria Online',
        seo_description: 'Plataforma completa para gestão de vistorias imobiliárias com segurança jurídica e facilidade.',
        seo_keywords: 'vistoria imobiliaria, laudo de vistorias, corretor de imoveis, imobiliaria',
        seo_og_image: '',
        seo_favicon_url: '',
        seo_instagram: '',
        seo_facebook: ''
    });

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('system_configs').select('*');
            if (error) throw error;

            if (data) {
                const newConfigs = { ...configs };
                data.forEach(c => {
                    if (Object.keys(configs).includes(c.key)) {
                        // @ts-ignore
                        newConfigs[c.key] = c.value;
                    }
                });
                setConfigs(newConfigs);
            }
        } catch (err) {
            console.error('Erro ao buscar SEO:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const upserts = Object.entries(configs).map(([key, value]) => ({
                key,
                value,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('system_configs').upsert(upserts);
            if (error) throw error;

            setMessage({ text: 'Configurações de SEO salvas com sucesso!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (err: any) {
            setMessage({ text: err.message || 'Erro ao salvar configurações.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${key}_${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `seo/${fileName}`;

            // Bucket 'avatars' é o que está configurado e funcionando no sistema
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setConfigs(prev => ({ ...prev, [key]: publicUrl }));
            setMessage({ text: 'Upload concluído! Clique em Salvar para confirmar.', type: 'success' });
        } catch (err: any) {
            setMessage({ text: `Erro no upload: ${err.message}`, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400">Carregando painel de SEO...</p>
        </div>
    );

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">SEO & Indexação</h1>
                <p className="text-slate-500 mt-1">Configure como o VistoriaPro aparece nos motores de busca (Google, Bing) e redes sociais.</p>
            </div>

            {message.text && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-rose-50 border border-rose-100 text-rose-700'
                    }`}>
                    <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                    <p className="text-xs font-bold">{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <form onSubmit={handleSave} className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meta Title (Título da Aba)</label>
                                <input
                                    type="text"
                                    value={configs.seo_title}
                                    onChange={(e) => setConfigs({ ...configs, seo_title: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300"
                                />
                                <p className="text-[10px] text-slate-400 ml-1 italic">Recomendado: até 60 caracteres.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meta Description</label>
                                <textarea
                                    value={configs.seo_description}
                                    rows={4}
                                    onChange={(e) => setConfigs({ ...configs, seo_description: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-300 resize-none"
                                />
                                <p className="text-[10px] text-slate-400 ml-1 italic">Recomendado: entre 120 e 160 caracteres.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Palavras-Chave (Keywords)</label>
                                <input
                                    type="text"
                                    value={configs.seo_keywords}
                                    onChange={(e) => setConfigs({ ...configs, seo_keywords: e.target.value })}
                                    placeholder="vistoria, imobiliária, laudos..."
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Imagens e Identidade</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* OG IMAGE UPLOAD */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">OG Image (Social)</label>
                                        <div className="relative group w-full aspect-[16/9]">
                                            <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-inner flex items-center justify-center relative">
                                                {configs.seo_og_image ? (
                                                    <>
                                                        <img src={configs.seo_og_image} className="w-full h-full object-cover" alt="Preview" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfigs({ ...configs, seo_og_image: '' })}
                                                            className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm text-rose-500 rounded-xl shadow-lg flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all z-10"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">close</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center text-slate-300">
                                                        <span className="material-symbols-outlined text-4xl">image</span>
                                                        <span className="text-[10px] font-black uppercase tracking-tight mt-1">1200x630px</span>
                                                    </div>
                                                )}
                                                {saving && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" /></div>}
                                            </div>
                                            <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-30">
                                                <span className="material-symbols-outlined text-xl">add_a_photo</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'seo_og_image')} />
                                            </label>
                                        </div>
                                    </div>

                                    {/* FAVICON UPLOAD */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Favicon (Aba)</label>
                                        <div className="relative group w-full aspect-[16/9]">
                                            <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-inner flex items-center justify-center relative">
                                                {configs.seo_favicon_url ? (
                                                    <>
                                                        <div className="w-16 h-16 p-2 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                                                            <img src={configs.seo_favicon_url} className="max-w-full max-h-full object-contain" alt="Favicon" />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfigs({ ...configs, seo_favicon_url: '' })}
                                                            className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm text-rose-500 rounded-xl shadow-lg flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all z-10"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">close</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center text-slate-300">
                                                        <span className="material-symbols-outlined text-4xl">tab</span>
                                                        <span className="text-[10px] font-black uppercase tracking-tight mt-1">32x32px</span>
                                                    </div>
                                                )}
                                                {saving && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-20"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" /></div>}
                                            </div>
                                            <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-30">
                                                <span className="material-symbols-outlined text-xl">add_a_photo</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'seo_favicon_url')} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Redes Sociais</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instagram</label>
                                        <input
                                            type="text"
                                            value={configs.seo_instagram}
                                            onChange={(e) => setConfigs({ ...configs, seo_instagram: e.target.value })}
                                            placeholder="https://instagram.com/seuusuario"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Facebook</label>
                                        <input
                                            type="text"
                                            value={configs.seo_facebook}
                                            onChange={(e) => setConfigs({ ...configs, seo_facebook: e.target.value })}
                                            placeholder="https://facebook.com/suapagina"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Salvar Alterações de SEO
                                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">save</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[32px] border border-slate-100 p-8 space-y-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview no Google</h3>
                        <div className="space-y-2 group cursor-default">
                            <p className="text-[#1a0dab] text-xl font-medium group-hover:underline truncate">{configs.seo_title}</p>
                            <p className="text-[#006621] text-sm truncate">https://www.vaivistoriar.com.br</p>
                            <p className="text-[#545454] text-sm leading-relaxed line-clamp-2">
                                {configs.seo_description || 'Insira uma descrição para ver como seu site aparecerá nos resultados de busca do Google.'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-400">info</span>
                        </div>
                        <h4 className="font-black text-lg">Por que o SEO importa?</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Um SEO bem configurado ajuda sua plataforma a aparecer nos primeiros resultados do Google, trazendo mais autoridade e clientes orgânicos para seu negócio.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SEOConfigPage;
