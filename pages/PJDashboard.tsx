import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const PJDashboard: React.FC = () => {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
   const [metrics, setMetrics] = useState({
      inspectionsMonth: 0,
      waitingApproval: 0,
      completed: 0,
      activeBrokers: 0
   });
   const [performanceData, setPerformanceData] = useState<{ name: string, val: number }[]>([]);

   useEffect(() => {
      fetchData();
   }, []);

   const fetchData = async () => {
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         // 1. Get PJ Profile and Company Name
         const { data: profile } = await supabase
            .from('broker_profiles')
            .select('company_name')
            .eq('user_id', user.id)
            .single();

         const company = profile?.company_name || '';

         // 2. Fetch Team Members first
         const { data: teamMembers } = await supabase
            .from('broker_profiles')
            .select('user_id, full_name')
            .eq('company_name', company);

         const userIds = teamMembers?.map(m => m.user_id) || [];

         if (userIds.length === 0) {
            setLoading(false);
            return;
         }

         // 3. Fetch Team Inspections for Metrics using the userIds list
         const { data: teamInspections, error: insError } = await supabase
            .from('inspections')
            .select(`id, status, created_at, user_id`)
            .in('user_id', userIds);

         if (insError) throw insError;

         // Manual Join for the chart (associate full_name from teamMembers)
         const memberMap: Record<string, string> = {};
         teamMembers?.forEach(m => { memberMap[m.user_id] = m.full_name });

         const now = new Date();
         const thisMonth = teamInspections?.filter(i => {
            const d = new Date(i.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
         }) || [];

         const waiting = teamInspections?.filter(i => i.status === 'Pendente' || i.status === 'Agendada') || [];
         const done = teamInspections?.filter(i => i.status === 'Concluída') || [];

         // 3. Performance Chart Data (Group by Broker)
         const performance: Record<string, number> = {};
         teamInspections?.forEach(i => {
            const name = memberMap[i.user_id] || 'Desconhecido';
            performance[name] = (performance[name] || 0) + 1;
         });

         const chartData = Object.entries(performance)
            .map(([name, val]) => ({ name, val }))
            .sort((a, b) => b.val - a.val)
            .slice(0, 5); // Top 5

         // 4. Active Brokers
         const { count: brokersCount } = await supabase
            .from('broker_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('company_name', company)
            .eq('role', 'BROKER')
            .eq('status', 'Ativo');

         setMetrics({
            inspectionsMonth: thisMonth.length,
            waitingApproval: waiting.length,
            completed: done.length,
            activeBrokers: brokersCount || 0
         });

         setPerformanceData(chartData.length > 0 ? chartData : [
            { name: 'Sem dados', val: 0 },
            { name: 'Sem dados', val: 0 },
            { name: 'Sem dados', val: 0 },
         ]);

      } catch (error) {
         console.error('Erro ao carregar dados do dashboard PJ:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleNewUser = () => {
      navigate('/users', { state: { openModal: true } });
   };

   return (
      <div className="space-y-8 animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Visão da Equipe</h1>
               <p className="text-slate-500 mt-1">Acompanhe o desempenho da sua imobiliária em tempo real.</p>
            </div>
            <div className="flex gap-3">
               <button className="h-10 flex items-center gap-2 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  Exportar Relatório
               </button>
               <button onClick={handleNewUser} className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                  Novo Membro
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
               { label: 'Vistorias (Mês)', value: metrics.inspectionsMonth, icon: 'assignment_turned_in', color: 'blue' },
               { label: 'Aguardando Aprovação', value: metrics.waitingApproval, icon: 'hourglass_top', color: 'amber' },
               { label: 'Concluídas', value: metrics.completed, icon: 'check_circle', color: 'emerald' },
               { label: 'Equipe Ativa', value: metrics.activeBrokers, icon: 'badge', color: 'purple' },
            ].map((s, i) => (
               <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{s.label}</p>
                     <div className={`p-2 bg-${s.color}-50 rounded-lg text-${s.color}-600`}>
                        <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                     </div>
                  </div>
                  <div className="flex items-end gap-3">
                     <p className="text-3xl font-black text-slate-900 leading-none">{s.value}</p>
                  </div>
               </div>
            ))}
         </div>

         <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
               <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Top Performance por Corretor</h3>
                  <button className="text-blue-600 text-xs font-bold">Ver Detalhes</button>
               </div>
               <div className="p-8 h-64 flex items-end justify-between gap-6">
                  {performanceData.map((c, i) => (
                     <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className="w-full bg-slate-50 rounded-t-xl relative overflow-hidden h-full">
                           <div className="absolute bottom-0 w-full bg-blue-600/20 group-hover:bg-blue-600 transition-all rounded-t-xl" style={{ height: `${c.val}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase">{c.name}</span>
                     </div>
                  ))}
               </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-[140px]">palette</span>
               </div>
               <div className="relative z-10 space-y-6">
                  <h3 className="text-xl font-bold">Padronização Visual</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Personalize o cabeçalho e rodapé dos laudos com a marca da sua imobiliária para gerar confiança.</p>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20"></div>
                        <div className="h-2 w-24 bg-white/20 rounded"></div>
                     </div>
                     <div className="h-1.5 w-full bg-white/10 rounded mb-2"></div>
                     <div className="h-1.5 w-2/3 bg-white/10 rounded"></div>
                  </div>
                  <button className="w-full py-3 bg-white text-slate-900 rounded-xl font-black text-sm hover:bg-slate-100 transition-all">Editar Identidade Visual</button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default PJDashboard;
