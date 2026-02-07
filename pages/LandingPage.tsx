
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plan } from '../types';
import MetaTags from '../components/MetaTags';

interface HeroSlider {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  badge: string;
  btnLabel?: string;
  btnLink?: string;
  btnStyle?: 'primary' | 'outline';
}

interface Feature {
  icon: string;
  svgCode?: string;
  followColor?: boolean;
  title: string;
  desc: string;
}

interface FooterConfig {
  col1_text: string;
  col2_title: string;
  col2_links: { label: string; url: string }[];
  col3_title: string;
  col3_contact: string;
  copyright?: string;
  address?: string;
  phone?: string;
  email?: string;
  socials: { provider: 'whatsapp' | 'instagram' | 'facebook' | 'linkedin'; url: string }[];
}

interface HeaderConfig {
  logoHeight: number;
  logoPosition: 'left' | 'center';
  bgColor: string;
  textColor: string;
  opacity: number;
  fontFamily: string;
  isSticky: boolean;
  showMenu: boolean;
  showLogin: boolean;
  showCTA: boolean;
  ctaText: string;
  ctaLink?: string;
  loginLabel?: string;
  loginLink?: string;
}

interface Step {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface HeroTextConfig {
  title: string;
  highlight: string;
  description: string;
}

interface SystemReview {
  id: string;
  rating: number;
  comment: string;
  broker_profiles?: {
    full_name: string;
    avatar_url: string;
  } | null;
}

const LandingPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // States Dinâmicos
  const [primaryColor, setPrimaryColor] = useState('#137fec');
  const [secondaryColor, setSecondaryColor] = useState('#f8fafc');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoWhiteUrl, setLogoWhiteUrl] = useState('');
  const [whatsappCommercial, setWhatsappCommercial] = useState('');
  const [whatsappCommercialMsg, setWhatsappCommercialMsg] = useState('');
  const [sliders, setSliders] = useState<HeroSlider[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [realReviews, setRealReviews] = useState<SystemReview[]>([]);
  const [plansMessage, setPlansMessage] = useState('Todos os planos incluem 7 dias de teste grátis • Cancele quando quiser');
  const [heroText, setHeroText] = useState<HeroTextConfig>({
    title: 'Tecnologia que',
    highlight: 'gera valor',
    description: 'Desenvolvemos as ferramentas ideias para escalar sua imobiliária com segurança jurídica e agilidade.'
  });
  const [footer, setFooter] = useState<FooterConfig | null>(null);
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({
    logoHeight: 40,
    logoPosition: 'left',
    bgColor: '#ffffff',
    textColor: '#64748b',
    opacity: 100,
    fontFamily: 'Inter',
    isSticky: true,
    showMenu: true,
    showLogin: true,
    showCTA: true,
    ctaText: 'Começar Agora',
    ctaLink: '/register',
    loginLabel: 'Entrar',
    loginLink: '/login'
  });

  const [activePlanTab, setActivePlanTab] = useState<'PF' | 'PJ'>('PF');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (sliders.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % sliders.length);
      }, 7000);
      return () => clearInterval(timer);
    }
  }, [sliders]);

  const fetchData = async () => {
    try {
      const { data: planData } = await supabase.from('plans').select('*').eq('status', 'Ativo').order('price', { ascending: true });
      if (planData) {
        setPlans(planData.map((p: any) => ({
          ...p,
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: parseFloat(p.price),
          billingCycle: p.billing_cycle,
          status: p.status,
          features: p.features,
          type: p.plan_type,
          maxInspections: p.max_inspections || 0,
          maxPhotos: p.max_photos || 0,
          maxRooms: p.max_rooms || 0,
          maxBrokers: p.max_brokers || 0,
          storageGb: p.storage_gb || 0,
          badgeText: p.plan_badge_text || '',
          comparisonPrice: p.comparison_price ? parseFloat(p.comparison_price) : undefined,
        })));
      }

      const { data: configData } = await supabase.from('system_configs').select('*');
      if (configData) {
        const find = (key: string) => configData.find(c => c.key === key)?.value;
        if (find('home_primary_color')) setPrimaryColor(find('home_primary_color'));
        if (find('home_secondary_color')) setSecondaryColor(find('home_secondary_color'));
        if (find('home_logo_url')) setLogoUrl(find('home_logo_url'));
        if (find('home_logo_white_url')) setLogoWhiteUrl(find('home_logo_white_url'));
        if (find('whatsapp_commercial')) setWhatsappCommercial(find('whatsapp_commercial'));
        if (find('whatsapp_commercial_message')) setWhatsappCommercialMsg(find('whatsapp_commercial_message'));

        const s = find('home_sliders_json');
        if (s) setSliders(JSON.parse(s));

        const f = find('home_features_json');
        if (f) setFeatures(JSON.parse(f));

        const foo = find('home_footer_json');
        if (foo) setFooter(JSON.parse(foo));

        const h = find('home_header_json');
        if (h) setHeaderConfig(prev => ({ ...prev, ...JSON.parse(h) }));

        const st = find('home_steps_json');
        if (st) setSteps(JSON.parse(st));

        const fa = find('home_faq_json');
        if (fa) setFaqs(JSON.parse(fa));

        const ht = find('home_hero_text_json');
        if (ht) setHeroText(JSON.parse(ht));

        const pm = find('home_plans_msg');
        if (pm) setPlansMessage(pm);
      }

      const { data: revs, error: revError } = await supabase
        .from('system_reviews')
        .select(`id, rating, comment, broker_profiles:user_id (full_name, avatar_url)`)
        .eq('is_approved', true) // Filtrar apenas reviews aprovados
        .order('created_at', { ascending: false })
        .limit(6);

      if (revs) setRealReviews(revs as any);
      else if (revError) {
        const { data: rawRevs } = await supabase.from('system_reviews').select('*').eq('is_approved', true).order('created_at', { ascending: false }).limit(6);
        if (rawRevs) {
          const userIds = [...new Set(rawRevs.map(r => r.user_id))];
          const { data: profiles } = await supabase.from('broker_profiles').select('user_id, full_name, avatar_url').in('user_id', userIds);
          const merged = rawRevs.map(r => ({ ...r, broker_profiles: profiles?.find(p => p.user_id === r.user_id) || null }));
          setRealReviews(merged);
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (f: Feature) => {
    if (f.svgCode) {
      const svg = f.followColor ? f.svgCode.replace(/fill="[^"]*"/g, `fill="${primaryColor}"`) : f.svgCode;
      return <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-110 duration-500" dangerouslySetInnerHTML={{ __html: svg }} />;
    }
    return <span className="material-symbols-outlined text-4xl group-hover:scale-110 transition-transform duration-500">{f.icon}</span>;
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full" /></div>;

  const filteredPlans = plans.filter(p => {
    if (p.type) return p.type === activePlanTab;
    const name = p.name.toUpperCase();
    if (activePlanTab === 'PJ') return name.includes('IMOBILIÁRIA') || name.includes('PJ');
    return name.includes('CORRETOR') || name.includes('PF') || !name.includes('IMOBILIÁRIA');
  });

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-blue-100 selection:text-blue-900" style={{ fontFamily: headerConfig.fontFamily }}>
      <MetaTags />

      {/* Header com links sincronizados */}
      <header
        className={`${headerConfig.isSticky ? 'fixed' : 'relative'} top-0 w-full z-50 transition-all duration-500 border-b border-slate-100/50`}
        style={{
          backgroundColor: `${headerConfig.bgColor}${Math.round((headerConfig.opacity || 100) * 2.55).toString(16).padStart(2, '0')}`,
          backdropFilter: (headerConfig.opacity || 100) < 100 ? 'blur(24px)' : 'none'
        }}
      >
        <div className={`max-w-7xl mx-auto flex py-4 items-center px-6 sm:px-8 ${headerConfig.logoPosition === 'center' ? 'flex-col gap-6' : 'h-24 justify-between'}`}>
          <Link to="/" className={`flex items-center gap-3 ${headerConfig.logoPosition === 'center' ? 'w-full justify-center' : ''}`}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: `${headerConfig.logoHeight || 40}px` }} className="w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2 font-black text-2xl tracking-tighter" style={{ color: primaryColor }}>
                <span className="material-symbols-outlined text-4xl">home_app_logo</span> VaiVistoriar
              </div>
            )}
          </Link>

          {headerConfig.showMenu && (
            <nav className={`hidden lg:flex items-center gap-10 ${headerConfig.logoPosition === 'center' ? 'w-full justify-center' : ''}`}>
              {footer?.col2_links?.map(l => (
                <a
                  key={l.label}
                  href={l.url}
                  onClick={(e) => {
                    if (l.url.startsWith('#')) {
                      e.preventDefault();
                      const element = document.querySelector(l.url);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }
                  }}
                  className="text-[12px] font-black uppercase tracking-[0.2em] transition-all hover:brightness-50"
                  style={{ color: headerConfig.textColor }}
                >
                  {l.label}
                </a>
              ))}
            </nav>
          )}

          <div className={`flex items-center gap-8 ${headerConfig.logoPosition === 'center' ? 'w-full justify-center pb-4' : ''}`}>
            {headerConfig.showLogin && <Link to={headerConfig.loginLink || "/login"} className="text-[12px] font-black uppercase tracking-[0.2em] hover:brightness-50 transition-all" style={{ color: headerConfig.textColor }}>{headerConfig.loginLabel || 'Entrar'}</Link>}
            {headerConfig.showCTA && (
              <Link to={headerConfig.ctaLink || "/register"} className="px-10 py-4 text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all active:scale-95" style={{ backgroundColor: primaryColor, boxShadow: `0 20px 40px -10px ${primaryColor}60` }}>
                {headerConfig.ctaText}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950">
        {sliders.map((slide, idx) => (
          <div key={slide.id} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 scale-100 z-20 pointer-events-auto' : 'opacity-0 scale-110 z-10 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10" />
            {slide.image && <img src={slide.image} alt="Hero" className="absolute inset-0 w-full h-full object-cover animate-slow-zoom opacity-60" />}

            <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-8 h-full flex flex-col justify-center">
              <div className={`max-w-4xl space-y-10 transition-all duration-1000 delay-300 ${idx === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                <div className="inline-flex items-center px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.4em] bg-white/10 text-white backdrop-blur-xl border border-white/10">
                  <span className="w-2 h-2 rounded-full mr-4 animate-pulse" style={{ backgroundColor: primaryColor }} />
                  {slide.badge}
                </div>
                <h1 className="text-7xl md:text-[100px] font-black text-white leading-[0.85] tracking-tighter">
                  {slide.title}
                </h1>
                <p className="text-2xl text-slate-300 font-medium leading-relaxed max-w-2xl opacity-80">
                  {slide.subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-6 pt-5">
                  <Link
                    to={slide.btnLink || "/register"}
                    className={`px-14 py-6 rounded-[32px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 group ${slide.btnStyle === 'outline' ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20' : 'text-white'}`}
                    style={slide.btnStyle !== 'outline' ? { backgroundColor: primaryColor, boxShadow: `0 25px 50px -10px ${primaryColor}70` } : {}}
                    onClick={(e) => {
                      if (slide.btnLink?.startsWith('#')) {
                        e.preventDefault();
                        const element = document.querySelector(slide.btnLink);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }
                    }}
                  >
                    {slide.btnLabel || 'Começar Agora'}
                    <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {sliders.length > 1 && (
          <div className="absolute bottom-16 right-16 z-30 flex gap-4">
            {sliders.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-2 rounded-full transition-all duration-700 ${i === currentSlide ? 'w-16' : 'w-4 bg-white/20 hover:bg-white/40'}`} style={{ backgroundColor: i === currentSlide ? primaryColor : undefined }} />
            ))}
          </div>
        )}
      </section>

      {/* Features Grid */}
      <section id="funcionalidades" className="py-40 relative" style={{ backgroundColor: secondaryColor }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center space-y-4 mb-32">
            <h2 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">{heroText.title} <span style={{ color: primaryColor }}>{heroText.highlight}</span></h2>
            <p className="text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">{heroText.description}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {features.map((f, i) => (
              <div key={i} className="p-14 bg-white rounded-[60px] border border-slate-100 shadow-sm hover:shadow-3xl hover:-translate-y-3 transition-all duration-700 group relative overflow-hidden">
                <div className="w-24 h-24 rounded-[40px] flex items-center justify-center mb-12 transition-all group-hover:scale-110 duration-700" style={{ backgroundColor: primaryColor + '08', color: primaryColor }}>
                  {renderIcon(f)}
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-5 tracking-tighter">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed font-bold text-base tracking-tight">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona - Steps Section */}
      {steps.length > 0 && (
        <section id="como-funciona" className="py-40 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.05),transparent_70%)]" />
          <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
            <div className="text-center space-y-6 mb-32">
              <h2 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                Como <span style={{ color: primaryColor }}>Funciona</span>
              </h2>
              <p className="text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
                Processo simples e eficiente em poucos passos
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
              {steps.map((step: any, idx: number) => (
                <div key={idx} className="relative group">
                  {/* Connector Line */}
                  {idx < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-16 left-[60%] w-full h-1 bg-gradient-to-r from-slate-200 to-transparent z-0" />
                  )}

                  <div className="relative z-10 bg-white p-10 rounded-[40px] border-2 border-slate-100 hover:border-slate-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                    {/* Step Number */}
                    <div className="absolute -top-6 -right-6 w-16 h-16 rounded-[24px] flex items-center justify-center font-black text-2xl text-white shadow-xl" style={{ backgroundColor: primaryColor }}>
                      {idx + 1}
                    </div>

                    {/* Icon */}
                    <div className="w-20 h-20 rounded-[32px] flex items-center justify-center mb-8 transition-all group-hover:scale-110 duration-500" style={{ backgroundColor: primaryColor + '10', color: primaryColor }}>
                      <span className="material-symbols-outlined text-5xl">{step.icon || 'check_circle'}</span>
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{step.title}</h3>
                    <p className="text-slate-500 leading-relaxed font-medium text-sm">{step.desc || step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Real Reviews Section */}
      <section id="depoimentos" className="py-40 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" style={{ backgroundColor: `${primaryColor}15` }} />
        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-24">
            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">Avaliações da <br /><span style={{ color: primaryColor }}>Comunidade</span></h2>
              <p className="text-xl text-slate-400 font-medium">Veja o que os corretores reais estão falando.</p>
            </div>
            <div className="flex gap-1 text-amber-400 items-center">
              <span className="text-white font-black text-6xl mr-4 tracking-tighter">4.9</span>
              {[1, 2, 3, 4, 5].map(s => <span key={s} className="material-symbols-outlined text-[32px] fill-current">star</span>)}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {realReviews.map((t) => (
              <div key={t.id} className="bg-white/5 border border-white/10 p-12 rounded-[50px] backdrop-blur-xl hover:bg-white/10 transition-all duration-500 group">
                <div className="flex items-center gap-5 mb-10">
                  {t.broker_profiles?.avatar_url ? (
                    <img src={t.broker_profiles.avatar_url} alt={t.broker_profiles.full_name} className="w-16 h-16 rounded-[24px] object-cover border-2 border-white/10" />
                  ) : (
                    <div className="w-16 h-16 rounded-[24px] bg-slate-800 flex items-center justify-center text-slate-500 font-black text-xl">
                      {t.broker_profiles?.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="font-black text-white text-lg tracking-tight">{t.broker_profiles?.full_name || 'Usuário Verificado'}</h4>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest" style={{ color: primaryColor }}>Corretor</p>
                  </div>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed font-medium italic opacity-90 group-hover:opacity-100">"{t.comment}"</p>
                <div className="flex gap-1 mt-10 text-amber-400">
                  {Array.from({ length: t.rating }).map((_, s) => <span key={s} className="material-symbols-outlined text-[18px] fill-current">star</span>)}
                </div>
              </div>
            ))}
            {realReviews.length === 0 && <div className="col-span-3 py-20 text-center text-slate-500 font-black uppercase tracking-[0.4em]">Seja o primeiro a avaliar nosso sistema!</div>}
          </div>
        </div>
      </section>

      {/* PREMIUM PRICING SECTION - REDESIGNED */}
      <section id="planos" className="py-40 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-indigo-100/40 to-transparent blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          <div className="text-center space-y-8 mb-24">
            <div className="inline-flex items-center px-6 py-2 rounded-full bg-indigo-50 border border-indigo-100">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-600">Planos & Preços</span>
            </div>
            <h2 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">Invista no <span style={{ color: primaryColor }}>Futuro</span><br />da sua Imobiliária</h2>
            <p className="text-2xl text-slate-500 font-medium max-w-2xl mx-auto">Escolha o plano ideal e comece a transformar suas vistorias hoje mesmo.</p>

            <div className="inline-flex p-2 bg-white rounded-[24px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
              <button onClick={() => setActivePlanTab('PF')} className={`px-12 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${activePlanTab === 'PF' ? 'bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-2xl shadow-slate-900/30' : 'text-slate-400 hover:text-slate-900'}`}>Corretores (PF)</button>
              <button onClick={() => setActivePlanTab('PJ')} className={`px-12 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${activePlanTab === 'PJ' ? 'bg-gradient-to-r from-slate-900 to-slate-700 text-white shadow-2xl shadow-slate-900/30' : 'text-slate-400 hover:text-slate-900'}`}>Imobiliárias (PJ)</button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {filteredPlans.map((plan, idx) => {
              const isPopular = idx === 1;
              return (
                <div key={plan.id} className={`relative p-12 rounded-[60px] flex flex-col transition-all duration-700 group ${isPopular ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl shadow-slate-900/50 scale-105 -mt-8' : 'bg-white border-2 border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-4'}`}>
                  {plan.badgeText && (
                    <div className={`absolute -top-5 left-1/2 -translate-x-1/2 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-xl ${isPopular ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'}`}>
                      {plan.badgeText}
                    </div>
                  )}

                  <div className="mb-12">
                    <div className={`inline-flex px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 ${isPopular ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {plan.type === 'PJ' ? 'Escritório / Imobiliária' : 'Corretor Independente'}
                    </div>
                    <h3 className={`text-4xl font-black uppercase tracking-tight leading-none mb-8 ${isPopular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>R$</span>
                      <span className={`text-7xl font-black tracking-tighter ${isPopular ? 'text-white' : 'text-slate-900'}`}>{Math.floor(plan.price)}</span>
                      <div className="flex flex-col">
                        {plan.price % 1 !== 0 && <span className={`text-2xl font-black ${isPopular ? 'text-white' : 'text-slate-900'}`}>,{plan.price.toFixed(2).split('.')[1]}</span>}
                        <span className={`text-xs font-black uppercase tracking-widest ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                          / {plan.billingCycle === 'Anual' ? 'ano' : 'mês'}
                        </span>
                      </div>
                    </div>

                    {plan.billingCycle === 'Anual' && (
                      <div className={`mt-6 p-6 rounded-[32px] border transition-all relative overflow-hidden ${isPopular ? 'bg-white/10 border-white/20' : 'bg-emerald-50/50 border-emerald-100/50'}`}>
                        {plan.comparisonPrice && (
                          <div className="flex flex-col mb-3">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ${isPopular ? 'text-white' : 'text-slate-400'}`}>Desconto Anual</span>
                            <p className={`text-2xl font-black ${isPopular ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              - R$ {((plan.comparisonPrice * 12) - plan.price).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        )}
                        <p className={`text-sm font-bold ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
                          Equivale a <span className={`font-black ${isPopular ? 'text-white' : 'text-slate-900'}`}>R$ {(plan.price / 12).toFixed(2).replace('.', ',')}</span> por mês
                        </p>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-6 mb-16 flex-1">
                    {[
                      `${plan.maxInspections >= 999999 ? 'Vistorias Ilimitadas' : `${plan.maxInspections} Vistorias por mês`}`,
                      `${plan.maxPhotos >= 999999 ? 'Fotos Ilimitadas' : `${plan.maxPhotos} Fotos por Vistoria`}`,
                      `Até ${plan.maxRooms} cômodos`,
                      `${plan.storageGb} GB de Armazenamento`,
                      ...(plan.type === 'PJ' ? [`Até ${plan.maxBrokers} Corretores`] : []),
                      'Suporte Individual'
                    ].map((feature, fidx) => (
                      <li key={fidx} className="flex items-start gap-5 text-base font-bold">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isPopular ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                          <span className="material-symbols-outlined text-sm">check</span>
                        </div>
                        <span className={isPopular ? 'text-slate-200' : 'text-slate-600'}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className={`w-full py-6 rounded-[32px] font-black uppercase tracking-widest text-xs transition-all duration-300 text-center group-hover:scale-105 shadow-2xl ${isPopular ? 'bg-white text-slate-900 hover:bg-slate-100' : 'text-white'}`}
                    style={!isPopular ? { backgroundColor: primaryColor, boxShadow: `0 30px 60px -15px ${primaryColor}70` } : {}}
                  >
                    Assinar Agora
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-20 text-center">
            <p className="text-slate-500 font-medium text-lg">{plansMessage}</p>
          </div>
        </div>
      </section>

      {/* ENHANCED FOOTER */}
      <footer className="bg-gradient-to-b from-slate-950 to-slate-900 text-white pt-24 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.1),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-16 pb-16 border-b border-white/5">
            <div className="lg:col-span-2 space-y-8">
              <Link to="/" className="flex items-center gap-3">
                {logoWhiteUrl ? (
                  <img src={logoWhiteUrl} alt="Logo" style={{ height: `${footer?.logoHeight || 40}px` }} className="w-auto object-contain" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-10 w-auto brightness-0 invert" />
                ) : (
                  <div className="flex items-center gap-2 font-black text-4xl tracking-tighter text-white">
                    <span className="material-symbols-outlined text-5xl" style={{ color: primaryColor }}>home_app_logo</span> VaiVistoriar
                  </div>
                )}
              </Link>
              <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-xl">
                {footer?.col1_text || 'Tecnologia avançada para profissionais de excelência no mercado imobiliário.'}
              </p>

              {footer?.address && (
                <div className="flex items-start gap-3 text-slate-400">
                  <span className="material-symbols-outlined text-xl mt-0.5" style={{ color: primaryColor }}>location_on</span>
                  <p className="text-base font-medium">{footer.address}</p>
                </div>
              )}

              <div className="space-y-3">
                {footer?.phone && (
                  <a href={`tel:${footer.phone.replace(/\D/g, '')}`} className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group">
                    <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform" style={{ color: primaryColor }}>call</span>
                    <span className="text-base font-bold">{footer.phone}</span>
                  </a>
                )}
                {footer?.email && (
                  <a href={`mailto:${footer.email}`} className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group">
                    <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform" style={{ color: primaryColor }}>mail</span>
                    <span className="text-base font-bold">{footer.email}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30">{footer?.col2_title || 'Navegação'}</h4>
              <div className="flex flex-col gap-4">
                {footer?.col2_links?.map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    onClick={(e) => {
                      if (l.url.startsWith('#')) {
                        e.preventDefault();
                        const element = document.querySelector(l.url);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }
                    }}
                    className="text-base text-slate-400 font-black hover:text-white transition-all tracking-tight hover:translate-x-2 duration-300"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30">Redes Sociais</h4>
              <div className="flex gap-3">
                {whatsappCommercial && (
                  <a href={`https://wa.me/${whatsappCommercial.replace(/\D/g, '')}`} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all hover:scale-110 duration-300" target="_blank" rel="noopener noreferrer">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                  </a>
                )}
                {footer?.socials?.map((social: any, idx: number) => {
                  const svgMap: Record<string, React.ReactNode> = {
                    instagram: <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
                    facebook: <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.324v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>,
                    linkedin: <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.763z" /></svg>,
                    twitter: <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>,
                  };
                  const provider = social.provider || social.platform;
                  const config = {
                    instagram: { color: 'pink-500' },
                    facebook: { color: 'blue-500' },
                    linkedin: { color: 'blue-600' },
                    twitter: { color: 'sky-500' }
                  }[provider] || { color: 'slate-500' };

                  return (
                    <a key={idx} href={social.url} className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-${config.color}/20 hover:border-${config.color}/30 transition-all hover:scale-110 duration-300`} target="_blank" rel="noopener noreferrer">
                      {svgMap[provider] || <span className="material-symbols-outlined">link</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] font-black uppercase tracking-[0.3em] text-slate-700">
            <p>{footer?.copyright || `© ${new Date().getFullYear()} VaiVistoriar • Todos os direitos reservados`}</p>
            <div className="flex gap-8">
              <Link to="/terms" className="hover:text-white transition-all">Termos de Uso</Link>
              <Link to="/privacy" className="hover:text-white transition-all">Privacidade</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      {whatsappCommercial && (
        <a
          href={`https://wa.me/${whatsappCommercial.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappCommercialMsg)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white z-50 hover:scale-110 transition-all duration-300 animate-bounce"
          style={{ backgroundColor: '#25D366' }}
        >
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
        </a>
      )}

      <style>{`
        @keyframes slow-zoom { from { transform: scale(1); } to { transform: scale(1.15); } }
        .animate-slow-zoom { animation: slow-zoom 25s infinite alternate ease-in-out; }
        .fill-current { fill: currentColor; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f8fafc; }
        ::-webkit-scrollbar-thumb { background: ${primaryColor}40; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default LandingPage;
