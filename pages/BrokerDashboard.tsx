import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Inspection } from '../types';
import FeedbackModal from '../components/FeedbackModal';

const BrokerDashboard: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [stats, setStats] = useState({ monthCount: 0, pendingCount: 0, propertiesCount: 0, brokersCount: 0 });
  const [planUsage, setPlanUsage] = useState({
    name: 'Plano Trial',
    current: 0,
    max: 0,
    expiry: '',
    maxPhotos: 0,
    maxBrokers: 0,
    maxRooms: 0,
    maxProperties: 0,
    type: 'PF',
    isLimitReached: false
  });
  const [userProfile, setUserProfile] = useState<{ full_name: string, role: string, company_name?: string } | null>(null);
  const [whatsappSupport, setWhatsappSupport] = useState('');
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
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
        if (profile.subscription_expires_at) {
          const expiresAt = new Date(profile.subscription_expires_at);
          const diff = expiresAt.getTime() - new Date().getTime();
          setDaysRemaining(Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

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
          maxRooms: plan?.max_rooms || 0,
          maxProperties: plan?.max_properties || 0,
          type: plan?.plan_type || 'PF',
          isLimitReached: false // Updated below
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

      setPlanUsage(prev => {
        const isReached = (prev.max > 0 && (monthCount || 0) >= prev.max) ||
          (prev.maxProperties > 0 && (propertiesCount || 0) >= prev.maxProperties);
        return { ...prev, current: monthCount || 0, isLimitReached: isReached };
      });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {daysRemaining !== null && daysRemaining <= 5 && (
        <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-[32px] text-white shadow-xl shadow-amber-200 flex flex-col md:flex-row items-center justify-between gap-6 transform hover:scale-[1.01] transition-all">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl font-bold">assignment_late</span>
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Renove seu plano!</h3>
              <p className="text-white/80 text-sm font-bold">Sua assinatura vence em {daysRemaining > 0 ? `${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}` : 'menos de 24 horas'}. Não perca o acesso.</p>
            </div>
          </div>
          <Link to="/broker/plan" className="px-10 py-4 bg-white text-orange-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-slate-50 transition-all active:scale-95">
            Renovar Agora
          </Link>
        </div>
      )}

      {planUsage.isLimitReached && (
        <div className="p-6 bg-gradient-to-r from-rose-600 to-red-700 rounded-[32px] text-white shadow-xl shadow-red-200 flex flex-col md:flex-row items-center justify-between gap-6 transform hover:scale-[1.01] transition-all border-none">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl font-bold">rocket_launch</span>
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Limite Atingido!</h3>
              <p className="text-white/80 text-sm font-bold">Você atingiu 100% do limite do seu plano. Faça um upgrade agora para continuar crescendo.</p>
            </div>
          </div>
          <Link to="/broker/plan" className="px-10 py-4 bg-white text-red-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-slate-50 transition-all active:scale-95">
            Fazer Upgrade
          </Link>
        </div>
      )}

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
        <Link to="/inspections" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 hover:border-blue-200 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined">assignment</span>
            </div>
            <span className="text-[10px] font-black px-2 py-1 bg-green-50 text-green-700 rounded-full">ESTE MÊS</span>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.monthCount}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Vistorias Realizadas</p>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <span className="text-[10px] font-black px-2 py-1 bg-amber-50 text-amber-700 rounded-full">PENDENTES</span>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.pendingCount}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Laudos em Aberto</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <span className="material-symbols-outlined">home_work</span>
            </div>
            <span className="text-[10px] font-black px-2 py-1 bg-purple-50 text-purple-700 rounded-full">IMÓVEIS</span>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.propertiesCount}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Imóveis Ativos</p>
          </div>
        </div>

        {userProfile?.role === 'PJ' ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <span className="material-symbols-outlined">badge</span>
              </div>
              <span className="text-[10px] font-black px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">EQUIPE</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stats.brokersCount}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Corretores Ativos</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
              <span className="text-[10px] font-black px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">PLANO</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{planUsage.name}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Expira em: {planUsage.expiry}</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Vistorias Recentes</h3>
          <Link to="/inspections" className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">Ver Todas</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {inspections.map((inspection) => (
            <div key={inspection.id} onClick={() => navigate(`/inspections/edit/${inspection.id}`)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer flex items-center gap-4 group">
              <img src={inspection.image} className="w-16 h-16 rounded-xl object-cover" alt={inspection.property} />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 truncate">{inspection.property}</h4>
                <p className="text-xs text-slate-500 truncate">{inspection.address}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">{inspection.type}</span>
                  <span className="text-[10px] font-bold text-slate-400">{inspection.date}</span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${inspection.status === 'Concluída' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                }`}>
                {inspection.status}
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600 transition-colors">chevron_right</span>
            </div>
          ))}
          {inspections.length === 0 && (
            <div className="col-span-full bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[32px] p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-slate-200">
                <span className="material-symbols-outlined text-3xl">assignment_add</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Nenhuma vistoria ainda</h4>
                <p className="text-sm text-slate-500 max-w-[200px] mx-auto">Comece agora criando sua primeira vistoria profissional.</p>
              </div>
              <Link to="/inspections/new" className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all">
                Nova Vistoria
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Uso do Plano */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status Mensal</p>
                <h4 className="text-xl font-black text-slate-900 mt-1">{planUsage.current} / {planUsage.max}</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{planUsage.name}</span>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-blue-600 transition-all duration-1000"
                style={{ width: `${Math.min((planUsage.current / planUsage.max) * 100, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[8px] font-black text-slate-400 uppercase">Max Fotos</p>
                <p className="text-sm font-black text-slate-900">{planUsage.maxPhotos}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[8px] font-black text-slate-400 uppercase">Max Cômodos</p>
                <p className="text-sm font-black text-slate-900">{planUsage.maxRooms || '--'}</p>
              </div>
            </div>
          </div>
          <Link to="/broker/plan" className="w-full h-12 flex items-center justify-center bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
            Atualizar Plano
          </Link>
        </div>

        {/* Avaliação */}
        <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-xl shadow-slate-200 flex flex-col justify-between relative overflow-hidden group min-h-[240px]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 space-y-3">
            <span className="material-symbols-outlined text-4xl text-amber-500">star</span>
            <h4 className="text-lg font-black leading-tight">Avaliação</h4>
            <p className="text-white/80 text-[10px] font-medium leading-relaxed">Sua opinião é fundamental para evoluirmos o VaiVistoriar.</p>
          </div>
          <button
            onClick={() => setShowFeedback(true)}
            className="relative z-10 w-full py-4 bg-white/10 text-white border border-white/20 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white/20 transition-all shadow-sm"
          >
            Dar meu feedback
          </button>
        </div>

        {/* Suporte Técnico */}
        <div className="bg-blue-600 p-8 rounded-[32px] text-white shadow-xl shadow-blue-50 flex flex-col justify-between relative overflow-hidden group min-h-[240px]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 space-y-3">
            <span className="material-symbols-outlined text-4xl">support_agent</span>
            <h4 className="text-lg font-black leading-tight">Suporte Técnico</h4>
            <p className="text-white/80 text-[10px] font-medium leading-relaxed">Nosso time está pronto para te ajudar com qualquer dúvida.</p>
          </div>
          <button
            onClick={() => window.open(`https://wa.me/${whatsappSupport.replace(/\D/g, '')}`, '_blank')}
            className="relative z-10 w-full py-4 bg-white text-blue-600 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-blue-700/20 hover:bg-slate-50 transition-all"
          >
            Chamar no WhatsApp
          </button>
        </div>
      </div>

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        userEmail={userProfile?.company_name || ''}
      />
    </div>
  );
};

export default BrokerDashboard;
