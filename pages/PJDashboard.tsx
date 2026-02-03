import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

import FeedbackModal from '../components/FeedbackModal';

const PJDashboard: React.FC = () => {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(true);
   const [metrics, setMetrics] = useState({
      inspectionsMonth: 0,
      waitingApproval: 0,
      completed: 0,
      activeBrokers: 0
   });
   const [userProfile, setUserProfile] = useState<{ full_name: string, company_name?: string } | null>(null);
   const [planUsage, setPlanUsage] = useState({
      name: 'Plano Grátis',
      current: 0,
      max: 5,
      maxBrokers: 0,
      expiry: ''
   });
   const [whatsappSupport, setWhatsappSupport] = useState('');
   const [showFeedback, setShowFeedback] = useState(false);
   const [performanceData, setPerformanceData] = useState<{ name: string, val: number }[]>([]);

   useEffect(() => {
      fetchData();
   }, []);

   const fetchData = async () => {
      try {
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;

         // 0. Fetch Support Number
         const { data: configs } = await supabase.from('system_configs').select('*').in('key', ['whatsapp_number']);
         if (configs) {
            setWhatsappSupport(configs.find(c => c.key === 'whatsapp_number')?.value || '');
         }

         // 1. Get PJ Profile and Company Name
         const { data: profile } = await supabase
            .from('broker_profiles')
            .select('*, plans:subscription_plan_id(*)')
            .eq('user_id', user.id)
            .single();

         if (profile) {
            setUserProfile({
               full_name: profile.full_name || user.email?.split('@')[0],
               company_name: profile.company_name
            });
         }

         // Fallback: If company_name is empty, use full_name (which is often the company name for PJ)
         const company = (profile?.company_name || profile?.full_name || '').trim();
         const plan = profile?.plans as any;

         setPlanUsage({
            name: plan?.name || 'Plano Trial',
            current: 0, // Updated below
            max: plan?.max_inspections || 5,
            maxBrokers: plan?.max_brokers || 0,
            expiry: profile?.subscription_expires_at ? new Date(profile.subscription_expires_at).toLocaleDateString('pt-BR') : 'Sem expiração'
         });

         // 2. Fetch Team Members
         let userIds: string[] = [user.id];
         let teamMembers: any[] = [{ user_id: user.id, full_name: profile?.full_name || 'Eu' }];

         if (company) {
            const { data: members } = await supabase
               .from('broker_profiles')
               .select('user_id, full_name')
               .eq('company_name', company);

            if (members && members.length > 0) {
               teamMembers = members;
               userIds = members.map(m => m.user_id);
               if (!userIds.includes(user.id)) {
                  userIds.push(user.id);
               }
            }
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
         let brokersCount = 0;
         if (company) {
            const { count } = await supabase
               .from('broker_profiles')
               .select('*', { count: 'exact', head: true })
               .eq('company_name', company)
               .eq('role', 'BROKER')
               .eq('status', 'Ativo');
            brokersCount = count || 0;
         }

         setMetrics({
            inspectionsMonth: thisMonth.length,
            waitingApproval: waiting.length,
            completed: done.length,
            activeBrokers: brokersCount || 0
         });

         setPlanUsage(prev => ({ ...prev, current: thisMonth.length }));

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
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  {userProfile?.company_name || userProfile?.full_name || 'Visão da Equipe'}
               </h1>
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

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

            {/* Plan Usage Card */}
            <div className="bg-slate-900 p-6 rounded-xl shadow-xl flex flex-col justify-between group">
               <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-white/10 rounded-lg text-white">
                     <span className="material-symbols-outlined">data_usage</span>
                  </div>
                  <button onClick={() => navigate('/broker/plan')} className="text-[10px] font-black uppercase text-blue-400 tracking-widest hover:text-blue-300">Meu Plano</button>
               </div>
               <div>
                  <div className="flex justify-between items-end mb-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{planUsage.name}</p>
                     <div className="text-right">
                        <span className="text-sm font-black text-white">{planUsage.current}</span>
                        <span className="text-xs text-slate-500 font-bold">/{planUsage.max}</span>
                     </div>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                     <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((planUsage.current / planUsage.max) * 100, 100)}%` }}
                     ></div>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2 font-medium uppercase tracking-tight">
                     Limite de Corretores: <span className="text-slate-300 font-bold">{metrics.activeBrokers}/{planUsage.maxBrokers}</span>
                  </p>
               </div>
            </div>
         </div>

         <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
            </div>

            <div className="space-y-6">
               {/* Feedback & Support Card */}
               <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-2xl shadow-lg p-6 text-white text-center space-y-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                     <span className="material-symbols-outlined text-[24px] text-yellow-400">star</span>
                  </div>
                  <div>
                     <h3 className="font-bold text-lg">Sua opinião importa!</h3>
                     <p className="text-blue-200 text-xs mt-1">Ajude-nos a evoluir o sistema avaliando sua experiência.</p>
                  </div>
                  <div className="flex gap-2 justify-center">
                     <button
                        onClick={() => setShowFeedback(true)}
                        className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-blue-900 rounded-lg text-xs font-black transition-colors flex items-center justify-center gap-1"
                     >
                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                        Avaliar
                     </button>
                     <button
                        onClick={() => {
                           const num = whatsappSupport || '5511999999999';
                           window.open(`https://wa.me/${num.replace(/\D/g, '')}`, '_blank');
                        }}
                        className="flex-1 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg text-xs font-black transition-colors flex items-center justify-center gap-1"
                     >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                        Suporte
                     </button>
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
         <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      </div>
   );
};

export default PJDashboard;
