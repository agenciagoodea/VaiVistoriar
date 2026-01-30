
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SubscriptionsPage: React.FC = () => {
   const [loading, setLoading] = useState(true);
   const [subs, setSubs] = useState<any[]>([]);
   const [allPlans, setAllPlans] = useState<any[]>([]);
   const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

   const fetchData = async () => {
      try {
         setLoading(true);

         // Call Edge Function to get profiles AND payments securely (Bypassing RLS)
         const { data: responseData, error } = await supabase.functions.invoke('admin-dash', {
            body: { action: 'get_subscriptions' }
         });

         console.log('🔍 Subscriptions API Response:', responseData);

         if (error) throw error;

         if (responseData && !responseData.success) {
            throw new Error(responseData.error || 'Erro ao buscar assinaturas');
         }

         const profiles = responseData.profiles || [];
         const allPayments = responseData.payments || [];
         const plans = responseData.allPlans || [];

         setAllPlans(plans);

         if (profiles) {
            setSubs(profiles.map((profile: any) => {
               // Encontrar último pagamento aprovado deste usuário
               // Como allPayments vem ordenado decrescente pelo servidor, o find pega o mais recente
               const lastPayment = allPayments.find((p: any) => p.user_id === profile.user_id && p.status === 'approved');

               return {
                  id: profile.user_id,
                  client: profile.company_name || profile.full_name || 'Usuário sem Nome',
                  email: profile.email || '(Nenhum e-mail vinculado)',
                  avatar: profile.avatar_url || null,
                  plan: profile.plans?.name || 'Vistoria Free',
                  price: profile.plans?.price ? `R$ ${parseFloat(profile.plans.price).toFixed(2).replace('.', ',')} / mês` : 'Gratuito',
                  status: profile.status || 'Ativa',
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

   const handleUpdatePlan = async (userId: string, planId: string) => {
      try {
         setUpdatingUserId(userId);
         const { data: response, error } = await supabase.functions.invoke('admin-dash', {
            body: {
               action: 'update_user_plan',
               payload: {
                  user_id: userId,
                  plan_id: planId,
                  status: 'Ativo',
                  expires_at: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString()
               }
            }
         });

         if (error || !response.success) throw error || new Error(response?.error);

         alert('✅ Plano atualizado com sucesso!');
         await fetchData(); // Recarrega os dados
      } catch (err: any) {
         console.error('Erro ao atualizar plano:', err);
         alert('❌ Erro ao atualizar plano: ' + err.message);
      } finally {
         setUpdatingUserId(null);
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
                              {s.avatar ? (
                                 <img src={s.avatar} alt={s.client} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">person</span>
                                 </div>
                              )}
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
                           {updatingUserId === s.id ? (
                              <div className="w-5 h-5 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin ml-auto" />
                           ) : (
                              <select
                                 className="text-[10px] font-black uppercase tracking-widest bg-slate-50 border-none rounded-lg px-2 py-1 outline-none hover:bg-slate-100 transition-colors cursor-pointer"
                                 onChange={(e) => {
                                    if (e.target.value && window.confirm(`Confirmar alteração para o plano ${allPlans.find(p => p.id === e.target.value)?.name}?`)) {
                                       handleUpdatePlan(s.id, e.target.value);
                                    }
                                    e.target.value = ""; // Reset do select
                                 }}
                                 value=""
                              >
                                 <option value="" disabled>Trocar Plano</option>
                                 {allPlans.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (R$ {parseFloat(p.price).toFixed(0)})</option>
                                 ))}
                              </select>
                           )}
                        </td>
                     </tr>
                  ))}
                  {subs.length === 0 && (
                     <tr>
                        <td colSpan={7} className="p-10 text-center text-slate-400 text-xs font-bold uppercase italic">Nenhuma assinatura encontrada.</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
   );
};

export default SubscriptionsPage;
