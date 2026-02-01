
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

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  photoUrl: string;
}

const LandingPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // States Dinâmicos
  const [primaryColor, setPrimaryColor] = useState('#137fec');
  const [secondaryColor, setSecondaryColor] = useState('#f8fafc');
  const [logoUrl, setLogoUrl] = useState('');
  const [sliders, setSliders] = useState<HeroSlider[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [faq, setFaq] = useState<FAQItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
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
    ctaText: 'Começar Agora'
  });

  const [activePlanTab, setActivePlanTab] = useState<'PF' | 'PJ'>('PF');

  useEffect(() => {
    fetchData();
  }, []);

  // Timer para o Slider
  useEffect(() => {
    if (sliders.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % sliders.length);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [sliders]);

  const fetchData = async () => {
    try {
      const { data: planData } = await supabase.from('plans').select('*').eq('status', 'Ativo').order('price', { ascending: true });
      if (planData) setPlans(planData.map((p: any) => ({ ...p, price: parseFloat(p.price) })));

      const { data: configData } = await supabase.from('system_configs').select('*');
      if (configData) {
        const find = (key: string) => configData.find(c => c.key === key)?.value;
        if (find('home_primary_color')) setPrimaryColor(find('home_primary_color'));
        if (find('home_secondary_color')) setSecondaryColor(find('home_secondary_color'));
        if (find('home_logo_url')) setLogoUrl(find('home_logo_url'));

        const s = find('home_sliders_json');
        if (s) setSliders(JSON.parse(s));

        const f = find('home_features_json');
        if (f) setFeatures(JSON.parse(f));

        const foo = find('home_footer_json');
        if (foo) setFooter(JSON.parse(foo));

        const h = find('home_header_json');
        if (h) setHeaderConfig(JSON.parse(h));

        const st = find('home_steps_json');
        if (st) setSteps(JSON.parse(st));

        const fa = find('home_faq_json');
        if (fa) setFaq(JSON.parse(fa));

        const ht = find('home_hero_text_json');
        if (ht) setHeroText(JSON.parse(ht));

        const tm = find('home_testimonials_json');
        if (tm) setTestimonials(JSON.parse(tm));
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
    // If Plan has type field, use it. Otherwise fall back to name guess
    if (p.type) return p.type === activePlanTab;
    // Fallback: Check name for keywords
    const name = p.name.toUpperCase();
    if (activePlanTab === 'PJ') return name.includes('IMOBILIÁRIA') || name.includes('PJ');
    return name.includes('CORRETOR') || name.includes('PF') || !name.includes('IMOBILIÁRIA');
  });

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      <MetaTags />

      {/* Navbar Premium */}
      <header
        className={`${headerConfig.isSticky ? 'fixed' : 'relative'} top-0 w-full z-50 transition-all duration-500 border-b border-slate-100`}
        style={{
          backgroundColor: `${headerConfig.bgColor}${Math.round(headerConfig.opacity * 2.55).toString(16).padStart(2, '0')}`,
          backdropFilter: headerConfig.opacity < 100 ? 'blur(24px)' : 'none',
          fontFamily: headerConfig.fontFamily
        }}
      >
        <div className={`max-w-7xl mx-auto flex py-4 items-center px-6 sm:px-8 ${headerConfig.logoPosition === 'center' ? 'flex-col gap-6' : 'h-20 justify-between'}`}>
          <Link to="/" className={`flex items-center gap-3 ${headerConfig.logoPosition === 'center' ? 'w-full justify-center' : ''}`}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: `${headerConfig.logoHeight}px` }} className="w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2 font-black text-2xl tracking-tighter" style={{ color: primaryColor }}>
                <span className="material-symbols-outlined text-4xl">home_app_logo</span> VaiVistoriar
              </div>
            )}
          </Link>

          {headerConfig.showMenu && (
            <nav className={`hidden lg:flex items-center gap-10 ${headerConfig.logoPosition === 'center' ? 'w-full justify-center' : ''}`}>
              {['Funcionalidades', 'Planos', 'Depoimentos'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-black uppercase tracking-[0.2em] transition-colors" style={{ color: headerConfig.textColor }}>{item}</a>
              ))}
            </nav>
          )}

          <div className={`flex items-center gap-6 ${headerConfig.logoPosition === 'center' ? 'w-full justify-center pb-2' : ''}`}>
            {headerConfig.showLogin && <Link to="/login" className="text-[11px] font-black uppercase tracking-[0.2em] hover:brightness-75 transition-all" style={{ color: headerConfig.textColor }}>Entrar</Link>}
            {headerConfig.showCTA && (
              <Link to="/register" className="px-8 py-3.5 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all active:scale-95" style={{ backgroundColor: primaryColor, boxShadow: `0 20px 30px -10px ${primaryColor}50` }}>
                {headerConfig.ctaText}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Slider & Animations */}
      <section className="relative min-h-[90vh] flex items-center pt-24 overflow-hidden bg-slate-900">
        {sliders.map((slide, idx) => (
          <div key={slide.id} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent z-10" />
            {slide.image && <img src={slide.image} alt="Hero" className="absolute inset-0 w-full h-full object-cover animate-slow-zoom" />}

            <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-8 h-full flex flex-col justify-center">
              <div className={`max-w-3xl space-y-8 transition-all duration-1000 delay-300 ${idx === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                <div className="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] bg-white/10 text-white backdrop-blur-md border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full mr-3 animate-pulse" style={{ backgroundColor: primaryColor }} />
                  {slide.badge}
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.95] tracking-tighter">
                  {slide.title}
                </h1>
                <p className="text-xl text-slate-300 font-medium leading-relaxed max-w-xl opacity-80">
                  {slide.subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-5 pt-8">
                  <Link to="/register" className="px-12 py-5 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 group" style={{ backgroundColor: primaryColor, boxShadow: `0 25px 40px -10px ${primaryColor}70` }}>
                    Começar Teste Grátis
                    <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Slider Controls */}
        {sliders.length > 1 && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex gap-4">
            {sliders.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-12' : 'w-4 bg-white/20 hover:bg-white/40'}`} style={{ backgroundColor: i === currentSlide ? primaryColor : undefined }} />
            ))}
          </div>
        )}
      </section>

      {/* Features Grid - Acordeon no Admin / Grid Premium aqui */}
      <section id="funcionalidades" className="py-32 relative" style={{ backgroundColor: secondaryColor }}>
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white to-transparent" />
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center space-y-4 mb-24 animate-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight">{heroText.title} <span style={{ color: primaryColor }}>{heroText.highlight}</span></h2>
            <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">{heroText.description}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((f, i) => (
              <div key={i} className="p-12 bg-white rounded-[50px] border border-slate-50 shadow-sm hover:shadow-3xl hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
                <div className="w-20 h-20 rounded-[32px] flex items-center justify-center mb-10 transition-all group-hover:scale-110 duration-700" style={{ backgroundColor: primaryColor + '08', color: primaryColor }}>
                  {renderIcon(f)}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tighter">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed font-bold text-sm tracking-tight">{f.desc}</p>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-700" style={{ backgroundColor: primaryColor }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section "Como Funciona" */}
      {steps.length > 0 && (
        <section className="py-32 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
            <div className="text-center mb-24 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Como Funciona</h2>
              <p className="text-slate-400 font-medium max-w-xl mx-auto">Em poucos passos você transforma a gestão das suas vistorias.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 relative">
              {steps.map((step, idx) => (
                <div key={idx} className="relative flex flex-col items-center text-center space-y-6 group">
                  <div className="w-24 h-24 rounded-[32px] flex items-center justify-center text-3xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3" style={{ backgroundColor: idx % 2 === 0 ? primaryColor : '#1e293b', color: 'white' }}>
                    <span className="material-symbols-outlined text-4xl">{step.icon}</span>
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Passo 0{idx + 1}</span>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{step.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm font-medium">{step.desc}</p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 border-t-2 border-dashed border-slate-200 -z-10 opacity-50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section id="depoimentos" className="py-32 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: `${primaryColor}15` }} />
          <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Quem usa, aprova</h2>
              <p className="text-slate-400 font-medium max-w-xl mx-auto">Veja o que nossos clientes dizem sobre a plataforma.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((t, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-8 rounded-[32px] backdrop-blur-sm hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4 mb-6">
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                        {t.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-white text-sm">{t.name}</h4>
                      <p className="text-xs text-slate-400 font-mono">{t.role}</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed italic">"{t.content}"</p>
                  <div className="flex gap-1 mt-6 text-amber-400">
                    {[1, 2, 3, 4, 5].map(s => <span key={s} className="material-symbols-outlined text-[16px] fill-icon">star</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section Premium WITH TABS */}
      <section id="planos" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="text-center space-y-6 mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">Nossos Planos</h2>
            <p className="text-xl text-slate-400 font-medium">Escolha a opção ideal para o seu perfil.</p>

            {/* Tabs */}
            <div className="inline-flex p-1.5 bg-white rounded-2xl shadow-sm border border-slate-200">
              <button
                onClick={() => setActivePlanTab('PF')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activePlanTab === 'PF' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
              >
                Corretores (PF)
              </button>
              <button
                onClick={() => setActivePlanTab('PJ')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activePlanTab === 'PJ' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
              >
                Imobiliárias (PJ)
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {filteredPlans.map((plan) => (
              <div key={plan.id} className="relative p-10 bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col hover:-translate-y-2 transition-transform duration-500">
                {plan.badgeText && (
                  <span className="absolute top-6 right-6 px-4 py-1.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                    {plan.badgeText}
                  </span>
                )}
                <div className="mb-8">
                  <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">{plan.type === 'PJ' ? 'Escritório / Imobiliária' : 'Corretor Independente'}</span>
                  <h3 className="text-3xl font-black text-slate-900 mt-6 uppercase tracking-tight">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">R$ {Math.floor(plan.price)}</span>
                    {plan.price % 1 !== 0 && <span className="text-2xl font-bold text-slate-900">,{plan.price.toFixed(2).split('.')[1]}</span>}
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">/Mês</span>
                  </div>
                </div>
                <ul className="space-y-5 mb-10 flex-1">
                  {Object.entries(plan.features).map(([key, value]) => (
                    <li key={key} className="flex items-center gap-4 text-sm font-bold text-slate-600">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </span>
                      {value}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-105 shadow-lg shadow-blue-500/20 text-center flex items-center justify-center gap-2 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Assinar Agora
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {faq.length > 0 && (
        <section className="py-32 bg-slate-50 relative">
          <div className="max-w-4xl mx-auto px-6 sm:px-8">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Perguntas Frequentes</h2>
              <p className="text-slate-400 font-medium">Tire suas dúvidas e comece a usar agora mesmo.</p>
            </div>
            <div className="space-y-6">
              {faq.map((item, idx) => (
                <div key={idx} className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: primaryColor }}>?</span>
                    {item.question}
                  </h3>
                  <p className="text-slate-500 font-medium leading-relaxed pl-11">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer Premium Modular */}
      {footer && (
        <footer className="bg-slate-900 text-white pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-20 pb-24 border-b border-white/5">
              <div className="lg:col-span-2 space-y-10">
                <Link to="/" className="flex items-center gap-3">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 w-auto brightness-0 invert" /> : <div className="flex items-center gap-2 font-black text-3xl tracking-tighter text-white"><span className="material-symbols-outlined text-4xl" style={{ color: primaryColor }}>home_app_logo</span> VaiVistoriar</div>}
                </Link>
                <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-md">
                  {footer.col1_text}
                </p>
                <div className="flex gap-6">
                  {footer.socials.map((s, i) => (
                    <a key={i} href={s.url} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                      <img src={`https://cdn.simpleicons.org/${s.provider}/white`} className="w-5 h-5 opacity-60 hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
              <div className="space-y-8">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-white/40">{footer.col2_title}</h4>
                <div className="flex flex-col gap-4">
                  {footer.col2_links.map((l, i) => (
                    <a key={i} href={l.url} className="text-slate-400 font-bold hover:text-white transition-colors tracking-tight">{l.label}</a>
                  ))}
                </div>
              </div>
              <div className="space-y-8">
                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-white/40">{footer.col3_title}</h4>
                <div className="space-y-2">
                  <p className="text-2xl font-black text-white tracking-tighter">{footer.col3_contact}</p>
                  <p className="text-slate-500 font-medium text-sm">Disponível em horário comercial</p>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[16px]">support_agent</span> Central de Ajuda
                </button>
              </div>
            </div>
            <div className="pt-16 flex flex-col md:flex-row justify-between items-center gap-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-600">
              <p>© {new Date().getFullYear()} VaiVistoriar • Todos os direitos reservados</p>
              <div className="flex gap-8">
                <a href="/legal/terms" className="hover:text-white transition-colors">Termos</a>
                <a href="/legal/privacy" className="hover:text-white transition-colors">Privacidade</a>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Global Tailored Animations */}
      <style>{`
        @keyframes slow-zoom {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s infinite alternate ease-in-out;
        }
        .animate-in {
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
