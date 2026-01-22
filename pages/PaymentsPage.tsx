
import React from 'react';

const PaymentsPage: React.FC = () => {
  const txs = [
    { id: '#TR-8832', client: 'Imobiliária Silva', plan: 'Premium Anual', val: 'R$ 2.400,00', method: 'Cartão 4242', status: 'Pago' },
    { id: '#TR-8831', client: 'Construtora Block', plan: 'Enterprise', val: 'R$ 5.990,00', method: 'Boleto', status: 'Pago' },
    { id: '#TR-8830', client: 'Carlos Corretor', plan: 'Básico Mensal', val: 'R$ 199,00', method: 'Pix', status: 'Pendente' },
    { id: '#TR-8829', client: 'Imóveis Norte', plan: 'Premium Mensal', val: 'R$ 350,00', method: 'Cartão 1092', status: 'Falha' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financeiro</h1>
        <p className="text-slate-500 mt-1">Histórico completo de transações e faturas de clientes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Arrecadado', val: 'R$ 125.400', trend: '+12%', color: 'green' },
          { label: 'Pendente', val: 'R$ 12.350', trend: '42 faturas', color: 'orange' },
          { label: 'Inadimplência', val: 'R$ 2.450', trend: '2.1%', color: 'red' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
             <p className={`text-2xl font-black text-slate-900`}>{s.val}</p>
             <p className={`text-[10px] font-bold text-${s.color}-600 mt-2 uppercase`}>{s.trend}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
           <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Transação</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {txs.map((t, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-6 py-4 text-xs font-bold text-slate-500">{t.id}</td>
                   <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{t.client}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{t.plan}</p>
                   </td>
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase">
                         <span className="material-symbols-outlined text-[16px]">credit_card</span>
                         {t.method}
                      </div>
                   </td>
                   <td className="px-6 py-4 text-right font-black text-slate-900">{t.val}</td>
                   <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        t.status === 'Pago' ? 'bg-green-50 text-green-700' :
                        t.status === 'Pendente' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                      }`}>
                         {t.status}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">description</span></button>
                   </td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsPage;
