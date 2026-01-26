
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface DashboardLayoutProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, setRole }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const adminMenu = [
    { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
    { label: 'Usuários (PF/PJ)', path: '/users', icon: 'group' },
    { label: 'Assinaturas', path: '/subscriptions', icon: 'credit_card' },
    { label: 'Pagamentos', path: '/payments', icon: 'payments' },
    { label: 'Relatórios', path: '/reports', icon: 'bar_chart' },
  ];

  const configSubMenu = [
    { label: 'Home', path: '/admin/home', icon: 'home' },
    { label: 'Políticas e Termos', path: '/admin/policies', icon: 'gavel' },
    { label: 'Checkout Pagamento', path: '/admin/checkout', icon: 'shopping_cart_checkout' },
    { label: 'Planos', path: '/admin/plans', icon: 'format_list_bulleted' },
    { label: 'Configuração de E-mail', path: '/admin/email', icon: 'mail' },
  ];

  const brokerMenu = [
    { label: 'Dashboard', path: '/broker', icon: 'dashboard' },
    { label: 'Plano', path: '/broker/plan', icon: 'credit_card' },
    { label: 'Minhas Vistorias', path: '/inspections', icon: 'assignment' },
    { label: 'Meus Imóveis', path: '/properties', icon: 'apartment' },
    { label: 'Clientes', path: '/clients', icon: 'groups' },
    { label: 'Configurações', path: '/settings', icon: 'settings' },
  ];

  const pjMenu = [
    { label: 'Dashboard', path: '/pj', icon: 'dashboard' },
    { label: 'Vistorias da Equipe', path: '/inspections', icon: 'assignment' },
    { label: 'Equipe', path: '/users', icon: 'group' },
    { label: 'Configurações', path: '/settings', icon: 'settings' },
  ];

  const [isConfigOpen, setIsConfigOpen] = useState(location.pathname.startsWith('/admin/'));
  const currentMenu = role === 'ADMIN' ? adminMenu : role === 'BROKER' ? brokerMenu : pjMenu;

  const [brand, setBrand] = useState({ primaryColor: '#2563eb', logoUrl: '' });
  const [userProfile, setUserProfile] = React.useState<{ full_name: string; avatar_url: string; email: string } | null>(null);

  React.useEffect(() => {
    const fetchConfigs = async () => {
      const { data } = await supabase.from('system_configs').select('*');
      if (data) {
        const primary = data.find(c => c.key === 'home_primary_color')?.value;
        const logo = data.find(c => c.key === 'home_logo_url')?.value;
        if (primary || logo) setBrand({ primaryColor: primary || '#2563eb', logoUrl: logo || '' });
      }
    };
    fetchConfigs();
  }, []);

  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('broker_profiles').select('*').eq('user_id', user.id).single();

        // Controle de Sessão Única
        const localSessionId = localStorage.getItem('vpro_session_token');
        if (profile?.current_session_id && localSessionId && profile.current_session_id !== localSessionId) {
          alert('Sua conta foi acessada em outro dispositivo. Você será deslogado por segurança.');
          await supabase.auth.signOut();
          navigate('/login');
          return;
        }

        // Verificação de Expiração do Plano Trial
        if (profile?.subscription_expires_at) {
          const expiresAt = new Date(profile.subscription_expires_at);
          if (expiresAt < new Date()) {
            alert('Seu plano expirou. Por favor, realize o upgrade para continuar utilizando o sistema.');
          }
        }

        setUserProfile({
          full_name: profile?.full_name || user.email?.split('@')[0] || 'Usuário',
          avatar_url: profile?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=0D8ABC&color=fff`,
          email: user.email || ''
        });
      }
    };
    fetchUser();
  }, [navigate]);

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 overflow-hidden font-['Inter']">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0">
        <div className="h-20 flex items-center px-6">
          <div className="flex items-center gap-3">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} className="h-8 w-auto object-contain" alt="Logo" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: brand.primaryColor }}>
                <span className="material-symbols-outlined font-bold text-2xl">home_app_logo</span>
              </div>
            )}
            <div>
              <span className="font-extrabold text-[15px] text-slate-900 block leading-tight">VistoriaPro</span>
              <span className="text-[11px] text-slate-400 font-medium">{role === 'ADMIN' ? 'Super Admin' : 'Painel'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 py-4 px-4 space-y-8 overflow-y-auto">
          <nav className="space-y-1">
            {currentMenu.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${isActive(item.path)
                  ? 'bg-opacity-10'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                style={{
                  backgroundColor: isActive(item.path) ? `${brand.primaryColor}15` : undefined,
                  color: isActive(item.path) ? brand.primaryColor : undefined
                }}
              >
                <span className={`material-symbols-outlined text-[22px] ${isActive(item.path) ? 'fill-icon' : ''}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}

            {role === 'ADMIN' && (
              <div className="space-y-1">
                <button
                  onClick={() => setIsConfigOpen(!isConfigOpen)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all font-semibold text-sm ${isConfigOpen || location.pathname.startsWith('/admin/') ? '' : 'text-slate-500 hover:bg-slate-50'}`}
                  style={{ color: (isConfigOpen || location.pathname.startsWith('/admin/')) ? brand.primaryColor : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[22px]">settings</span>
                    Configurações
                  </div>
                  <span className={`material-symbols-outlined transition-transform duration-300 ${isConfigOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {isConfigOpen && (
                  <div className="pl-9 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-300">
                    {configSubMenu.map((sub) => (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        className={`block py-2 text-xs font-bold transition-all ${isActive(sub.path) ? '' : 'text-slate-400 hover:text-slate-900'}`}
                        style={{ color: isActive(sub.path) ? brand.primaryColor : undefined }}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="pt-6 border-t border-slate-100">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Trocar Visão</p>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => { setRole('ADMIN'); navigate('/admin'); }} className={`text-xs p-2 rounded-lg text-left ${role === 'ADMIN' ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}`}>Admin View</button>
              <button onClick={() => { setRole('BROKER'); navigate('/broker'); }} className={`text-xs p-2 rounded-lg text-left ${role === 'BROKER' ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}`}>Broker View</button>
              <button onClick={() => { setRole('PJ'); navigate('/pj'); }} className={`text-xs p-2 rounded-lg text-left ${role === 'PJ' ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}`}>PJ View</button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/');
            }}
            className="flex items-center gap-3 px-3 py-2 w-full text-sm font-bold text-slate-500 hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-20">
          <div className="flex items-center gap-8 flex-1 max-w-2xl">
            <h2 className="text-xl font-bold text-slate-900 whitespace-nowrap">
              {isActive('/admin') && 'Visão Geral'}
              {isActive('/admin/plans') && 'Gestão de Ofertas'}
              {isActive('/admin/email') && 'Configuração de E-mail'}
              {isActive('/admin/home') && 'Editor Visual'}
              {isActive('/admin/policies') && 'Políticas e Termos'}
              {isActive('/admin/checkout') && 'Checkout e Pagamento'}
              {isActive('/inspections') && 'Vistorias'}
              {isActive('/inspections/edit') && 'Ajustar Vistoria'}
              {isActive('/inspections/view') && 'Prévia do Laudo'}
              {isActive('/properties') && 'Meus Imóveis'}
              {isActive('/properties/edit') && 'Modificar Imóvel'}
              {isActive('/properties/new') && 'Novo Cadastro'}
              {isActive('/clients') && 'Gestão de Clientes'}
              {isActive('/clients/new') && 'Novo Cliente'}
              {isActive('/clients/edit') && 'Modificar Dados'}
              {isActive('/users') && 'Membros'}
              {isActive('/settings') && 'Configurações'}
            </h2>
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">search</span>
              <input
                type="text"
                placeholder="Buscar usuário, imobiliária ou fatura..."
                className="pl-10 pr-4 py-2.5 bg-[#F1F5F9] border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center gap-3 pl-4 border-l border-slate-100 cursor-pointer group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-[13px] font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{userProfile?.full_name}</p>
                <p className="text-[10px] font-semibold text-slate-400">{userProfile?.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                <img src={userProfile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
