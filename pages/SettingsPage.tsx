
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { validateCPF, validateCNPJ, formatCpfCnpj } from '../lib/utils';
import ReviewList from '../components/ReviewList';

interface HeroSlider {
   id: string;
   image: string;
   title: string;
   subtitle: string;
   badge: string;
}

interface Step {
   id: string;
   title: string;
   desc: string;
   icon: string;
}

interface Feature {
   id: string;
   icon: string;
   title: string;
   desc: string;
}

interface LGPDConsent {
   id: string;
   accepted_at: string;
   user_id: string;
   session_id: string;
}

const ICON_BASE = [
   'rocket_launch', 'verified_user', 'bolt', 'auto_fix_high', 'analytics', 'devices',
   'security', 'cloud_done', 'speed', 'workspace_premium', 'psychology', 'group_add',
   'view_carousel', 'timeline', 'lightbulb', 'layers', 'view_agenda', 'person', 'check_circle'
];

const SettingsPage: React.FC = () => {
   const [tips, setTips] = useState<string[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [uploading, setUploading] = useState<string | null>(null);

   // Global Branding & Visuals (#globais)
   const [brand, setBrand] = useState({
      primaryColor: '#4f46e5',
      secondaryColor: '#f8fafc',
      logoUrl: '',
      logoHeight: 40,
      whatsappNumber: '',
      whatsappMessage: 'Olá, gostaria de saber mais sobre o VaiVistoriar.',
      footerText: 'Simplificando vistorias imobiliárias com tecnologia e agilidade.'
   });

   // Global Features (#recursos)
   const [heroText, setHeroText] = useState({
      title: 'Vistorias Imobiliárias',
      highlight: 'Inteligentes e Rápidas',
      description: 'A plataforma completa para corretores e imobiliárias.'
   });
   const [features, setFeatures] = useState<Feature[]>([]);

   // Landing Page Config State (#slides, #passos)
   const [sliders, setSliders] = useState<HeroSlider[]>([]);
   const [steps, setSteps] = useState<Step[]>([]);

   // Policies & LGPD (#politicas)
   const [policies, setPolicies] = useState({
      terms: '',
      privacy: '',
      cookieBanner: ''
   });
   const [lgpdLogs, setLgpdLogs] = useState<LGPDConsent[]>([]);

   // Profile State (#perfil)
   const [profile, setProfile] = useState({
      full_name: '',
      email: '',
      cpf_cnpj: '',
      creci: '',
      phone: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      company_name: '',
      avatar_url: ''
   });

   useEffect(() => {
      fetchData();
   }, []);

   const fetchData = async () => {
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         // Fetch Profile
         const { data: profileData } = await supabase
            .from('broker_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

         // Fetch Landing Page Configs
         const { data: systemConfigs } = await supabase
            .from('system_configs')
            .select('*');

         if (systemConfigs) {
            const find = (key: string) => systemConfigs.find(c => c.key === key)?.value;

            // Globais
            setBrand({
               primaryColor: find('home_primary_color') || '#4f46e5',
               secondaryColor: find('home_secondary_color') || '#f8fafc',
               logoUrl: find('home_logo_url') || '',
               logoHeight: parseInt(find('home_logo_height') || '40'),
               whatsappNumber: find('whatsapp_number') || '',
               whatsappMessage: find('whatsapp_message') || 'Olá, gostaria de saber mais sobre o VaiVistoriar.',
               footerText: find('home_footer_json') ? JSON.parse(find('home_footer_json')).col1_text : ''
            });

            // Recursos
            const savedHero = find('home_hero_text_json');
            if (savedHero) setHeroText(JSON.parse(savedHero));

            const savedFeatures = find('home_features_json');
            if (savedFeatures) setFeatures(JSON.parse(savedFeatures));

            // Landing
            const savedSliders = find('home_sliders_json');
            if (savedSliders) setSliders(JSON.parse(savedSliders));

            const savedSteps = find('home_steps_json');
            if (savedSteps) setSteps(JSON.parse(savedSteps));

            const savedTips = find('inspection_tips');
            if (savedTips) setTips(typeof savedTips === 'string' ? JSON.parse(savedTips) : savedTips);

            // Políticas
            setPolicies({
               terms: find('terms_content') || '',
               privacy: find('privacy_content') || '',
               cookieBanner: find('cookie_consent_text') || ''
            });
         }

         // Fetch LGPD Logs
         const { data: consentData } = await supabase
            .from('cookie_consents')
            .select('*')
            .order('accepted_at', { ascending: false })
            .limit(20);
         if (consentData) setLgpdLogs(consentData);

         if (profileData) {
            setProfile({
               full_name: profileData.full_name || '',
               email: profileData.email || '',
               cpf_cnpj: profileData.cpf_cnpj || '',
               creci: profileData.creci || '',
               phone: profileData.phone || '',
               cep: profileData.cep || '',
               street: profileData.street || '',
               number: profileData.number || '',
               complement: profileData.complement || '',
               district: profileData.district || '',
               city: profileData.city || '',
               state: profileData.state || '',
               company_name: profileData.company_name || '',
               avatar_url: profileData.avatar_url || ''
            });
         }
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
   };

   const handleCEPBlur = async () => {
      const cep = profile.cep.replace(/\D/g, '');
      if (cep.length !== 8) return;
      try {
         const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
         const data = await response.json();
         if (!data.erro) {
            setProfile(prev => ({ ...prev, street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf }));
         }
      } catch (err) {
         console.error('Erro ao buscar CEP:', err);
      }
   };

   useEffect(() => {
      if (location.hash) {
         const id = location.hash.replace('#', '');
         const element = document.getElementById(id);
         if (element) {
            setTimeout(() => { element.scrollIntoView({ behavior: 'smooth' }); }, 100);
         }
      }
   }, [location.hash]);

   const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'slider' | 'logo', id?: string) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const targetId = id || (type === 'logo' ? 'logo' : 'profile');
      setUploading(targetId);
      try {
         const fileExt = file.name.split('.').pop();
         const filePath = `settings/${targetId}-${Date.now()}.${fileExt}`;
         const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
         if (uploadError) throw uploadError;
         const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
         if (type === 'avatar') setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
         if (type === 'logo') setBrand(prev => ({ ...prev, logoUrl: publicUrl }));
         if (type === 'slider' && id) {
            setSliders(prev => prev.map(s => s.id === id ? { ...s, image: publicUrl } : s));
         }
      } catch (err) {
         console.error(err);
         alert('Erro no upload.');
      } finally {
         setUploading(null);
      }
   };

   const updateFeature = (idx: number, field: keyof Feature, val: string) => {
      const newF = [...features];
      (newF[idx] as any)[field] = val;
      setFeatures(newF);
   };
   const removeFeature = (idx: number) => setFeatures(features.filter((_, i) => i !== idx));
   const addFeature = () => setFeatures([...features, { id: Date.now().toString(), icon: 'stars', title: 'Novo Recurso', desc: 'Descrição' }]);
   const updateTip = (index: number, val: string) => {
      const newTips = [...tips];
      newTips[index] = val;
      setTips(newTips);
   };

   const handleSaveAll = async () => {
      setSaving(true);
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) throw new Error('Usuário não autenticado.');

         const cleanDoc = profile.cpf_cnpj.replace(/\D/g, '');
         if (cleanDoc && cleanDoc.length > 0) {
            if (cleanDoc.length === 11 && !validateCPF(cleanDoc)) throw new Error('CPF Inválido');
            if (cleanDoc.length === 14 && !validateCNPJ(cleanDoc)) throw new Error('CNPJ Inválido');
         }

         const { error: profileError } = await supabase.from('broker_profiles').upsert({
            user_id: user.id, full_name: profile.full_name, cpf_cnpj: cleanDoc, creci: profile.creci, phone: profile.phone,
            cep: profile.cep, street: profile.street, number: profile.number, complement: profile.complement,
            district: profile.district, city: profile.city, state: profile.state, company_name: profile.company_name,
            avatar_url: profile.avatar_url, updated_at: new Date().toISOString()
         }, { onConflict: 'user_id' });
         if (profileError) throw profileError;

         const configUpdates = [
            { key: 'home_primary_color', value: brand.primaryColor },
            { key: 'home_secondary_color', value: brand.secondaryColor },
            { key: 'home_logo_url', value: brand.logoUrl },
            { key: 'home_logo_height', value: brand.logoHeight.toString() },
            { key: 'whatsapp_number', value: brand.whatsappNumber },
            { key: 'whatsapp_message', value: brand.whatsappMessage },
            { key: 'home_hero_text_json', value: JSON.stringify(heroText) },
            { key: 'home_features_json', value: JSON.stringify(features) },
            { key: 'home_sliders_json', value: JSON.stringify(sliders) },
            { key: 'home_steps_json', value: JSON.stringify(steps) },
            { key: 'inspection_tips', value: JSON.stringify(tips) },
            { key: 'terms_content', value: policies.terms },
            { key: 'privacy_content', value: policies.privacy },
            { key: 'cookie_consent_text', value: policies.cookieBanner },
            {
               key: 'home_footer_json', value: JSON.stringify({
                  col1_text: brand.footerText, col2_title: 'Plataforma',
                  col2_links: [{ label: 'Funcionalidades', url: '#recursos' }, { label: 'Preços', url: '#planos' }],
                  col3_title: 'Contato', col3_contact: 'suporte@vaivistoriar.com.br'
               })
            }
         ];

         for (const up of configUpdates) {
            await supabase.from('system_configs').upsert({ key: up.key, value: up.value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
         }
         alert('Configurações salvas!');
      } catch (err: any) {
         alert(`Erro: ${err.message}`);
      } finally {
         setSaving(false);
      }
   };

   const handleRequestEvaluation = async () => {
      try {
         const ts = new Date().toISOString();
         await supabase.from('system_configs').upsert({ key: 'review_request_timestamp', value: ts, updated_at: ts }, { onConflict: 'key' });
         alert('Solicitação enviada!');
      } catch (err) {
         alert('Erro ao enviar solicitação.');
      }
   };

   if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-[0.2em]">Carregando...</div>;

   return (
      <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight text-indigo-600">Configurações</h1>
               <p className="text-slate-500 mt-1">Gerencie seu perfil e toda a plataforma.</p>
            </div>
            <button onClick={handleSaveAll} disabled={saving} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50">
               {saving ? 'Gravando...' : 'Salvar Tudo'}
            </button>
         </div>

         <div className="grid gap-12">
            {/* 1. GLOBALS */}
            <div id="globais" className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
               <div className="flex items-center gap-4 text-slate-800">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                     <span className="material-symbols-outlined text-3xl">settings</span>
                  </div>
                  <div>
                     <h2 className="text-xl font-black uppercase tracking-tight">1. Configurações Globais</h2>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Identidade, WhatsApp e Rodapé</p>
                  </div>
               </div>
               <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Logo</label>
                        <div className="flex items-center gap-6">
                           <div className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group">
                              {brand.logoUrl ? <img src={brand.logoUrl} className="max-w-[80%] max-h-[80%] object-contain" /> : <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>}
                              <label className="absolute inset-0 bg-indigo-600/80 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-pointer text-white">
                                 <span className="material-symbols-outlined">upload</span>
                                 <input type="file" className="hidden" accept="image/*" onChange={e => handleAvatarUpload(e, 'logo')} />
                              </label>
                           </div>
                           <div className="flex-1 space-y-4">
                              <label className="text-[10px] font-black uppercase text-slate-400">Altura Logo (px)</label>
                              <input type="number" value={brand.logoHeight} onChange={e => setBrand({ ...brand, logoHeight: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-slate-50 rounded-xl text-sm font-bold border border-slate-100" />
                           </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-slate-400">Pimária</label>
                           <input type="color" value={brand.primaryColor} onChange={e => setBrand({ ...brand, primaryColor: e.target.value })} className="w-full h-10 rounded-xl cursor-pointer" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black uppercase text-slate-400">Secundária</label>
                           <input type="color" value={brand.secondaryColor} onChange={e => setBrand({ ...brand, secondaryColor: e.target.value })} className="w-full h-10 rounded-xl cursor-pointer" />
                        </div>
                     </div>
                  </div>
                  <div className="space-y-6">
                     <div className="space-y-4">
                        <input type="text" placeholder="WhatsApp (55...)" value={brand.whatsappNumber} onChange={e => setBrand({ ...brand, whatsappNumber: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100" />
                        <input type="text" placeholder="Mensagem Inicial" value={brand.whatsappMessage} onChange={e => setBrand({ ...brand, whatsappMessage: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm border border-slate-100" />
                     </div>
                     <textarea placeholder="Texto do Rodapé" rows={3} value={brand.footerText} onChange={e => setBrand({ ...brand, footerText: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm border border-slate-100 resize-none" />
                  </div>
               </div>
            </div>

            {/* 2. FEATURES */}
            <div id="recursos" className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
               <div className="flex items-center gap-4 text-slate-800">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                     <span className="material-symbols-outlined text-3xl">layers</span>
                  </div>
                  <div>
                     <h2 className="text-xl font-black uppercase tracking-tight">2. Recursos do Sistema</h2>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Texto Hero e Cards</p>
                  </div>
               </div>
               <div className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                     <input type="text" placeholder="Título Hero" value={heroText.title} onChange={e => setHeroText({ ...heroText, title: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-black border border-slate-100" />
                     <input type="text" placeholder="Destaque" value={heroText.highlight} onChange={e => setHeroText({ ...heroText, highlight: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-100 text-indigo-600" />
                     <textarea placeholder="Descrição Hero" rows={2} className="md:col-span-2 w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm border border-slate-100" value={heroText.description} onChange={e => setHeroText({ ...heroText, description: e.target.value })} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                     {features.map((f, i) => (
                        <div key={f.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 relative space-y-4">
                           <button onClick={() => removeFeature(i)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500"><span className="material-symbols-outlined text-sm">close</span></button>
                           <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-indigo-600 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">{f.icon}</span>
                              <input type="text" value={f.title} onChange={e => updateFeature(i, 'title', e.target.value)} className="flex-1 bg-white px-4 py-2 rounded-xl text-xs font-black border border-slate-100" />
                           </div>
                           <textarea value={f.desc} onChange={e => updateFeature(i, 'desc', e.target.value)} rows={2} className="w-full bg-white px-4 py-2 rounded-xl text-xs border border-slate-100" />
                           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                              {ICON_BASE.map(icon => <button key={icon} onClick={() => updateFeature(i, 'icon', icon)} className={`p-1.5 rounded-lg ${f.icon === icon ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'}`}><span className="material-symbols-outlined text-[16px]">{icon}</span></button>)}
                           </div>
                        </div>
                     ))}
                     <button onClick={addFeature} className="md:col-span-2 py-4 border-2 border-dashed border-slate-100 rounded-[32px] text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50">+ Adicionar Card</button>
                  </div>
               </div>
            </div>

            {/* 3. SLIDES */}
            <div id="slides" className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">view_carousel</span></div>
                     <h2 className="text-xl font-black uppercase tracking-tight">3. Slides</h2>
                  </div>
                  <button onClick={() => setSliders([...sliders, { id: Date.now().toString(), badge: 'Novo', title: 'Título', subtitle: '...', image: '' }])} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">+ Adicionar</button>
               </div>
               <div className="grid md:grid-cols-2 gap-6">
                  {sliders.map(s => (
                     <div key={s.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-4">
                        <input type="text" value={s.title} onChange={e => setSliders(sliders.map(sl => sl.id === s.id ? { ...sl, title: e.target.value } : sl))} className="w-full bg-white px-4 py-2 rounded-xl font-black text-xs border border-slate-100" />
                        <div className="h-24 bg-white rounded-2xl border border-slate-100 overflow-hidden relative cursor-pointer" onClick={() => (document.getElementById('up-' + s.id) as any).click()}>
                           {s.image ? <img src={s.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><span className="material-symbols-outlined">image</span></div>}
                           <input type="file" id={'up-' + s.id} className="hidden" onChange={e => handleAvatarUpload(e, 'slider', s.id)} />
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* 4. PASSOS */}
            <div id="passos" className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4"><div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">timeline</span></div><h2 className="text-xl font-black uppercase">4. Passo a Passo</h2></div>
               </div>
               <div className="grid md:grid-cols-2 gap-6">
                  {steps.map(st => (
                     <div key={st.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-2">
                        <input type="text" value={st.title} onChange={e => setSteps(steps.map(item => item.id === st.id ? { ...item, title: e.target.value } : item))} className="w-full bg-white px-4 py-2 rounded-xl text-xs font-black border border-slate-100" />
                        <textarea value={st.desc} onChange={e => setSteps(steps.map(item => item.id === st.id ? { ...item, desc: e.target.value } : item))} className="w-full bg-white px-4 py-2 rounded-xl text-[10px] border border-slate-100 resize-none" />
                     </div>
                  ))}
               </div>
            </div>

            {/* 5. DICAS */}
            <div id="dicas" className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
               <div className="flex items-center gap-4"><div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">lightbulb</span></div><h2 className="text-xl font-black uppercase">5. Dicas</h2></div>
               <div className="grid md:grid-cols-2 gap-4">
                  {tips.map((tip, i) => <input key={i} value={tip} onChange={e => updateTip(i, e.target.value)} className="bg-slate-50 px-5 py-3 rounded-2xl text-xs border border-slate-100" />)}
                  <button onClick={() => setTips([...tips, ''])} className="md:col-span-2 py-3 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-bold text-slate-300 uppercase">+ Nova Dica</button>
               </div>
            </div>

            {/* 6. AVALIAÇÕES */}
            <div id="avaliacoes" className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4"><div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">star</span></div><h2 className="text-xl font-black uppercase">6. Avaliações</h2></div>
                  <button onClick={handleRequestEvaluation} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all hover:bg-black">SOLICITAR A TODOS</button>
               </div>
               <ReviewList />
            </div>

            {/* 7. POLÍTICAS & LGPD */}
            <div id="politicas" className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
               <div className="flex items-center gap-4 text-slate-800">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">gavel</span></div>
                  <div><h2 className="text-xl font-black uppercase">7. Políticas & Logs LGPD</h2></div>
               </div>
               <div className="space-y-6">
                  <textarea value={policies.terms} onChange={e => setPolicies({ ...policies, terms: e.target.value })} placeholder="Termos de Uso" rows={5} className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl text-xs border border-slate-100" />
                  <textarea value={policies.privacy} onChange={e => setPolicies({ ...policies, privacy: e.target.value })} placeholder="Política de Privacidade" rows={5} className="w-full bg-slate-50 px-5 py-3.5 rounded-2xl text-xs border border-slate-100" />
                  <div className="overflow-x-auto rounded-3xl border border-slate-100">
                     <table className="w-full text-left text-[10px]">
                        <thead className="bg-slate-50 text-slate-400 font-black uppercase"><tr><th className="px-6 py-4">Data</th><th className="px-6 py-4">Sessão</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                           {lgpdLogs.map(log => <tr key={log.id}><td className="px-6 py-4 font-bold">{new Date(log.accepted_at).toLocaleString('pt-BR')}</td><td className="px-6 py-4 font-mono text-slate-300">{log.session_id}</td></tr>)}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>

            {/* PERFIL (OLD SECTION 0) */}
            <div id="perfil" className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
               <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center"><span className="material-symbols-outlined text-3xl">person</span></div><h2 className="text-xl font-black uppercase text-slate-400">Dados do Perfil</h2></div>
               <div className="grid md:grid-cols-2 gap-6 opacity-60">
                  <input type="text" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="bg-slate-50 px-5 py-3.5 rounded-2xl text-sm font-bold border border-slate-100" placeholder="Nome Completo" />
                  <input type="text" value={profile.company_name} onChange={e => setProfile({ ...profile, company_name: e.target.value })} className="bg-slate-50 px-5 py-3.5 rounded-2xl text-sm font-bold border border-slate-100" placeholder="Empresa/Imobiliária" />
                  <input type="text" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="bg-slate-50 px-5 py-3.5 rounded-2xl text-sm font-bold border border-slate-100" placeholder="Telefone" />
                  <input type="text" value={profile.cpf_cnpj} onChange={e => setProfile({ ...profile, cpf_cnpj: formatCpfCnpj(e.target.value) })} className="bg-slate-50 px-5 py-3.5 rounded-2xl text-sm font-bold border border-slate-100" placeholder="CPF/CNPJ" />
               </div>
            </div>
         </div>
      </div>
   );
};

export default SettingsPage;
