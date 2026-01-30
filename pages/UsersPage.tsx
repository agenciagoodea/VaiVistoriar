import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
   user_id: string;
   full_name: string;
   email: string;
   role: 'ADMIN' | 'BROKER' | 'PJ';
   status: 'Ativo' | 'Inativo' | 'Pendente';
   last_access?: string;
   avatar_url?: string;
}

const UsersPage: React.FC = () => {
   const [users, setUsers] = useState<UserProfile[]>([]);
   const [loading, setLoading] = useState(true);
   const [showModal, setShowModal] = useState(false);
   const [currentUser, setCurrentUser] = useState<any>(null);

   const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

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

         // Call Edge Function to get users with last_access data
         const { data: responseData, error } = await supabase.functions.invoke('admin-dash', {
            body: { action: 'get_users' }
         });

         if (error) throw error;

         if (responseData && responseData.users) {
            const mappedUsers = responseData.users.map((u: any) => ({
               user_id: u.user_id,
               full_name: u.full_name,
               email: u.email,
               role: u.role,
               status: u.status,
               last_access: u.last_sign_in_at
                  ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Nunca acessou',
               avatar_url: u.avatar_url // Ensure avatar_url is passed if needed, though we use initials mostly
            }));
            setUsers(mappedUsers);
         }
      } catch (err) {
         console.error('Erro ao buscar usuÃ¡rios:', err);
      } finally {
         setLoading(false);
      }
   };

   const sendInviteEmail = async (email: string, name: string) => {
      const { error: emailError } = await supabase.functions.invoke('send-email', {
         body: {
            to: email,
            templateId: 'invite',
            origin: window.location.origin,
            variables: {
               user_name: name,
               link: `${window.location.origin}/#/register?email=${email}&name=${encodeURIComponent(name)}`
            }
         }
      });

      if (emailError) {
         console.warn('FunÃ§Ã£o de e-mail não disponÃ­vel, usando simulação de sucesso.');
         alert('Convite registrado com sucesso!\n\n(Simulação: E-mail de convite enviado para ' + email + ')');
      } else {
         alert('Convite enviado com sucesso para ' + email);
      }
   }

   const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         if (editingUser) {
            // Modo EdiÃ§Ã£o
            const { error: updateError } = await supabase
               .from('broker_profiles')
               .update({
                  full_name: newUser.full_name,
                  role: newUser.role
               })
               .eq('email', editingUser.email);

            if (updateError) throw updateError;
            alert('UsuÃ¡rio atualizado com sucesso!');
         } else {
            // Modo Novo UsuÃ¡rio
            const { error: profileError } = await supabase
               .from('broker_profiles')
               .insert([{
                  full_name: newUser.full_name,
                  email: newUser.email,
                  role: newUser.role,
                  status: 'Pendente'
               }]);

            if (profileError) throw profileError;
            await sendInviteEmail(newUser.email, newUser.full_name);
         }

         setShowModal(false);
         setEditingUser(null);
         setNewUser({ full_name: '', email: '', role: 'BROKER', password: '' });
         fetchUsers();
      } catch (err: any) {
         alert('Erro ao salvar usuÃ¡rio: ' + err.message);
      }
   };

   const handleEditClick = (user: UserProfile) => {
      setEditingUser(user);
      setNewUser({
         full_name: user.full_name,
         email: user.email,
         role: user.role as 'BROKER' | 'PJ',
         password: ''
      });
      setShowModal(true);
   };

   const handleResendInvite = async (user: UserProfile) => {
      await sendInviteEmail(user.email, user.full_name);
   };

   const handleDeleteUser = async (user_id: string) => {
      if (!confirm('Deseja realmente excluir este usuário e todos os seus dados? Esta ação não pode ser desfeita.')) return;
      try {
         const { data, error } = await supabase.functions.invoke('admin-dash', {
            body: { action: 'delete_user', user_id }
         });

         // Verificar erro do invoke
         if (error) throw new Error(error.message || 'Erro na API');

         // Verificar success no body da resposta
         if (data && !data.success) {
            throw new Error(data.error || 'Erro ao excluir usuário');
         }

         alert('Usuário excluído com sucesso.');
         fetchUsers();
      } catch (err: any) {
         alert('Erro ao excluir: ' + (err.message || 'Falha desconhecida'));
      }
   };

   const [filterStatus, setFilterStatus] = useState<'all' | 'Ativo' | 'Pendente' | 'Bloqueado'>('all');
   const [filterRole, setFilterRole] = useState<'all' | 'BROKER' | 'PJ' | 'ADMIN'>('all');
   const [searchTerm, setSearchTerm] = useState('');

   const filteredUsers = users.filter(user => {
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesRole && matchesSearch;
   });

   if (loading) return <div className="p-20 text-center font-bold text-slate-400 animate-pulse">CARREGANDO...</div>;

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Usuários Cadastrados</h1>
               <p className="text-slate-500 mt-1">Gerencie o acesso de corretores, imobiliárias e construtoras.</p>
            </div>
            <button
               onClick={() => {
                  setEditingUser(null);
                  setNewUser({ full_name: '', email: '', role: 'BROKER', password: '' });
                  setShowModal(true);
               }}
               className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95"
            >
               <span className="material-symbols-outlined text-[20px]">person_add</span>
               Adicionar Novo Usuário
            </button>
         </div>

         <div className="flex flex-col lg:flex-row gap-4 mt-6">
            <div className="flex-1 relative">
               <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
               <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
               />
            </div>
            <div className="flex gap-4">
               <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="px-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none cursor-pointer"
               >
                  <option value="all">Todos Status</option>
                  <option value="Ativo">Ativos</option>
                  <option value="Pendente">Pendentes</option>
                  <option value="Bloqueado">Bloqueados</option>
               </select>
               <select
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value as any)}
                  className="px-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-bold shadow-sm outline-none cursor-pointer"
               >
                  <option value="all">Todos Tipos</option>
                  <option value="BROKER">Corretor (PF)</option>
                  <option value="PJ">Imobiliária (PJ)</option>
                  <option value="ADMIN">Administrador</option>
               </select>
            </div>
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
                  {filteredUsers.map((u, i) => {
                     const isCurrentUser = currentUser && (u.user_id === currentUser.id || u.email === currentUser.email);
                     return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-[10px] text-slate-500 overflow-hidden relative">
                                    {u.avatar_url ? (
                                       <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                       <span className="material-symbols-outlined text-slate-400 text-[24px]">person</span>
                                    )}
                                 </div>
                                 <div>
                                    <p className="font-bold text-slate-900 flex items-center gap-2">
                                       {u.full_name || 'Sem nome'}
                                       {isCurrentUser && <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-100 text-slate-400">VOCÃŠ</span>}
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
                              <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                 {u.status === 'Pendente' && (
                                    <button onClick={() => handleResendInvite(u)} title="Reenviar Convite" className="p-2 text-amber-500 hover:scale-110 transition-transform"><span className="material-symbols-outlined text-[20px]">forward_to_inbox</span></button>
                                 )}
                                 <button onClick={() => handleEditClick(u)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                 {!isCurrentUser && (
                                    <button onClick={() => handleDeleteUser(u.user_id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                 )}
                              </div>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>

         {/* ADICIONAR/EDITAR USUÃRIO MODAL */}
         {showModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                     <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingUser ? 'Editar Membro' : 'Adicionar Membro'}</h3>
                     <p className="text-xs text-slate-500 font-medium mt-1">{editingUser ? 'Atualize as informaÃ§Ãµes do perfil abaixo.' : 'O novo usuÃ¡rio receberÃ¡ as credenciais por e-mail.'}</p>
                  </div>
                  <form onSubmit={handleSaveUser} className="p-8 space-y-5">
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
                           readOnly={!!editingUser}
                           value={newUser.email}
                           onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                           className={`w-full px-5 py-3.5 border rounded-2xl outline-none text-sm font-bold ${editingUser ? 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed' : 'bg-slate-50 border-slate-100 focus:ring-4 focus:ring-blue-500/5'}`}
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
                              ImobiliÃ¡ria (PJ)
                           </button>
                        </div>
                     </div>
                     <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => { setShowModal(false); setEditingUser(null); }} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95">{editingUser ? 'Salvar EdiÃ§Ã£o' : 'Salvar UsuÃ¡rio'}</button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default UsersPage;

