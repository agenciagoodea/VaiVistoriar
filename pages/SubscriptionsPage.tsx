
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SubscriptionsPage: React.FC = () => {
   const [loading, setLoading] = useState(true);
   const [subs, setSubs] = useState<any[]>([]);

   useEffect(() => {
      const fetchData = async () => {
         try {
            setLoading(true);

            // Call Edge Function to get profiles AND payments securely (Bypassing RLS)
            const { data: responseData, error } = await supabase.functions.invoke('admin-dash', {
               body: { action: 'get_subscriptions' }
            });

            console.log('🔍 Subscriptions API Response:', responseData);
            console.log('🔍 Subscriptions API Error:', error);

            if (error) throw error;

            // Verificar success no body
            if (responseData && !responseData.success) {
               throw new Error(responseData.error || 'Erro ao buscar assinaturas');
            }

            const profiles = responseData.profiles || [];
            const allPayments = responseData.payments || [];

            console.log('📊 Profiles Count:', profiles.length);
            console.log('💰 Payments Count:', allPayments.length);

            if (profiles) {
               setSubs(profiles.map((profile: any) => {
                  // Encontrar último pagamento aprovado deste usuário
                  const lastPayment = allPayments.find((p: any) => p.user_id === profile.user_id && p.status === 'approved');

                  return {
                     id: profile.user_id,
                     client: profile.full_name || 'Usuário sem Nome',
                     email: profile.email || '(Nenhum e-mail vinculado)',
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
      fetchData();
   }, []);

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
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {subs.map((s, i) => (
                     <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px]">
                                 {s.client.split(' ').map((n: string) => n[0]).join('')}
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
                     </tr>
                  ))}
                  {subs.length === 0 && (
                     <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400 text-xs font-bold uppercase italic">Nenhuma assinatura encontrada.</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
   );
};

export default SubscriptionsPage;
