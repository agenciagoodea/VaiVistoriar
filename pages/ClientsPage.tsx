
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ClientsPage: React.FC = () => {
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar perfil para saber cargo e empresa
      const { data: profile } = await supabase
        .from('broker_profiles')
        .select('role, full_name, company_name')
        .eq('user_id', user.id)
        .single();

      const role = profile?.role || 'BROKER';
      const myCompany = (profile?.company_name || (role === 'PJ' ? profile?.full_name : ''))?.trim() || '';
      let query = supabase.from('clients').select('*');

      if (role === 'PJ' && myCompany) {
        // Se for PJ, primeiro buscamos todos os IDs de usuários da mesma empresa
        const { data: companyBrokers } = await supabase
          .from('broker_profiles')
          .select('user_id')
          .eq('company_name', myCompany);

        const brokerIds = companyBrokers?.map(b => b.user_id) || [];
        query = query.in('user_id', brokerIds);
      } else if (role === 'BROKER' || (role === 'PJ' && !myCompany)) {
        // Se for Corretor ou PJ sem empresa definida, vê apenas os seus próprios clientes
        query = query.eq('user_id', user.id);
      }

      const { data: dbData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setClients(dbData || []);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Meus Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie locatários, proprietários e parceiros.</p>
        </div>
        <button
          onClick={() => navigate('/clients/new')}
          className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-bottom border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Nome / Contato</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left text-center">Perfil</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Documento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando clientes...</p>
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <span className="material-symbols-outlined text-4xl">person_off</span>
                      <p className="text-sm font-bold">Nenhum cliente encontrado</p>
                      <p className="text-xs">Comece cadastrando seu primeiro locatário ou proprietário.</p>
                    </div>
                  </td>
                </tr>
              ) : clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-blue-600 flex items-center justify-center font-black text-sm uppercase overflow-hidden border border-slate-100">
                        {client.avatar_url ? (
                          <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          client.name.substring(0, 2)
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-xs">{client.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{client.email || client.phone || 'Sem contato'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${client.profile_type === 'Proprietário' ? 'bg-purple-50 text-purple-600' :
                      client.profile_type === 'Locatário' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                      {client.profile_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs font-semibold">
                    {client.document_number || '--'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate(`/clients/edit/${client.id}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white space-y-4 shadow-xl shadow-blue-200">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-3xl">mail</span>
          </div>
          <div>
            <h3 className="text-xl font-bold">Convide seus Clientes</h3>
            <p className="text-blue-100 text-sm mt-1">Automatize o envio dos laudos e colha assinaturas digitais mais rápido.</p>
          </div>
          <button className="px-6 py-3 bg-white text-blue-700 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-50 transition-all">Enviar Convites</button>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600">
            <span className="material-symbols-outlined text-3xl">cloud_upload</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Importar Clientes</h3>
            <p className="text-slate-400 text-sm mt-1">Já tem uma lista? Importe seus clientes via planilha Excel ou CSV.</p>
          </div>
          <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all">Importar Agora</button>
        </div>
      </div>
    </div>
  );
};

export default ClientsPage;
