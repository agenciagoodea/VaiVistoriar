import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { validateCPF, validateCNPJ, formatCpfCnpj } from '../lib/utils';

const SettingsPage: React.FC = () => {
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [uploading, setUploading] = useState<string | null>(null);
   const [userRole, setUserRole] = useState<'ADMIN' | 'PJ' | 'BROKER' | null>(null);

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
      setLoading(true);
      setError(null);
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         const { data: profileData, error: profileError } = await supabase
            .from('broker_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

         if (profileError) {
            console.error('Settings: Error fetching profile:', profileError);
            setError(`Erro ao carregar perfil: ${profileError.message}`);
            return;
         }

         if (profileData) {
            setUserRole(profileData.role);
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
      } catch (err: any) {
         console.error('Settings: Unexpected error:', err);
         setError(err.message || 'Erro inesperado ao carregar configurações.');
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

   const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading('profile');
      try {
         const fileExt = file.name.split('.').pop();
         const filePath = `settings/avatar-${Date.now()}.${fileExt}`;
         const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
         if (uploadError) throw uploadError;
         const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
         setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      } catch (err) {
         console.error(err);
         alert('Erro no upload.');
      } finally {
         setUploading(null);
      }
   };

   const handleSave = async () => {
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

         alert('Alterações salvas com sucesso!');
      } catch (err: any) {
         alert(`Erro: ${err.message}`);
      } finally {
         setSaving(false);
      }
   };

   if (loading) return <div className="p-20 text-center text-slate-400 animate-pulse font-black uppercase tracking-widest">Carregando perfil...</div>;

   return (
      <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight text-blue-600">
                  Meu Perfil
               </h1>
               <p className="text-slate-500 mt-1">Mantenha seus dados profissionais atualizados.</p>
            </div>

            <button onClick={handleSave} disabled={saving} className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50">
               {saving ? 'Gravando...' : 'Salvar Perfil'}
            </button>
         </div>

         {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
               <span className="material-symbols-outlined text-rose-500">error</span>
               <p className="text-sm font-bold text-rose-700">{error}</p>
            </div>
         )}

         <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">person</span>
               </div>
               <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Informações Pessoais</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Dados de identificação no sistema</p>
               </div>
            </div>

            <div className="p-10 space-y-10">
               <div className="flex flex-col items-center justify-center space-y-4 pb-4 border-b border-slate-50">
                  <div className="relative group">
                     <div className="w-40 h-40 rounded-full border-4 border-slate-50 overflow-hidden shadow-2xl relative">
                        {profile.avatar_url ? (
                           <img src={profile.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                              <span className="material-symbols-outlined text-[80px]">person</span>
                           </div>
                        )}
                        {uploading === 'profile' && (
                           <div className="absolute inset-0 bg-white/80 flex items-center justify-center animate-pulse">
                              <span className="material-symbols-outlined text-blue-600 animate-spin">sync</span>
                           </div>
                        )}
                     </div>
                     <label className="absolute bottom-2 right-2 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transform hover:scale-110 active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-xl">photo_camera</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                     </label>
                  </div>
               </div>

               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
                     <input type="text" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail</label>
                     <input type="email" value={profile.email} readOnly className="w-full px-5 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CPF/CNPJ</label>
                     <input type="text" value={profile.cpf_cnpj} onChange={e => setProfile({ ...profile, cpf_cnpj: formatCpfCnpj(e.target.value) })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Telefone</label>
                     <input type="text" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all" />
                  </div>

                  {(userRole === 'PJ' || profile.company_name) && (
                     <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Empresa / Imobiliária</label>
                        <input type="text" value={profile.company_name} onChange={e => setProfile({ ...profile, company_name: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all" />
                     </div>
                  )}

                  {userRole === 'BROKER' && (
                     <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CRECI (Opcional)</label>
                        <input type="text" value={profile.creci} onChange={e => setProfile({ ...profile, creci: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all" />
                     </div>
                  )}
               </div>

               <div className="pt-8 border-t border-slate-50 space-y-6">
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-widest">Endereço</h3>
                  <div className="grid md:grid-cols-4 gap-6">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CEP</label>
                        <input type="text" value={profile.cep} onBlur={handleCEPBlur} onChange={e => setProfile({ ...profile, cep: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" />
                     </div>
                     <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rua</label>
                        <input type="text" value={profile.street} onChange={e => setProfile({ ...profile, street: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nº</label>
                        <input type="text" value={profile.number} onChange={e => setProfile({ ...profile, number: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bairro</label>
                        <input type="text" value={profile.district} onChange={e => setProfile({ ...profile, district: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cidade</label>
                        <input type="text" value={profile.city} onChange={e => setProfile({ ...profile, city: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">UF</label>
                        <input type="text" value={profile.state} onChange={e => setProfile({ ...profile, state: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-center" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default SettingsPage;
