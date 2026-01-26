
import React from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
   const [stats, setStats] = React.useState({ mrr: 0, activeSubs: 0, totalInspections: 0, totalUsers: 0 });
   const [inspectionStatusStats, setInspectionStatusStats] = React.useState<{ label: string, val: number, color: string }[]>([]);
   const [recentTransactions, setRecentTransactions] = React.useState<any[]>([]);
   const [loading, setLoading] = React.useState(true);

   React.useEffect(() => {
      fetchAdminData();
   }, []);

   const fetchAdminData = async () => {
      try {
         setLoading(true);

         // 1. Basic Stats
         const { count: inspectionsCount } = await supabase.from('inspections').select('*', { count: 'exact', head: true });
         const { count: usersCount } = await supabase.from('broker_profiles').select('*', { count: 'exact', head: true });

         // 2. Active Subs & MRR
         const { data: profiles } = await supabase
            .from('broker_profiles')
            .select('*, planes:subscription_plan_id(price, billing_cycle)');

         let totalMrr = 0;
         let activeSubs = 0;

         profiles?.forEach(p => {
            if (p.subscription_plan_id && p.subscription_status === 'Ativo') {
               activeSubs++;
               const plan = p.planes as any;
               if (plan && plan.price) {
                  const price = parseFloat(plan.price);
                  totalMrr += plan.billing_cycle === 'Anual' ? price / 12 : price;
               }
            }
         });

         // 3. Inspection Status Distribution
         const { data: statusData } = await supabase.from('inspections').select('status');
         const counts: any = { 'Agendada': 0, 'Em andamento': 0, 'Concluída': 0, 'Rascunho': 0 };
         statusData?.forEach(i => {
            if (counts[i.status] !== undefined) counts[i.status]++;
            else if (i.status === 'Pendente') counts['Em andamento']++;
         });

         const totalItems = statusData?.length || 1;
         setInspectionStatusStats([
            { label: 'Agend.', val: Math.round((counts['Agendada'] / totalItems) * 100), color: 'blue' },
            { label: 'Andam.', val: Math.round((counts['Em andamento'] / totalItems) * 100), color: 'amber' },
            { label: 'Concl.', val: Math.round((counts['Concluída'] / totalItems) * 100), color: 'emerald' },
            { label: 'Rasc.', val: Math.round((counts['Rascunho'] / totalItems) * 100), color: 'slate' },
         ]);

         // 4. Recent Transactions (Real Data from payment_history)
         const { data: history } = await supabase
            .from('payment_history')
            .select('*, profiles:user_id(full_name, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(5);

         if (history) {
            setRecentTransactions(history.map(h => ({
               client: h.profiles?.full_name || 'Usuário',
               plan: h.plan_name || 'Plano',
               date: new Date(h.created_at).toLocaleDateString('pt-BR'),
               val: `R$ ${parseFloat(h.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
               status: h.status === 'approved' ? 'Pago' : h.status === 'pending' ? 'Pendente' : h.status,
               img: h.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${h.profiles?.full_name || 'U'}&background=f1f5f9&color=64748b`
            })));
         }

      } catch (err) {
         console.error('Erro no Admin Dashboard:', err);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="space-y-8 animate-in fade-in duration-500">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
               <p className="text-slate-400 font-medium text-sm mt-1">Acompanhe as métricas principais do seu SaaS de vistorias.</p>
            </div>
            <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-black uppercase tracking-wider flex items-center gap-2 border border-emerald-100">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               Sistema Operacional
            </span>
         </div>

         {/* Stats Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
               { label: 'Receita Mensal (MRR)', value: `R$ ${stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, trend: '+12%', icon: 'payments', color: 'blue' },
               { label: 'Assinaturas Ativas', value: stats.activeSubs.toString(), trend: '+5%', icon: 'verified_user', color: 'purple' },
               { label: 'Vistorias Realizadas', value: stats.totalInspections.toString(), trend: '+8%', icon: 'assignment_turned_in', color: 'orange' },
               { label: 'Total de Usuários', value: stats.totalUsers.toString(), trend: '+15%', icon: 'group', color: 'teal' },
            ].map((s, i) => (
               <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                     <div className={`w-10 h-10 bg-${s.color}-50 rounded-xl flex items-center justify-center text-${s.color}-600`}>
                        <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                     </div>
                     <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-green-50 text-green-700">
                        {s.trend}
                     </span>
                  </div>
                  <div>
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                     <p className="text-2xl font-black text-slate-900 mt-1">{s.value}</p>
                  </div>
               </div>
            ))}
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main Chart */}
            <div className="xl:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
               <div className="flex justify-between items-center mb-10">
                  <div>
                     <h3 className="text-lg font-bold text-slate-900">Evolução da Receita</h3>
                     <p className="text-xs text-slate-400 font-medium">Últimos 6 Meses</p>
                  </div>
                  <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-black">+18%</span>
               </div>

               <div className="space-y-4">
                  <p className="text-4xl font-black text-slate-900">R$ {(stats.mrr * 5.8).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                  <div className="h-64 relative mt-8 flex items-end justify-between px-2">
                     <div className="absolute inset-x-0 bottom-0 h-[1px] bg-slate-100"></div>
                     {[40, 30, 55, 45, 70, 85].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                           <div className="relative w-full h-full flex items-end justify-center px-4">
                              <div className="w-3 h-3 bg-blue-600 rounded-full z-10 border-2 border-white shadow-sm transition-all group-hover:scale-150" style={{ marginBottom: `${h}%` }}></div>
                              <div className="absolute bottom-0 w-full bg-blue-50/50 h-[h%] rounded-t-lg group-hover:bg-blue-100/50 transition-colors"></div>
                           </div>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'][i]}
                           </span>
                        </div>
                     ))}
                     <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" viewBox="0 0 600 200">
                        <path d="M50,150 L150,165 L250,120 L350,140 L450,100 L550,60" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                     </svg>
                  </div>
               </div>
            </div>

            {/* Bar Chart Section */}
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
               <h3 className="text-lg font-bold text-slate-900">Status das Vistorias</h3>
               <p className="text-xs text-slate-400 font-medium mb-8">Participação no Total</p>

               <p className="text-4xl font-black text-slate-900 mb-10">{stats.totalInspections}</p>

               <div className="flex-1 flex items-end justify-between gap-4">
                  {inspectionStatusStats.length === 0 ? (
                     <div className="w-full text-center text-[10px] text-slate-300 font-bold uppercase py-10">Calculando...</div>
                  ) : inspectionStatusStats.map((s, i) => (
                     <div key={i} className="flex-1 flex flex-col items-center gap-3">
                        <div className="w-full bg-slate-50 rounded-lg relative overflow-hidden h-40">
                           <div
                              className={`absolute bottom-0 w-full bg-${s.color}-500 rounded-lg opacity-90 transition-all duration-1000`}
                              style={{ height: `${s.val}%` }}
                           ></div>
                        </div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider text-center">{s.label}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Recent Transactions */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Assinaturas Recentes</h3>
                  <button className="text-blue-600 text-xs font-bold hover:underline">Ver todas</button>
               </div>
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     <tr>
                        <th className="px-8 py-4">Cliente</th>
                        <th className="px-8 py-4">Plano</th>
                        <th className="px-8 py-4">Data</th>
                        <th className="px-8 py-4">Valor</th>
                        <th className="px-8 py-4">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {recentTransactions.length === 0 ? (
                        <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 text-xs font-medium">Nenhuma transação recente encontrada.</td></tr>
                     ) : recentTransactions.map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                           <td className="px-8 py-4">
                              <div className="flex items-center gap-3">
                                 <img src={t.img} className="w-8 h-8 rounded-full object-cover" alt="" />
                                 <span className="font-bold text-slate-900">{t.client}</span>
                              </div>
                           </td>
                           <td className="px-8 py-4 text-xs text-slate-500">{t.plan}</td>
                           <td className="px-8 py-4 text-xs text-slate-400">{t.date}</td>
                           <td className="px-8 py-4 font-bold text-slate-900">{t.val}</td>
                           <td className="px-8 py-4">
                              <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full border border-green-100">
                                 {t.status}
                              </span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
               <h3 className="font-bold text-slate-900 px-2">Ações Rápidas</h3>
               <div className="grid grid-cols-2 gap-4">
                  {[
                     { label: 'Novo Usuário', icon: 'person_add', color: 'blue', link: '/settings' },
                     { label: 'Criar Plano', icon: 'add_card', color: 'slate', link: '/admin/plans' },
                     { label: 'Enviar Aviso', icon: 'send', color: 'blue', link: '#' },
                     { label: 'Config LP', icon: 'settings', color: 'slate', link: '/admin/home' },
                  ].map((a, i) => (
                     <button key={i} onClick={() => window.location.href = a.link} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-blue-200 hover:shadow-md transition-all group">
                        <span className={`material-symbols-outlined text-[24px] text-${a.color}-500 group-hover:scale-110 transition-transform`}>
                           {a.icon}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{a.label}</span>
                     </button>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
};

export default AdminDashboard;
