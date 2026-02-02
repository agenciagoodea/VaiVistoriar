
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import ReviewModal from './ReviewModal';

interface DashboardLayoutProps {
  role: UserRole;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role }) => {
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
    { label: '1. Configurações Globais', path: '/admin/global', icon: 'settings' },
    { label: '2. Recursos do Sistema', path: '/admin/resources', icon: 'rocket_launch' },
    { label: '3. Slides', path: '/admin/slides', icon: 'view_carousel' },
    { label: '4. Passo a Passo', path: '/admin/steps', icon: 'timeline' },
    { label: '5. Dicas', path: '/admin/tips', icon: 'lightbulb' },
    { label: '6. Avaliações', path: '/admin/reviews', icon: 'stars' },
    { label: '7. Políticas e Termos', path: '/admin/legal', icon: 'gavel' },
    { label: '8. Checkout', path: '/admin/checkout', icon: 'shopping_cart' },
    { label: '9. Planos', path: '/admin/plans', icon: 'style' },
    { label: '10. Configuração de Email', path: '/admin/email', icon: 'email' },
    { label: '11. SEO e Indexação', path: '/admin/seo', icon: 'search' },
  ];

  const brokerMenu = [
    { label: 'Dashboard', path: '/broker', icon: 'dashboard' },
    { label: 'Plano', path: '/broker/plan', icon: 'credit_card' },
    { label: 'Minhas Vistorias', path: '/inspections', icon: 'assignment' },
    { label: 'Meus Imóveis', path: '/properties', icon: 'apartment' },
    { label: 'Clientes', path: '/clients', icon: 'groups' },
    { label: 'Meu Perfil', path: '/settings', icon: 'person' },
  ];

  const pjMenu = [
    { label: 'Dashboard', path: '/pj', icon: 'dashboard' },
    { label: 'Equipe', path: '/team', icon: 'group' },
    { label: 'Minhas Vistorias', path: '/inspections', icon: 'assignment' },
    { label: 'Meus Imóveis', path: '/properties', icon: 'apartment' },
    { label: 'Clientes', path: '/clients', icon: 'groups' },
    { label: 'Plano', path: '/broker/plan', icon: 'credit_card' },
    { label: 'Meu Perfil', path: '/settings', icon: 'person' },
  ];

  const [isConfigOpen, setIsConfigOpen] = useState(location.pathname.startsWith('/admin/'));
  const currentMenu = role === 'ADMIN' ? adminMenu : role === 'BROKER' ? brokerMenu : pjMenu;

  const [brand, setBrand] = useState<{ primaryColor: string; logoUrl: string | null }>({ primaryColor: '#2563eb', logoUrl: null });
  const [userProfile, setUserProfile] = React.useState<{ full_name: string; avatar_url: string; email: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  React.useEffect(() => {
    const fetchConfigs = async () => {
      const { data } = await supabase.from('system_configs').select('*');
      if (data) {
        const primary = data.find(c => c.key === 'home_primary_color')?.value;
        const logo = data.find(c => c.key === 'home_logo_url')?.value;
        setBrand({ primaryColor: primary || '#2563eb', logoUrl: logo || null });
      } else {
        setBrand({ primaryColor: '#2563eb', logoUrl: null });
      }
    };
    fetchConfigs();
  }, []);

  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data: profile } = await supabase.from('broker_profiles').select('*').eq('user_id', session.user.id).single();

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
          full_name: profile?.full_name || session.user.email?.split('@')[0] || 'Usuário',
          avatar_url: profile?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=0D8ABC&color=fff`,
          email: session.user.email || ''
        });
      }
    };
    fetchUser();
  }, [navigate]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="h-20 flex items-center justify-center px-6 shrink-0">
        <div className="flex items-center">
          {brand?.logoUrl ? (
            <img src={brand.logoUrl} className="h-10 w-auto object-contain" alt="Logo" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: brand?.primaryColor || '#2563eb' }}>
              <span className="material-symbols-outlined font-bold text-2xl">home_app_logo</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 py-4 px-4 space-y-8 overflow-y-auto">
        <nav className="space-y-1">
          {currentMenu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
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
                      key={sub.label}
                      to={sub.path}
                      onClick={() => setMobileMenuOpen(false)}
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
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 overflow-hidden font-['Inter']">
      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden font-['Inter']">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 shadow-2xl transform transition-transform animate-in slide-in-from-left duration-200">
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 shrink-0">
        {SidebarContent}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 shrink-0 z-20 gap-4">
          <div className="flex items-center gap-4 lg:gap-8 flex-1 max-w-2xl overflow-hidden">
            {/* Mobile Toggle */}
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
              <span className="material-symbols-outlined">menu</span>
            </button>

            <h2 className="text-lg lg:text-xl font-bold text-slate-900 whitespace-nowrap truncate hidden sm:block">
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
              {(isActive('/users') || isActive('/team')) && 'Membros'}
              {isActive('/admin/seo') && 'SEO e Indexação'}
              {isActive('/settings') && 'Configurações'}
            </h2>
            <div className="relative w-full max-w-[200px] lg:max-w-none">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">search</span>
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-10 pr-4 py-2.5 bg-[#F1F5F9] border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="hidden lg:flex flex-col items-end mr-2 pr-4 border-r border-slate-100">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">VaiVistoriar</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{role === 'ADMIN' ? 'Super Admin' : 'Painel de Gestão'}</span>
            </div>

            <div
              onClick={() => navigate('/settings')}
              className="flex items-center gap-3 lg:pl-1 cursor-pointer group"
            >
              <div className="text-right hidden md:block">
                <p className="text-[13px] font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{userProfile?.full_name}</p>
                <p className="text-[10px] font-semibold text-slate-400">{userProfile?.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                <img src={userProfile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body - Responsive Padding */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
      <ReviewModal session={session} />
    </div>
  );
};

export default DashboardLayout;
