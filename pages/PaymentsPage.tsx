
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const PaymentsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    activeCount: 0
  });

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        // Admin Function Call for REAL system-wide payments
        const { data: result, error } = await supabase.functions.invoke('admin-dash', {
          body: { action: 'get_payments' }
        });

        if (error) throw error;
        const history = result?.payments || [];

        if (history) {
          let totalVal = 0;
          let pendingCount = 0;

          const mapped = history.map((h: any) => {
            const price = parseFloat(h.amount || 0);
            if (h.status === 'approved') totalVal += price;
            if (h.status === 'pending') pendingCount++;

            return {
              id: `#TR-${h.id.slice(0, 4)}`,
              client: h.profiles?.full_name || h.profiles?.email || 'Usuário',
              plan: h.plan_name || 'Plano',
              val: `R$ ${price.toFixed(price % 1 === 0 ? 0 : 2).replace('.', ',')}`,
              method: 'Mercado Pago',
              status: h.status === 'approved' ? 'Pago' : h.status === 'pending' ? 'Pendente' : h.status
            };
          });

          setTxs(mapped);
          setStats({
            total: totalVal,
            pending: pendingCount,
            activeCount: history.length
          });
        }
      } catch (err) {
        console.error('Erro no financeiro:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20">
      <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financeiro</h1>
        <p className="text-slate-500 mt-1">Histórico de transações e assinaturas de clientes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Arrecadado (Ativo)</p>
          <p className="text-2xl font-black text-slate-900">R$ {stats.total.toFixed(2).replace('.', ',')}</p>
          <p className="text-[10px] font-bold text-green-600 mt-2 uppercase">Baseado em Planos Ativos</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aguardando Pagamento</p>
          <p className="text-2xl font-black text-slate-900">{stats.pending}</p>
          <p className="text-[10px] font-bold text-orange-600 mt-2 uppercase">Transações Pendentes</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total de Clientes</p>
          <p className="text-2xl font-black text-slate-900">{stats.activeCount}</p>
          <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase">Base Geral</p>
        </div>
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
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    {t.method}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-black text-slate-900">{t.val}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${t.status === 'Ativo' || t.status === 'Ativa' ? 'bg-green-50 text-green-700' :
                    t.status === 'Pendente' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {t.status}
                  </span>
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
