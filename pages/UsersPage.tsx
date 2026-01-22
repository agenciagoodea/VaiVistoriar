
import React from 'react';

const UsersPage: React.FC = () => {
  const users = [
    { name: 'Imobiliária Silva', email: 'contato@imobsilva.com.br', role: 'PJ', status: 'Ativo', access: 'Hoje, 09:30' },
    { name: 'Carlos Corretor', email: 'carlos.vendas@email.com', role: 'PF', status: 'Ativo', access: 'Ontem, 18:45' },
    { name: 'Construtora Block', email: 'financeiro@block.com.br', role: 'PJ', status: 'Inativo', access: '12 Jun, 2024' },
    { name: 'Ana Arquitetura', email: 'ana@arquitetura.com', role: 'PF', status: 'Pendente', access: '--' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Usuários Cadastrados</h1>
          <p className="text-slate-500 mt-1">Gerencie o acesso de corretores, imobiliárias e construtoras.</p>
        </div>
        <button className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Adicionar Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
           <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Usuário / Empresa</th>
                <th className="px-6 py-4 text-center">Tipo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Último Acesso</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {users.map((u, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                   <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-[10px] text-slate-500">
                            {u.name.split(' ').map(n => n[0]).join('')}
                         </div>
                         <div>
                            <p className="font-bold text-slate-900">{u.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                         </div>
                      </div>
                   </td>
                   <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${u.role === 'PJ' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                         {u.role}
                      </span>
                   </td>
                   <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        u.status === 'Ativo' ? 'bg-green-50 text-green-700' :
                        u.status === 'Inativo' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                         {u.status}
                      </span>
                   </td>
                   <td className="px-6 py-4 text-slate-500 text-xs font-medium">{u.access}</td>
                   <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                        <button className="p-2 text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                      </div>
                   </td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersPage;
