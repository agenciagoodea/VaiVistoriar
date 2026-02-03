import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Inspection } from '../types';
import FeedbackModal from '../components/FeedbackModal';

const BrokerDashboard: React.FC = () => {
  const [inspections, setInspections] = React.useState<Inspection[]>([]);
  const [stats, setStats] = React.useState({ monthCount: 0, pendingCount: 0, propertiesCount: 0, brokersCount: 0 });
  const [planUsage, setPlanUsage] = React.useState({
    name: 'Plano Trial',
    current: 0,
    max: 0,
    expiry: '',
    maxPhotos: 0,
    maxBrokers: 0,
    type: 'PF'
  });
  const [userProfile, setUserProfile] = React.useState<{ full_name: string, role: string, company_name?: string } | null>(null);
  const [whatsappSupport, setWhatsappSupport] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 0. Fetch System Configs (Support Number)
      const { data: configs } = await supabase.from('system_configs').select('*').in('key', ['whatsapp_number']);
      if (configs) {
        const num = configs.find(c => c.key === 'whatsapp_number')?.value;
        setWhatsappSupport(num || '');
      }

      // 1. Profile & Plan
      const { data: profile } = await supabase
        .from('broker_profiles')
        .select('*, plans:subscription_plan_id(*)')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserProfile({
          full_name: profile.full_name || user.email?.split('@')[0],
          role: profile.role,
          company_name: profile.company_name
        });

        const plan = profile.plans as any;
        setPlanUsage({
          name: plan?.name || 'Plano Grátis',
          current: 0, // Will be updated
          max: plan?.max_inspections || 5,
          expiry: profile.subscription_expires_at ? new Date(profile.subscription_expires_at).toLocaleDateString('pt-BR') : 'Sem expiração',
          maxPhotos: plan?.max_photos || 30,
          maxBrokers: plan?.max_brokers || 0,
          type: plan?.plan_type || 'PF'
        });
      }

      // 2. Monthly Stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthCount } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      const { count: pendingCount } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'Concluída');

      const { count: propertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 2.1 Brokers Count (If PJ)
      let brokersCount = 0;
      const company = (profile?.company_name || profile?.full_name || '').trim();
      if (profile?.role === 'PJ' && company) {
        const { count } = await supabase
          .from('broker_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_name', company)
          .eq('status', 'Ativo');
        brokersCount = count || 0;
      }

      setStats({
        monthCount: monthCount || 0,
        pendingCount: pendingCount || 0,
        propertiesCount: propertiesCount || 0,
        brokersCount
      });

      setPlanUsage(prev => ({ ...prev, current: monthCount || 0 }));

      // 3. Recent Inspections
      const { data: dbData } = await supabase
        .from('inspections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (dbData) {
        const formattedData: Inspection[] = dbData.map((item: any) => ({
          id: item.id,
          property: item.property_name,
          address: item.address,
          client: item.client_name,
          type: item.type,
          date: new Date(item.created_at).toLocaleDateString('pt-BR'),
          status: item.status,
          image: item.image_url || `https://ui-avatars.com/api/?name=${item.property_name}&background=f1f5f9&color=64748b`
        }));
        setInspections(formattedData);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Olá, {userProfile?.full_name.split(' ')[0] || 'Bem-vindo'}</h1>
          <p className="text-slate-500 mt-1">Aqui está o resumo das suas atividades hoje.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/inspections/new" className="h-10 flex items-center gap-2 px-6 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Nova Vistoria
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <span className="material-symbols-outlined">assignment</span>
            </div>
            <span className="text-[10px] font-black px-2 py-1 bg-green-50 text-green-700 rounded-full">ESTE MÊS</span>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.monthCount}</p>
            <p className="text-sm text-slate-500 font-medium">Vistorias Realizadas</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <span className="text-[10px] font-black px-2 py-1 bg-orange-50 text-orange-700 rounded-full">PENDENTES</span>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.pendingCount}</p>
            <p className="text-sm text-slate-500 font-medium">Laudos Finalizando</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <span className="material-symbols-outlined">apartment</span>
            </div>
            <span className="text-[10px] font-black px-2 py-1 bg-purple-50 text-purple-700 rounded-full">CATÁLOGO</span>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.propertiesCount}</p>
            <p className="text-sm text-slate-500 font-medium">Imóveis Ativos</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined">data_usage</span>
            </div>
            <button
              onClick={() => navigate('/broker/plan')}
              className="text-[10px] font-black uppercase text-blue-600 tracking-widest hover:underline"
            >
              Gerenciar
            </button>
          </div>
          <div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano Atual</p>
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{planUsage.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-blue-600">{planUsage.current}</span>
                <span className="text-xs text-slate-400 font-bold">/{planUsage.max}</span>
              </div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((planUsage.current / planUsage.max) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-50">
              <div className="text-[9px] font-bold text-slate-400">
                <p className="uppercase tracking-tighter">Fotos/Vistoria</p>
                <p className="text-slate-900 font-black">{planUsage.maxPhotos}</p>
              </div>
              {planUsage.type === 'PJ' && (
                <div className="text-[9px] font-bold text-slate-400">
                  <p className="uppercase tracking-tighter">Corretores</p>
                  <p className="text-slate-900 font-black">{stats.brokersCount}/{planUsage.maxBrokers}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Vistorias Recentes</h3>
            <Link to="/inspections" className="text-sm font-bold text-blue-600 flex items-center gap-1">Ver todas <span className="material-symbols-outlined text-[16px]">arrow_forward</span></Link>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-4">Imóvel</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carregando...</p>
                      </div>
                    </td>
                  </tr>
                ) : inspections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs font-medium">Nenhuma vistoria recente encontrada.</td>
                  </tr>
                ) : inspections.map((item) => (
                  <tr key={item.id} onClick={() => navigate(`/inspections`)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={item.image} alt="" className="w-10 h-10 rounded-lg bg-slate-200 object-cover" />
                        <div>
                          <p className="font-bold text-slate-900">{item.property}</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{item.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.type === 'Entrada' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{item.type}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs font-medium">{item.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Concluída' ? 'bg-green-50 text-green-700' :
                        item.status === 'Rascunho' ? 'bg-slate-100 text-slate-500' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Concluída' ? 'bg-green-600' :
                          item.status === 'Rascunho' ? 'bg-slate-400' : 'bg-yellow-500'
                          }`}></span>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-[100px]">verified</span>
              </div>
              <h4 className="font-bold text-lg relative z-10">Meu Plano Atual</h4>
              <p className="text-blue-200 text-xs font-medium relative z-10 uppercase tracking-wider">{planUsage.name}</p>
              <div className="mt-4 relative z-10">
                <p className="text-[10px] uppercase text-slate-400 font-bold">Expira em</p>
                <p className="font-bold">{planUsage.expiry}</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-medium">Vistorias</span>
                  <span className={`font-bold ${planUsage.current >= planUsage.max ? 'text-red-600' : 'text-slate-900'}`}>
                    {planUsage.current} / {planUsage.max}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${planUsage.current >= planUsage.max ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min((planUsage.current / planUsage.max) * 100, 100)}%` }}></div>
                </div>

                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-50">
                  <span className="text-slate-600 font-medium">Fotos p/ Vistoria</span>
                  <span className="font-bold text-slate-900">{planUsage.maxPhotos}</span>
                </div>

                {planUsage.type === 'PJ' && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-50">
                    <span className="text-slate-600 font-medium">Corretores</span>
                    <span className="font-bold text-slate-900">{stats.brokersCount} / {planUsage.maxBrokers}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/broker/plan')}
                  className="w-full py-2.5 rounded-lg border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">upgrade</span>
                  Gerenciar Plano
                </button>
              </div>
            </div>
          </div>

          {/* Feedback & Support Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-xl shadow-lg p-6 text-white text-center space-y-4">
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

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Avisos Recentes</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Novo modelo de vistoria</p>
                  <p className="text-xs text-slate-500 mt-1">Templates para vistorias de saída atualizados.</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Agora mesmo</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0 mt-1.5"></div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Manutenção Concluída</p>
                  <p className="text-xs text-slate-500 mt-1">Estabilidade do sistema 100% restabelecida.</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Ontem</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
};

export default BrokerDashboard;
