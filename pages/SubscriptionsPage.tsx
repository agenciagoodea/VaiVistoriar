
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SubscriptionsPage: React.FC = () => {
   const [loading, setLoading] = useState(true);
   const [subs, setSubs] = useState<any[]>([]);
   const [allPlans, setAllPlans] = useState<any[]>([]);
   const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

   // Modal State
   const [selectedUser, setSelectedUser] = useState<any | null>(null);
   const [newPlanId, setNewPlanId] = useState("");
   const [adminPassword, setAdminPassword] = useState("");
   const [modalLoading, setModalLoading] = useState(false);

   const [fetchError, setFetchError] = useState<string | null>(null);

   const fetchData = async () => {
      try {
         // 1. Fetch plans directly (as fallback)
         const { data: directPlans } = await supabase.from('plans').select('*').order('price', { ascending: true });
         if (directPlans) setAllPlans(directPlans);

         // 2. Call Edge Function to get profiles AND payments (And verified plans)
         const { data: responseData, error } = await supabase.functions.invoke('admin-dash', {
            body: { action: 'get_subscriptions' }
         });

         if (error) throw error;

         if (responseData && !responseData.success) {
            throw new Error(responseData.error || 'Erro ao buscar assinaturas');
         }

         // Update plans from edge function if available (Service Role fetch is more reliable)
         if (responseData.allPlans && responseData.allPlans.length > 0) {

            setAllPlans(responseData.allPlans);
         }

         const profiles = responseData.profiles || [];
         const allPayments = responseData.payments || [];
         // const plans = responseData.allPlans || []; // Using direct fetch instead

         if (profiles) {
            setSubs(profiles.map((profile: any) => {
               // Encontrar último pagamento aprovado deste usuário
               const lastPayment = allPayments.find((p: any) => p.user_id === profile.user_id && p.status === 'approved');

               // Lógica PF/PJ baseada no cpf_cnpj (CNPJ tem 14 dígitos, CPF tem 11)
               const doc = (profile.cpf_cnpj || "").replace(/\D/g, "");
               const type = doc.length > 11 ? 'PJ' : 'PF';

               return {
                  id: profile.user_id,
                  client: profile.company_name || profile.full_name || 'Usuário sem Nome',
                  email: profile.email || '(Nenhum e-mail vinculado)',
                  avatar: profile.avatar_url || null,
                  plan: profile.plans?.name || 'Vistoria Free',
                  price: profile.plans?.price ? `R$ ${parseFloat(profile.plans.price).toFixed(2).replace('.', ',')} / mês` : 'Gratuito',
                  status: profile.status || 'Ativa',
                  type: type,
                  renewal: profile.subscription_expires_at
                     ? new Date(profile.subscription_expires_at).toLocaleDateString('pt-BR')
                     : 'Permanente',
                  lastVal: lastPayment ? `R$ ${parseFloat(lastPayment.amount).toFixed(2).replace('.', ',')}` : '--',
                  lastDate: lastPayment ? new Date(lastPayment.created_at).toLocaleDateString('pt-BR') : '--'
               };
            }));
         }
      } catch (err) {
         console.error('❌ Erro ao buscar assinaturas:', err);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, []);

   const handleUpdatePlan = async () => {
      if (!selectedUser || !newPlanId || !adminPassword) {
         alert('Preencha todos os campos e a senha do administrador.');
         return;
      }

      try {
         setModalLoading(true);
         const { data: response, error } = await supabase.functions.invoke('admin-dash', {
            body: {
               action: 'update_user_plan',
               payload: {
                  user_id: selectedUser.id,
                  plan_id: newPlanId,
                  adminPassword: adminPassword,
                  status: 'Ativo',
                  expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
               }
            }
         });

         if (error) throw error;
         if (response && !response.success) {
            throw new Error(response.error || 'Erro na verificação');
         }

         alert('✅ Plano atualizado com sucesso!');
         setSelectedUser(null);
         setAdminPassword("");
         await fetchData();
      } catch (err: any) {
         console.error('Erro detalhado ao atualizar plano:', err);
         let msg = 'Erro ao atualizar plano';

         // Tentar extrair mensagem do corpo do erro (Supabase Function)
         if (err.context && typeof err.context.json === 'function') {
            try {
               const body = await err.context.json();
               if (body && (body.error || body.message)) {
                  msg = body.error || body.message;
               }
            } catch (e) {
               console.error('Falha ao parsear corpo do erro:', e);
            }
         } else if (err.message) {
            msg = err.message;
         }

         alert('❌ ' + msg);
      } finally {
         setModalLoading(false);
      }
   };

   if (loading) return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
         <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
         <p className="text-xs font-bold text-slate-400">Carregando assinaturas...</p>
      </div>
   );

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex justify-between items-end">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Assinaturas</h1>
               <p className="text-slate-500 mt-1">Planos, renovações e status das contas.</p>
            </div>
         </div>

         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                  <tr>
                     <th className="px-6 py-4">Cliente</th>
                     <th className="px-6 py-4">Plano</th>
                     <th className="px-6 py-4">Valor (Último)</th>
                     <th className="px-6 py-4">Data Pagamento</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4">Próxima Renovação</th>
                     <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {subs.map((s, i) => (
                     <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10">
                                 {s.avatar ? (
                                    <img src={s.avatar} alt={s.client} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                                 ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                       <span className="material-symbols-outlined text-slate-400 text-[20px]">person</span>
                                    </div>
                                 )}
                                 <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black border-2 border-white ${s.type === 'PJ' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                    {s.type}
                                 </div>
                              </div>
                              <div>
                                 <p className="font-bold text-slate-900">{s.client}</p>
                                 <p className="text-[10px] text-slate-400 font-medium">{s.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <p className="font-bold text-slate-700">{s.plan}</p>
                           <p className="text-[10px] text-slate-400 font-medium">{s.price}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">{s.lastVal}</td>
                        <td className="px-6 py-4 font-medium text-slate-500 text-xs">{s.lastDate}</td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${s.status === 'Ativo' || s.status === 'Ativa' ? 'bg-green-50 text-green-700' :
                              s.status === 'Pendente' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'Ativo' || s.status === 'Ativa' ? 'bg-green-600' : s.status === 'Pendente' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                              {s.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-bold">{s.renewal}</td>
                        <td className="px-6 py-4 text-right">
                           <button
                              onClick={() => {
                                 setSelectedUser(s);
                                 setNewPlanId("");
                              }}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100"
                              title="Trocar Plano"
                           >
                              <span className="material-symbols-outlined text-[18px]">settings_suggest</span>
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Plan Change Modal */}
         {selectedUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
                  <div className="text-center space-y-2">
                     <h3 className="text-xl font-black text-slate-900">Alterar Plano</h3>
                     <p className="text-xs text-slate-500 font-medium">Você está alterando o plano de <span className="text-slate-900 font-black">{selectedUser.client}</span></p>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Novo Plano</label>
                        <select
                           value={newPlanId}
                           onChange={(e) => setNewPlanId(e.target.value)}
                           className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 transition-all appearance-none cursor-pointer"
                        >
                           <option value="" disabled>Selecione um plano...</option>
                           {(() => {
                              const filteredPlans = allPlans.filter(p => {
                                 // Se o plano tiver tipo definido, respeitar rigorosamente (case insensitive)
                                 if (p.type) {
                                    return p.type.toUpperCase() === selectedUser.type;
                                 }

                                 // Fallback por nome se não tiver tipo
                                 const name = (p.name || "").toUpperCase();
                                 const isPJ = selectedUser.type === 'PJ';

                                 if (isPJ) {
                                    return name.includes('IMOBILIÁRIA') || name.includes('PJ') || name.includes('PLANO');
                                 } else {
                                    // Para PF, mostrar corretor ou planos genéricos (sem imobiliária no nome)
                                    return name.includes('CORRETOR') || name.includes('PF') || (!name.includes('IMOBILIÁRIA') && !name.includes('PJ'));
                                 }
                              });

                              // FALLBACK DE SEGURANÇA: Se o filtro não retornar nada, mostrar TODOS os planos para não bloquear o admin
                              const plansToShow = filteredPlans.length > 0 ? filteredPlans : allPlans;

                              return plansToShow.map(plan => (
                                 <option key={plan.id} value={plan.id}>
                                    {plan.name} - R$ {parseFloat(plan.price || 0).toFixed(2).replace('.', ',')}
                                    {filteredPlans.length === 0 ? ' (Exibido por fallback)' : ''}
                                 </option>
                              ));
                           })()}
                        </select>
                        {fetchError && (
                           <div className="mt-2 p-2 bg-red-50 rounded text-[10px] text-red-500 font-bold">
                              Erro ao carregar planos: {fetchError}
                           </div>
                        )}
                     </div>

                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Senha do Administrador</label>
                        <input
                           type="password"
                           placeholder="Sua senha para confirmar"
                           value={adminPassword}
                           onChange={(e) => setAdminPassword(e.target.value)}
                           className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
                        />
                     </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                     <button
                        onClick={() => setSelectedUser(null)}
                        className="flex-1 h-12 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                     >
                        Cancelar
                     </button>
                     <button
                        disabled={modalLoading}
                        onClick={handleUpdatePlan}
                        className="flex-1 h-12 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                        {modalLoading ? (
                           <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                           'Confirmar'
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default SubscriptionsPage;
