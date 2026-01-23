
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const SettingsPage: React.FC = () => {
   const [tips, setTips] = useState<string[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [uploading, setUploading] = useState(false);

   // Profile State
   const [profile, setProfile] = useState({
      full_name: '',
      email: '',
      cpf_cnpj: '',
      creci: '',
      phone: '',
      cep: '',
      address: '',
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

         // Fetch Tips
         const { data: tipsData } = await supabase
            .from('system_configs')
            .select('*')
            .eq('key', 'inspection_tips')
            .single();
         if (tipsData) setTips(tipsData.value);

         // Fetch Profile
         const { data: profileData } = await supabase
            .from('broker_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

         if (profileData) {
            setProfile({
               full_name: profileData.full_name || '',
               email: profileData.email || '',
               cpf_cnpj: profileData.cpf_cnpj || '',
               creci: profileData.creci || '',
               phone: profileData.phone || '',
               cep: profileData.cep || '',
               address: profileData.address || '',
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
            const newAddress = `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ''} - ${data.localidade}/${data.uf}`;
            setProfile(prev => ({ ...prev, address: newAddress }));
         }
      } catch (err) {
         console.error('Erro ao buscar CEP:', err);
      }
   };

   const handleSaveAll = async () => {
      setSaving(true);
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) throw new Error('Não autenticado');

         // Save Tips
         await supabase
            .from('system_configs')
            .upsert({ key: 'inspection_tips', value: tips, updated_at: new Date().toISOString() });

         // Save Profile
         const { error: profileError } = await supabase
            .from('broker_profiles')
            .upsert({
               user_id: user.id,
               ...profile,
               updated_at: new Date().toISOString()
            });

         if (profileError) throw profileError;
         alert('Configurações e Perfil salvos com sucesso!');
      } catch (err) {
         console.error(err);
         alert('Erro ao salvar as alterações.');
      } finally {
         setSaving(false);
      }
   };

   const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      try {
         const file = e.target.files[0];
         const { data: { user } } = await supabase.auth.getUser();
         const fileExt = file.name.split('.').pop();
         const filePath = `profiles/${user?.id}-${Math.random()}.${fileExt}`;

         const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
         setProfile({ ...profile, avatar_url: publicUrl });
      } catch (err) {
         alert('Erro ao subir foto.');
      } finally {
         setUploading(false);
      }
   };

   const updateTip = (index: number, val: string) => {
      const newTips = [...tips];
      newTips[index] = val;
      setTips(newTips);
   };

   if (loading) return <div className="p-20 text-center font-bold text-slate-400">CARREGANDO...</div>;

   return (
      <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight text-indigo-600">Configurações</h1>
               <p className="text-slate-500 mt-1">Gerencie seus dados profissionais e do sistema.</p>
            </div>
            <button
               onClick={handleSaveAll}
               disabled={saving}
               className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
            >
               {saving ? 'Gravando...' : 'Salvar Tudo'}
            </button>
         </div>

         <div className="grid gap-12">
            {/* PROFILE SECTION */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-10 space-y-10">
               <div className="flex items-center gap-4 text-slate-800">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                     <span className="material-symbols-outlined text-3xl">account_circle</span>
                  </div>
                  <div>
                     <h2 className="text-xl font-black uppercase tracking-tight">Meu Perfil Profissional</h2>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Estes dados aparecerão no cabeçalho do laudo</p>
                  </div>
               </div>

               <div className="flex flex-col md:flex-row gap-10">
                  <div className="flex flex-col items-center gap-4">
                     <div className="relative group w-32 h-32">
                        <div className="w-32 h-32 rounded-[32px] overflow-hidden bg-slate-100 border-4 border-white shadow-xl">
                           {profile.avatar_url ? (
                              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                 <span className="material-symbols-outlined text-5xl">person</span>
                              </div>
                           )}
                           {uploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full" /></div>}
                        </div>
                        <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                           <span className="material-symbols-outlined text-xl">add_a_photo</span>
                           <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </label>
                     </div>
                  </div>

                  <div className="flex-1 grid md:grid-cols-2 gap-6">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
                        <input type="text" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail</label>
                        <input type="email" value={profile.email} readOnly className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-400 cursor-not-allowed" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CPF ou CNPJ</label>
                        <input type="text" value={profile.cpf_cnpj} onChange={e => setProfile({ ...profile, cpf_cnpj: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Registro CRECI</label>
                        <input type="text" value={profile.creci} onChange={e => setProfile({ ...profile, creci: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Telefone / WhatsApp</label>
                        <input type="text" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CEP (Busca Automática)</label>
                        <input type="text" value={profile.cep} onBlur={handleCEPBlur} onChange={e => setProfile({ ...profile, cep: e.target.value })} placeholder="00000-000" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold" />
                     </div>
                     <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Endereço Profissional</label>
                        <input type="text" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} placeholder="Auto-preenchido pelo CEP ou digite aqui..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold" />
                     </div>
                     <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome da Imobiliária / Empresa</label>
                        <input type="text" value={profile.company_name} onChange={e => setProfile({ ...profile, company_name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold" />
                     </div>
                  </div>
               </div>
            </div>

            {/* TIPS SECTION */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-8">
               <div className="flex items-center gap-4 text-slate-800">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                     <span className="material-symbols-outlined text-3xl">lightbulb</span>
                  </div>
                  <div>
                     <h2 className="text-xl font-black uppercase tracking-tight">Dicas para Vistorias</h2>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Edite as orientações que aparecem no Passo 5</p>
                  </div>
               </div>

               <div className="space-y-4">
                  {tips.map((tip, idx) => (
                     <div key={idx} className="flex gap-3 items-center group">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-300">{idx + 1}</div>
                        <input
                           type="text"
                           value={tip}
                           onChange={e => updateTip(idx, e.target.value)}
                           className="flex-1 px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-4 focus:ring-amber-500/5 transition-all font-medium"
                        />
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
};

export default SettingsPage;
