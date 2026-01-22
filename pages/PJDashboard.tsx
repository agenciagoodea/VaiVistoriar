
import React from 'react';

const PJDashboard: React.FC = () => {
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
          <button className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Novo Usuário
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Vistorias (Mês)', value: '124', trend: '+12%', icon: 'assignment_turned_in', color: 'blue' },
          { label: 'Aguardando Aprovação', value: '5', trend: '+2%', icon: 'hourglass_top', color: 'amber' },
          { label: 'Concluídas', value: '110', trend: '+15%', icon: 'check_circle', color: 'emerald' },
          { label: 'Corretores Ativos', value: '12', trend: '0%', icon: 'badge', color: 'purple' },
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
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center">
                   <span className="material-symbols-outlined text-[14px]">trending_up</span>
                   {s.trend}
                </span>
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
               {[
                 { name: 'Ana', val: 85 },
                 { name: 'Carlos', val: 65 },
                 { name: 'Bia', val: 45 },
                 { name: 'João', val: 72 },
                 { name: 'Pedro', val: 55 },
               ].map((c, i) => (
                 <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full bg-slate-50 rounded-t-xl relative overflow-hidden h-full">
                       <div className="absolute bottom-0 w-full bg-blue-600/20 group-hover:bg-blue-600 transition-all rounded-t-xl" style={{height: `${c.val}%`}}></div>
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
