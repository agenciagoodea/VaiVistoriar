
import React from 'react';

const SubscriptionsPage: React.FC = () => {
  const subs = [
    { client: 'Imobiliária Silva', plan: 'Premium Anual', price: 'R$ 2.400,00 / ano', status: 'Ativa', renewal: '10 Jan, 2025' },
    { client: 'Construtora Block', plan: 'Enterprise', price: 'R$ 5.990,00 / mês', status: 'Ativa', renewal: '01 Jul, 2024' },
    { client: 'Carlos Corretor', plan: 'Básico Mensal', price: 'R$ 199,00 / mês', status: 'Pendente', renewal: '15 Jun, 2024' },
    { client: 'Imóveis Norte', plan: 'Premium Mensal', price: 'R$ 350,00 / mês', status: 'Cancelada', renewal: '-' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Assinaturas</h1>
          <p className="text-slate-500 mt-1">Planos, renovações e status das contas.</p>
        </div>
        <button className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nova Assinatura
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
           <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Próxima Renovação</th>
                <th className="px-6 py-4"></th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {subs.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px]">
                            {s.client.split(' ').map(n => n[0]).join('')}
                         </div>
                         <div>
                            <p className="font-bold text-slate-900">{s.client}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Cadastrado há 1 ano</p>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4">
                      <p className="font-bold text-slate-700">{s.plan}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{s.price}</p>
                   </td>
                   <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        s.status === 'Ativa' ? 'bg-green-50 text-green-700' :
                        s.status === 'Pendente' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                      }`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'Ativa' ? 'bg-green-600' : s.status === 'Pendente' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                         {s.status}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-slate-500 text-xs font-bold">{s.renewal}</td>
                   <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">edit_square</span></button>
                   </td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubscriptionsPage;
