
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const GlobalSettingsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingWhite, setUploadingWhite] = useState(false);
    const [brand, setBrand] = useState({
        primaryColor: '#4f46e5',
        secondaryColor: '#f8fafc',
        logoUrl: '',
        logoHeight: 40,
        logoWhiteUrl: '',
        logoWhiteHeight: 40,
        logoPosition: 'left' as 'left' | 'center',
        headerOpacity: 100,
        fontFamily: 'Inter',
        whatsappNumber: '',
        whatsappMessage: 'Olá, gostaria de saber mais sobre o VaiVistoriar.',
        whatsappCommercial: '',
        whatsappCommercialMessage: 'Olá! Gostaria de contratar o VaiVistoriar para minha imobiliária.',
        loginLabel: 'Entrar',
        loginLink: '/login',
        ctaLabel: 'Começar Agora',
        ctaLink: '/register',
        footerText: 'Simplificando vistorias imobiliárias com tecnologia e agilidade.',
        footerLinks: [
            { label: 'Funcionalidades', url: '#funcionalidades' },
            { label: 'Planos', url: '#planos' }
        ],
        copyrightText: '© 2026 VaiVistoriar - Todos os direitos reservados',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        socialInstagram: '',
        socialFacebook: '',
        socialLinkedin: '',
        socialTwitter: ''
    });

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data: configs } = await supabase.from('system_configs').select('*');
            if (configs) {
                const find = (key: string) => configs.find(c => c.key === key)?.value;
                const h = find('home_header_json') ? JSON.parse(find('home_header_json')) : {};
                const f = find('home_footer_json') ? JSON.parse(find('home_footer_json')) : {};

                const socials = f.socials || [];
                setBrand({
                    primaryColor: find('home_primary_color') || '#4f46e5',
                    secondaryColor: find('home_secondary_color') || '#f8fafc',
                    logoUrl: find('home_logo_url') || '',
                    logoHeight: h.logoHeight || 40,
                    logoWhiteUrl: find('home_logo_white_url') || '',
                    logoWhiteHeight: f.logoHeight || 40,
                    logoPosition: h.logoPosition || 'left',
                    headerOpacity: h.opacity || 100,
                    fontFamily: h.fontFamily || 'Inter',
                    whatsappNumber: find('whatsapp_number') || '',
                    whatsappMessage: find('whatsapp_message') || 'Olá, gostaria de saber mais sobre o VaiVistoriar.',
                    whatsappCommercial: find('whatsapp_commercial') || '',
                    whatsappCommercialMessage: find('whatsapp_commercial_message') || 'Olá! Gostaria de contratar o VaiVistoriar para minha imobiliária.',
                    loginLabel: h.loginLabel || 'Entrar',
                    loginLink: h.loginLink || '/login',
                    ctaLabel: h.ctaText || 'Começar Agora',
                    ctaLink: h.ctaLink || '/register',
                    footerText: f.col1_text || '',
                    footerLinks: f.col2_links || [],
                    copyrightText: f.copyright || '© 2026 VaiVistoriar - Todos os direitos reservados',
                    companyAddress: f.address || '',
                    companyPhone: f.phone || '',
                    companyEmail: f.email || '',
                    socialInstagram: socials.find((s: any) => s.platform === 'instagram')?.url || '',
                    socialFacebook: socials.find((s: any) => s.platform === 'facebook')?.url || '',
                    socialLinkedin: socials.find((s: any) => s.platform === 'linkedin')?.url || '',
                    socialTwitter: socials.find((s: any) => s.platform === 'twitter')?.url || ''
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isWhite = false) => {
        const file = e.target.files?.[0];
        if (!file) return;
        isWhite ? setUploadingWhite(true) : setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `settings/logo-${isWhite ? 'white-' : ''}${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setBrand(prev => ({ ...prev, [isWhite ? 'logoWhiteUrl' : 'logoUrl']: publicUrl }));
        } catch (err) {
            alert('Erro no upload.');
        } finally {
            isWhite ? setUploadingWhite(false) : setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const headerJson = {
                logoHeight: brand.logoHeight,
                logoPosition: brand.logoPosition,
                opacity: brand.headerOpacity,
                fontFamily: brand.fontFamily,
                loginLabel: brand.loginLabel,
                loginLink: brand.loginLink,
                ctaText: brand.ctaLabel,
                ctaLink: brand.ctaLink,
                isSticky: true,
                showMenu: true,
                showLogin: true,
                showCTA: true,
                bgColor: '#ffffff',
                textColor: '#64748b'
            };

            const socials = [];
            if (brand.socialInstagram) socials.push({ platform: 'instagram', url: brand.socialInstagram });
            if (brand.socialFacebook) socials.push({ platform: 'facebook', url: brand.socialFacebook });
            if (brand.socialLinkedin) socials.push({ platform: 'linkedin', url: brand.socialLinkedin });
            if (brand.socialTwitter) socials.push({ platform: 'twitter', url: brand.socialTwitter });

            const footerJson = {
                col1_text: brand.footerText,
                col2_title: 'Plataforma',
                col2_links: brand.footerLinks,
                col3_title: 'Contato',
                col3_contact: 'suporte@vaivistoriar.com.br',
                copyright: brand.copyrightText,
                address: brand.companyAddress,
                phone: brand.companyPhone,
                email: brand.companyEmail,
                logoHeight: brand.logoWhiteHeight,
                socials: socials
            };

            const updates = [
                { key: 'home_primary_color', value: brand.primaryColor },
                { key: 'home_secondary_color', value: brand.secondaryColor },
                { key: 'home_logo_url', value: brand.logoUrl },
                { key: 'home_logo_white_url', value: brand.logoWhiteUrl },
                { key: 'whatsapp_number', value: brand.whatsappNumber },
                { key: 'whatsapp_message', value: brand.whatsappMessage },
                { key: 'whatsapp_commercial', value: brand.whatsappCommercial },
                { key: 'whatsapp_commercial_message', value: brand.whatsappCommercialMessage },
                { key: 'home_header_json', value: JSON.stringify(headerJson) },
                { key: 'home_footer_json', value: JSON.stringify(footerJson) }
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
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">1. Configurações Globais</h1>
                    <p className="text-slate-500 mt-1">Design do Sistema, Cabeçalho e Rodapé</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="px-10 py-4 bg-indigo-600 hover:bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50">
                    {saving ? 'GRAVANDO...' : 'SALVAR ALTERAÇÕES'}
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* IDENTIDADE VISUAL */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-8">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-4">Identidade & Cores</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Logo Principal (Header)</label>
                            <div className="w-full h-28 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                                {brand.logoUrl ? <img src={brand.logoUrl} className="max-w-[80%] max-h-[80%] object-contain" /> : <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>}
                                <label className="absolute inset-0 bg-indigo-600/80 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer text-white">
                                    <span className="material-symbols-outlined">{uploading ? 'sync' : 'upload'}</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, false)} />
                                </label>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Altura (px)</label>
                                    <input type="number" value={brand.logoHeight} onChange={e => setBrand({ ...brand, logoHeight: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold mt-1" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Posição</label>
                                    <select value={brand.logoPosition} onChange={e => setBrand({ ...brand, logoPosition: e.target.value as any })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none cursor-pointer mt-1">
                                        <option value="left">Esquerda</option>
                                        <option value="center">Centralizado</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">Cor Primária</label>
                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <input type="color" value={brand.primaryColor} onChange={e => setBrand({ ...brand, primaryColor: e.target.value })} className="w-10 h-10 rounded-full cursor-pointer border-none bg-transparent" />
                                    <span className="text-xs font-black font-mono text-slate-400 uppercase">{brand.primaryColor}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400">Fonte Global</label>
                                <select value={brand.fontFamily} onChange={e => setBrand({ ...brand, fontFamily: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none">
                                    <option value="Inter">Inter (Padrão)</option>
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Outfit">Outfit</option>
                                    <option value="Roboto">Roboto</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* HEADER DESIGN */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-8">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b pb-4">Cabeçalho (Header)</h3>
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black uppercase text-slate-400">Opacidade do Fundo</label>
                                <span className="text-xs font-black text-indigo-600">{brand.headerOpacity}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={brand.headerOpacity} onChange={e => setBrand({ ...brand, headerOpacity: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-slate-400">Botão Login</label>
                                <input type="text" value={brand.loginLabel} onChange={e => setBrand({ ...brand, loginLabel: e.target.value })} placeholder="Label" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" />
                                <input type="text" value={brand.loginLink} onChange={e => setBrand({ ...brand, loginLink: e.target.value })} placeholder="Link (/login)" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-slate-400">Botão CTA (Destaque)</label>
                                <input type="text" value={brand.ctaLabel} onChange={e => setBrand({ ...brand, ctaLabel: e.target.value })} placeholder="Label" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" />
                                <input type="text" value={brand.ctaLink} onChange={e => setBrand({ ...brand, ctaLink: e.target.value })} placeholder="Link (/register)" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER DESIGN - EXPANDIDO */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-8 lg:col-span-2">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Design do Rodapé (Footer)</h3>
                        <button onClick={() => setBrand({ ...brand, footerLinks: [...brand.footerLinks, { label: 'Novo Link', url: '#' }] })} className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">+ Adicionar Link</button>
                    </div>

                    {/* Logo Branca do Footer */}
                    <div className="space-y-4 pb-6 border-b border-slate-100">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Logo Branca (para fundo escuro)</label>
                        <div className="flex gap-6 items-end">
                            <div className="flex-1">
                                <div className="w-full h-28 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center relative overflow-hidden group">
                                    {brand.logoWhiteUrl ? <img src={brand.logoWhiteUrl} className="max-w-[80%] max-h-[80%] object-contain" /> : <span className="material-symbols-outlined text-slate-600 text-3xl">image</span>}
                                    <label className="absolute inset-0 bg-white/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer text-white">
                                        <span className="material-symbols-outlined">{uploadingWhite ? 'sync' : 'upload'}</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, true)} />
                                    </label>
                                </div>
                            </div>
                            <div className="w-40">
                                <label className="text-[10px] font-black uppercase text-slate-400">Altura (px)</label>
                                <input type="number" value={brand.logoWhiteHeight} onChange={e => setBrand({ ...brand, logoWhiteHeight: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold mt-1" />
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Texto Institucional</label>
                            <textarea rows={3} value={brand.footerText} onChange={e => setBrand({ ...brand, footerText: e.target.value })} className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-[24px] text-xs font-medium resize-none shadow-sm focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Links da Plataforma</label>
                            <div className="grid gap-3 max-h-[140px] overflow-y-auto pr-2 scrollbar-thin">
                                {brand.footerLinks.map((link, idx) => (
                                    <div key={idx} className="flex gap-2 p-2 bg-slate-50 border border-slate-100 rounded-2xl group relative animate-in slide-in-from-right-4">
                                        <input type="text" value={link.label} onChange={e => {
                                            const newL = [...brand.footerLinks];
                                            newL[idx].label = e.target.value;
                                            setBrand({ ...brand, footerLinks: newL });
                                        }} placeholder="Label" className="flex-1 bg-white px-4 py-2 rounded-xl text-[10px] font-black border-none" />
                                        <input type="text" value={link.url} onChange={e => {
                                            const newL = [...brand.footerLinks];
                                            newL[idx].url = e.target.value;
                                            setBrand({ ...brand, footerLinks: newL });
                                        }} placeholder="URL/Âncora" className="flex-1 bg-white px-4 py-2 rounded-xl text-[10px] border-none" />
                                        <button onClick={() => setBrand({ ...brand, footerLinks: brand.footerLinks.filter((_, i) => i !== idx) })} className="absolute -right-2 -top-2 w-6 h-6 bg-white border border-slate-100 shadow-sm rounded-full text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Informações de Contato</label>
                            <input type="text" value={brand.companyAddress} onChange={e => setBrand({ ...brand, companyAddress: e.target.value })} placeholder="Endereço (opcional)" className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium" />
                            <input type="tel" value={brand.companyPhone} onChange={e => setBrand({ ...brand, companyPhone: e.target.value })} placeholder="Telefone: (11) 99999-9999" className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium" />
                            <input type="email" value={brand.companyEmail} onChange={e => setBrand({ ...brand, companyEmail: e.target.value })} placeholder="Email: contato@empresa.com" className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Copyright</label>
                            <input type="text" value={brand.copyrightText} onChange={e => setBrand({ ...brand, copyrightText: e.target.value })} className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium" />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">WhatsApp Comercial</label>
                            <input type="tel" value={brand.whatsappCommercial} onChange={e => setBrand({ ...brand, whatsappCommercial: e.target.value })} placeholder="5511999999999" className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium" />
                            <textarea rows={2} value={brand.whatsappCommercialMessage} onChange={e => setBrand({ ...brand, whatsappCommercialMessage: e.target.value })} placeholder="Mensagem padrão do WhatsApp comercial" className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium resize-none" />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Redes Sociais</label>
                            <input type="text" value={brand.socialInstagram} onChange={e => setBrand({ ...brand, socialInstagram: e.target.value })} placeholder="Instagram URL" className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium" />
                            <input type="text" value={brand.socialFacebook} onChange={e => setBrand({ ...brand, socialFacebook: e.target.value })} placeholder="Facebook URL" className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium" />
                            <input type="text" value={brand.socialLinkedin} onChange={e => setBrand({ ...brand, socialLinkedin: e.target.value })} placeholder="LinkedIn URL" className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium" />
                            <input type="text" value={brand.socialTwitter} onChange={e => setBrand({ ...brand, socialTwitter: e.target.value })} placeholder="Twitter URL" className="w-full px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSettingsPage;
