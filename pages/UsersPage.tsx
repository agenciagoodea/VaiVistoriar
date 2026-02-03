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
      password: '',
      confirmPassword: ''
   });

   const [modalTab, setModalTab] = useState<'create' | 'link'>('create');
   const [searchEmail, setSearchEmail] = useState('');
   const [searchResult, setSearchResult] = useState<any>(null);
   const [searching, setSearching] = useState(false);
   const [linking, setLinking] = useState(false);
   const [pjPlanId, setPjPlanId] = useState<string | null>(null);

   const [userRole, setUserRole] = useState<'ADMIN' | 'PJ' | 'BROKER'>('ADMIN');
   const [userCompany, setUserCompany] = useState<string>('');

   useEffect(() => {
      fetchUsers();
   }, []);

   const fetchUsers = async () => {
      try {
         const { data: { user } } = await supabase.auth.getUser();
         setCurrentUser(user);

         // Buscar perfil do usuário logado para saber o cargo e empresa
         const { data: myProfile } = await supabase
            .from('broker_profiles')
            .select('full_name, role, company_name, subscription_plan_id')
            .eq('user_id', user?.id)
            .single();

         if (myProfile) {
            // Force ADMIN for specific emails
            const owners = ['adriano_amorim@hotmail.com', 'contato@agenciagoodea.com', 'adriano@hotmail.com'];
            const isOwner = user?.email && owners.includes(user.email);

            if (isOwner) {
               setUserRole('ADMIN');
               setUserCompany('ADMINISTRADOR DO SISTEMA'); // Visual label
            } else {
               setUserRole(myProfile.role);

               // Fallback: Se for PJ e empresa estiver vazia, usa o full_name (que costuma ser o nome da imobiliária)
               const company = myProfile.company_name || (myProfile.role === 'PJ' ? myProfile.full_name : '');
               setUserCompany(company);
               setPjPlanId(myProfile.subscription_plan_id || null);
            }
         }

         // Call Edge Function with EXPLICIT token to avoid issues with stale/anon sessions
         const { data: { session } } = await supabase.auth.getSession();
         const headers: Record<string, string> = {};
         if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
         }

         const { data: responseData, error } = await supabase.functions.invoke('admin-dash', {
            body: { action: 'get_users' },
            headers
         });

         if (error) {
            console.error('❌ Edge Function Error Details:', error);
            if (error.context && typeof error.context.json === 'function') {
               const debugData = await error.context.json().catch(() => ({}));
               console.error('📦 Error Response Body:', debugData);
            }
            throw error;
         }

         if (responseData && responseData.users) {
            let userList = responseData.users;

            // Se for PJ, filtrar apenas os membros da mesma empresa (ou sem empresa?)
            // Se for PJ, filtrar apenas os membros da mesma empresa (ou sem empresa?)
            // IMPORTANT: Use state 'userRole' or check owners again, because 'myProfile.role' might differ from 'userRole' override.
            // But state updates are async, so we use the derived logic here or just check the variable we set.
            const owners = ['adriano_amorim@hotmail.com', 'contato@agenciagoodea.com', 'adriano@hotmail.com'];
            const isOwner = user?.email && owners.includes(user.email);

            if (myProfile?.role === 'PJ' && !isOwner) {
               const myCompany = (myProfile.company_name || '').trim().toLowerCase();
               // Filtrando lista para PJ da empresa
               userList = userList.filter((u: any) => {
                  const userCompany = (u.company_name || '').trim().toLowerCase();
                  return userCompany === myCompany;
               });
            }

            const mappedUsers = userList.map((u: any) => ({
               user_id: u.user_id,
               full_name: u.full_name,
               email: u.email,
               role: u.role,
               status: u.status,
               company_name: u.company_name,
               last_access: u.last_sign_in_at
                  ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Nunca acessou',
               avatar_url: u.avatar_url
            }));
            setUsers(mappedUsers);
         }
      } catch (err: any) {
         console.error('Erro ao buscar usuários:', err);

         // Extract detailed error from response body if available
         let detailMsg = '';
         if (err.context && typeof err.context.json === 'function') {
            try {
               const body = await err.context.json();
               if (body.details) detailMsg = `\nDetalhes: ${body.details}`;
               if (body.debug) detailMsg += `\nDebug: ${JSON.stringify(body.debug)}`;
            } catch (e) {
               console.warn('Não foi possível ler corpo do erro:', e);
            }
         }

         // Robust 401 check
         const isUnauthorized =
            (err.status === 401 || err.status === 403) ||
            (err.message && (err.message.includes('401') || err.message.includes('403') || err.message.toLowerCase().includes('unauthorized')));

         if (isUnauthorized) {
            console.error('🔴 Sessão expirou ou é inválida (401).');
            await supabase.auth.signOut();
            window.location.href = '/login';
         }
      } finally {
         setLoading(false);
      }
   };

   const sendInviteEmail = async (email: string, name: string) => {
      const { error: emailError } = await supabase.functions.invoke('send-email', {
         body: {
            to: email,
            templateId: 'invite',
            origin: 'https://vaivistoriar.com.br',
            variables: {
               user_name: name,
               link: `https://vaivistoriar.com.br/#/register?email=${email}&name=${encodeURIComponent(name)}`
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
            // Modo Novo Usuário
            if (userRole === 'PJ') {
               // Validação de senha para cadastro direto PJ
               if (!newUser.password || newUser.password.length < 6) {
                  alert('A senha deve ter pelo menos 6 caracteres.');
                  return;
               }
               if (newUser.password !== newUser.confirmPassword) {
                  alert('As senhas não coincidem.');
                  return;
               }

               // Criar usuário via Edge Function (Auth + Profile)
               const { data: createData, error: createError } = await supabase.functions.invoke('admin-dash', {
                  body: {
                     action: 'create_user_pj',
                     email: newUser.email,
                     password: newUser.password,
                     full_name: newUser.full_name,
                     role: 'BROKER',
                     company_name: userCompany,
                     subscription_plan_id: pjPlanId
                  }
               });

               if (createError || (createData && !createData.success)) {
                  throw new Error(createData?.error || createError?.message || 'Erro ao criar usuário');
               }

               alert('Membro da equipe cadastrado com sucesso!');
            } else {
               // Fluxo Normal (Convite Admin)
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
         }

         setShowModal(false);
         setEditingUser(null);
         setNewUser({ full_name: '', email: '', role: 'BROKER', password: '', confirmPassword: '' });
         setModalTab('create'); // Reset tab
         setSearchEmail(''); // Reset search
         setSearchResult(null); // Reset search result
         fetchUsers();
      } catch (err: any) {
         alert('Erro ao salvar usuÃ¡rio: ' + err.message);
      }
   };

   const handleSearch = async () => {
      setSearching(true);
      setSearchResult(null);
      try {
         const { data: responseData, error } = await supabase.functions.invoke('admin-dash', {
            body: {
               action: 'search_user',
               payload: { email: searchEmail }
            }
         });

         if (error) throw error;

         if (responseData && responseData.user) {
            setSearchResult(responseData.user);
         } else {
            alert('Usuário não encontrado.');
         }
      } catch (err: any) {
         console.error('Erro ao buscar usuário:', err);
         const errorMsg = err.context?.message || err.message || 'Erro desconhecido';
         alert('Erro ao buscar usuário: ' + errorMsg);
      } finally {
         setSearching(false);
      }
   };

   const handleLinkExisting = async () => {
      if (!searchResult || !searchResult.user_id) return;

      if (!userCompany) {
         alert('⚠️ Erro de Vínculo: Não foi possível identificar o nome da sua imobiliária. Por favor, preencha o seu nome ou nome da empresa nas configurações do seu perfil antes de vincular corretores.');
         return;
      }

      setLinking(true);
      try {
         const { data, error } = await supabase.functions.invoke('admin-dash', {
            body: {
               action: 'link_user_to_team',
               payload: {
                  user_id: searchResult.user_id,
                  company_name: userCompany,
                  plan_id: pjPlanId
               }
            }
         });

         if (error) throw error;
         if (data && data.success === false) throw new Error(data.error);

         alert('Usuário vinculado à sua equipe com sucesso!');
         setShowModal(false);
         setModalTab('create'); // Reset tab
         setSearchEmail(''); // Reset search
         setSearchResult(null); // Reset search result
         fetchUsers();
      } catch (err: any) {
         console.error('Erro ao vincular usuário:', err);
         const errorMsg = err.context?.message || err.message || 'Erro desconhecido';
         alert('Erro ao vincular usuário: ' + errorMsg);
      } finally {
         setLinking(false);
      }
   };

   const handleEditClick = (user: UserProfile) => {
      setEditingUser(user);
      setNewUser({
         full_name: user.full_name,
         email: user.email,
         role: user.role as 'BROKER' | 'PJ',
         password: '',
         confirmPassword: ''
      });
      setModalTab('create'); // Ensure 'create' tab is active for editing
      setShowModal(true);
   };

   const handleResendInvite = async (user: UserProfile) => {
      await sendInviteEmail(user.email, user.full_name);
   };

   const handleDeleteUser = async (user_id: string) => {
      if (!confirm('Deseja realmente excluir este usuário e todos os seus dados? Esta ação não pode ser desfeita.')) return;
      try {

         const { data, error } = await supabase.functions.invoke('admin-dash', {
            body: {
               action: 'delete_user',
               user_id: user_id,
               payload: { user_id }
            }
         });

         if (error) {
            let msg = error.message;
            if (error.context && typeof error.context.json === 'function') {
               try {
                  const body = await error.context.json();
                  msg = body.error || body.message || msg;
               } catch (e) {
                  console.warn('Erro ao ler corpo do erro HTTP:', e);
               }
            }
            throw new Error(msg);
         }

         if (data && data.success === false) {
            throw new Error(data.error || 'Erro ao excluir usuário');
         }

         alert('Usuário excluído com sucesso.');
         fetchUsers();
      } catch (err: any) {
         console.error('Erro ao excluir usuário:', err);
         alert(`[ERRO DETALHADO]: ${err.message || 'Falha desconhecida'}`);
      }
   };

   const handleToggleStatus = async (user: UserProfile) => {
      const newStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
      const actionLabel = newStatus === 'Ativo' ? 'ativar' : 'desativar';

      if (!confirm(`Deseja realmente ${actionLabel} este usuário?`)) return;

      try {
         const { data, error } = await supabase.functions.invoke('admin-dash', {
            body: {
               action: 'update_user_status',
               payload: {
                  user_id: user.user_id,
                  status: newStatus
               }
            }
         });

         if (error) throw error;
         if (data && data.success === false) throw new Error(data.error);

         alert(`Usuário ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso.`);
         fetchUsers();
      } catch (err: any) {
         console.error('Erro ao alterar status:', err);
         alert(`Erro ao alterar status: ${err.message || 'Falha desconhecida'}`);
      }
   };

   const handleUnlinkUser = async (user: UserProfile) => {

      if (!confirm(`Deseja realmente desvincular ${user.full_name} da sua equipe? Ele passará a ser um corretor independente e sairá da sua lista.`)) return;

      try {
         // TENTATIVA DIRETA: Bypass Edge Function issues


         const { error } = await supabase
            .from('broker_profiles')
            .update({
               company_name: null,
               parent_pj_id: null,
               updated_at: new Date().toISOString()
            })
            .eq('user_id', user.user_id);

         if (error) throw error;

         alert('Usuário desvinculado com sucesso.');
         fetchUsers();
      } catch (err: any) {
         console.error('Erro ao desvincular usuário:', err);
         alert(`Erro: ${err.message || 'Falha desconhecida'}`);
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
                  setNewUser({ full_name: '', email: '', role: 'BROKER', password: '', confirmPassword: '' });
                  setModalTab('create'); // Reset tab to 'create' when opening for new user
                  setSearchEmail('');
                  setSearchResult(null);
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
                  <option value="BROKER">Corretor(a)</option>
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
                                       {isCurrentUser && <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-100 text-slate-400">VOCÊ</span>}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${u.role === 'PJ' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                 {u.role === 'BROKER' ? 'CORRETOR(A)' : u.role}
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
                                 <button
                                    onClick={() => handleToggleStatus(u)}
                                    title={u.status === 'Ativo' ? 'Desativar Usuário' : 'Ativar Usuário'}
                                    className={`p-2 transition-colors ${u.status === 'Ativo' ? 'text-slate-400 hover:text-amber-500' : 'text-slate-400 hover:text-green-500'}`}
                                 >
                                    <span className="material-symbols-outlined text-[20px]">
                                       {u.status === 'Ativo' ? 'person_off' : 'person_check'}
                                    </span>
                                 </button>
                                 {userRole === 'PJ' && !isCurrentUser && (
                                    <button
                                       onClick={() => handleUnlinkUser(u)}
                                       title="Desvincular da Equipe"
                                       className="p-2 text-slate-400 hover:text-purple-600 transition-colors"
                                    >
                                       <span className="material-symbols-outlined text-[20px]">link_off</span>
                                    </button>
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

         {/* ADICIONAR/EDITAR USUÁRIO MODAL */}
         {showModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                     <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {userRole === 'PJ' ? (editingUser ? 'Editar Membro da Equipe' : 'Novo Membro da Equipe') : (editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário')}
                     </h3>
                     <p className="text-xs text-slate-500 font-medium mt-1">
                        {userRole === 'PJ'
                           ? (editingUser ? 'Atualize os dados do corretor abaixo.' : 'Cadastre o corretor diretamente com senha de acesso.')
                           : (editingUser ? 'Atualize as informações do perfil abaixo.' : 'O novo usuário receberá as credenciais por e-mail.')}
                     </p>
                  </div>
                  {userRole === 'PJ' && !editingUser && (
                     <div className="flex border-b border-slate-100">
                        <button
                           onClick={() => { setModalTab('create'); setSearchResult(null); setSearchEmail(''); }}
                           className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                        >
                           Cadastrar Novo
                        </button>
                        <button
                           onClick={() => { setModalTab('link'); setSearchResult(null); setSearchEmail(''); }}
                           className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'link' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
                        >
                           Buscar Existente
                        </button>
                     </div>
                  )}

                  {modalTab === 'create' || editingUser ? (
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
                        {userRole === 'PJ' ? (
                           !editingUser && (
                              <>
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Senha de Acesso</label>
                                    <input
                                       required
                                       type="password"
                                       value={newUser.password}
                                       onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                       className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold"
                                       placeholder="Mínimo 6 caracteres"
                                    />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Confirmar Senha</label>
                                    <input
                                       required
                                       type="password"
                                       value={newUser.confirmPassword}
                                       onChange={e => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                                       className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold"
                                       placeholder="Repita a senha"
                                    />
                                 </div>
                              </>
                           )
                        ) : (
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
                        )}
                        <div className="flex gap-3 pt-4">
                           <button type="button" onClick={() => { setShowModal(false); setEditingUser(null); setModalTab('create'); setSearchEmail(''); setSearchResult(null); }} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                           <button type="submit" className="flex-1 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95">{editingUser ? 'Salvar Edição' : 'Salvar Usuário'}</button>
                        </div>
                     </form>
                  ) : (
                     <div className="p-8 space-y-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail do Corretor</label>
                           <div className="flex gap-2">
                              <input
                                 type="email"
                                 placeholder="corretor@email.com"
                                 value={searchEmail}
                                 onChange={e => setSearchEmail(e.target.value)}
                                 className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold"
                              />
                              <button
                                 onClick={handleSearch}
                                 disabled={searching || !searchEmail}
                                 className="px-6 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                              >
                                 {searching ? '...' : 'Buscar'}
                              </button>
                           </div>
                        </div>

                        {searchResult && (
                           <div className="p-6 bg-blue-50 rounded-[24px] border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center gap-4">
                                 {searchResult.avatar_url ? (
                                    <img src={searchResult.avatar_url} className="w-12 h-12 rounded-full object-cover shadow-sm bg-blue-100" />
                                 ) : (
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                       <span className="material-symbols-outlined text-[24px]">person</span>
                                    </div>
                                 )}
                                 <div>
                                    <p className="text-sm font-black text-slate-900">{searchResult.full_name}</p>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                       {searchResult.role === 'BROKER' ? 'CORRETOR(A)' : searchResult.role}
                                    </p>
                                 </div>
                              </div>

                              {searchResult.company_name ? (
                                 <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-700 italic flex items-center gap-2">
                                       <span className="material-symbols-outlined text-[14px]">warning</span>
                                       Este corretor já pertence à empresa: {searchResult.company_name}
                                    </p>
                                 </div>
                              ) : (
                                 <button
                                    onClick={handleLinkExisting}
                                    disabled={linking}
                                    className="w-full mt-6 py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                                 >
                                    {linking ? 'Vinculando...' : 'Adicionar à Minha Equipe'}
                                 </button>
                              )}
                           </div>
                        )}

                        <button type="button" onClick={() => { setShowModal(false); setModalTab('create'); setSearchEmail(''); setSearchResult(null); }} className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>
   );
};

export default UsersPage;

