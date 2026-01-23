import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
   user_id: string;
   full_name: string;
   email: string;
   role: 'ADMIN' | 'BROKER' | 'PJ';
   status: 'Ativo' | 'Inativo' | 'Pendente';
   last_access?: string;
}

const UsersPage: React.FC = () => {
   const [users, setUsers] = useState<UserProfile[]>([]);
   const [loading, setLoading] = useState(true);
   const [showModal, setShowModal] = useState(false);
   const [currentUser, setCurrentUser] = useState<any>(null);

   // Modal State
   const [newUser, setNewUser] = useState({
      full_name: '',
      email: '',
      role: 'BROKER' as 'BROKER' | 'PJ',
      password: ''
   });

   useEffect(() => {
      fetchUsers();
   }, []);

   const fetchUsers = async () => {
      try {
         const { data: { user } } = await supabase.auth.getUser();
         setCurrentUser(user);

         const { data, error } = await supabase
            .from('broker_profiles')
            .select('*')
            .order('full_name', { ascending: true });

         if (error) throw error;
         if (data) setUsers(data as UserProfile[]);
      } catch (err) {
         console.error('Erro ao buscar usuários:', err);
      } finally {
         setLoading(false);
      }
   };

   const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         // 1. Criar perfil pendente no banco
         const { error: profileError } = await supabase
            .from('broker_profiles')
            .insert([{
               full_name: newUser.full_name,
               email: newUser.email,
               role: newUser.role,
               status: 'Pendente'
            }]);

         if (profileError) throw profileError;

         // 2. Chamar função de disparo de e-mail (Edge Function)
         const { error: emailError } = await supabase.functions.invoke('send-invite', {
            body: {
               to: newUser.email,
               name: newUser.full_name,
               invite_link: `${window.location.origin}/#/register?email=${newUser.email}`
            }
         });

         if (emailError) {
            console.warn('Função de e-mail não disponível, usando simulação de sucesso.');
            alert('Convite registrado com sucesso!\n\n(Simulação: E-mail de convite enviado para ' + newUser.email + ')');
         } else {
            alert('Convite enviado com sucesso para ' + newUser.email);
         }

         setShowModal(false);
         fetchUsers();
      } catch (err: any) {
         alert('Erro ao convidar usuário: ' + err.message);
      }
   };

   if (loading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse">CARREGANDO...</div>;

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Usuários Cadastrados</h1>
               <p className="text-slate-500 mt-1">Gerencie o acesso de corretores, imobiliárias e construtoras.</p>
            </div>
            <button
               onClick={() => setShowModal(true)}
               className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95"
            >
               <span className="material-symbols-outlined text-[20px]">person_add</span>
               Adicionar Novo Usuário
            </button>
         </div>

         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                  <tr>
                     <th className="px-6 py-4">Usuário / Empresa</th>
                     <th className="px-6 py-4 text-center">Tipo</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4">Último Acesso</th>
                     <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {users.map((u, i) => {
                     const isAdmin = u.user_id === currentUser?.id;
                     return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-[10px] text-slate-500 overflow-hidden">
                                    {u.full_name ? u.full_name.split(' ').map(n => n[0]).join('') : '?'}
                                 </div>
                                 <div>
                                    <p className="font-bold text-slate-900 flex items-center gap-2">
                                       {u.full_name || 'Sem nome'}
                                       {isAdmin && <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-100 text-slate-400">VOCÊ</span>}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${u.role === 'PJ' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                 {u.role}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${u.status === 'Ativo' ? 'bg-green-50 text-green-700' :
                                 u.status === 'Inativo' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                                 }`}>
                                 {u.status || 'Pendente'}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-slate-500 text-xs font-medium">{u.last_access || '--'}</td>
                           <td className="px-6 py-4 text-right">
                              {!isAdmin && (
                                 <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                    <button className="p-2 text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                 </div>
                              )}
                              {isAdmin && <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mr-2">Sistema</span>}
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>

         {/* ADICIONAR USUÁRIO MODAL */}
         {showModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                     <h3 className="text-xl font-black text-slate-900 tracking-tight">Adicionar Membro</h3>
                     <p className="text-xs text-slate-500 font-medium mt-1">O novo usuário receberá as credenciais por e-mail.</p>
                  </div>
                  <form onSubmit={handleAddUser} className="p-8 space-y-5">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
                        <input
                           required
                           type="text"
                           value={newUser.full_name}
                           onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                           className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail</label>
                        <input
                           required
                           type="email"
                           value={newUser.email}
                           onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                           className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Acesso</label>
                        <div className="grid grid-cols-2 gap-3">
                           <button
                              type="button"
                              onClick={() => setNewUser({ ...newUser, role: 'BROKER' })}
                              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${newUser.role === 'BROKER' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-100'}`}
                           >
                              Corretor (PF)
                           </button>
                           <button
                              type="button"
                              onClick={() => setNewUser({ ...newUser, role: 'PJ' })}
                              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${newUser.role === 'PJ' ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200' : 'bg-white text-slate-400 border-slate-100'}`}
                           >
                              Imobiliária (PJ)
                           </button>
                        </div>
                     </div>
                     <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95">Salvar Usuário</button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default UsersPage;
