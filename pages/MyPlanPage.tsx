
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plan } from '../types';

const MyPlanPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [currentPlan, setCurrentPlan] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [primaryColor, setPrimaryColor] = useState('#2563eb');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Configs (Colors)
            const { data: configs } = await supabase.from('system_configs').select('*');
            if (configs) {
                const color = configs.find(c => c.key === 'home_primary_color')?.value;
                if (color) setPrimaryColor(color);
            }

            // 2. Fetch Profile & Active Plan
            const { data: profileData } = await supabase
                .from('broker_profiles')
                .select('*, plans:subscription_plan_id(*)')
                .eq('user_id', user.id)
                .single();

            if (profileData) {
                setProfile(profileData);
                setCurrentPlan(profileData.plans);
            }

            // 3. Fetch All Available Tier Plans
            const { data: allPlans } = await supabase
                .from('plans')
                .select('*')
                .eq('status', 'Ativo')
                .eq('plan_type', 'PF')
                .order('price', { ascending: true });

            if (allPlans) {
                setPlans(allPlans.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    price: parseFloat(p.price),
                    billingCycle: p.billing_cycle,
                    status: p.status,
                    type: p.plan_type,
                    maxInspections: p.max_inspections || 0,
                    maxPhotos: p.max_photos || 0,
                    maxRooms: p.max_rooms || 0,
                    storageGb: p.storage_gb || 0
                })));
            }

        } catch (err) {
            console.error('Erro ao buscar dados do plano:', err);
        } finally {
            setLoading(false);
        }
    };

    const [upgradingId, setUpgradingId] = useState<string | null>(null);

    const handleUpgrade = async (plan: Plan) => {
        try {
            setUpgradingId(plan.id);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Faça login para continuar.');

            const { mercadopagoService } = await import('../lib/mercadopago');
            const data = await mercadopagoService.createPreference(plan, user.id, user.email || '');

            if (data?.init_point) {
                window.location.href = data.init_point;
            } else {
                const mpError = data?.error_message || data?.message || 'Motivo desconhecido';
                throw new Error(`O Mercado Pago não gerou o link. Detalhe: ${mpError}`);
            }
        } catch (err: any) {
            console.error('Falha no Upgrade:', err);
            alert('Atenção: ' + (err.message || 'Ocorreu um erro ao iniciar o pagamento.'));
        } finally {
            setUpgradingId(null);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando sua assinatura...</p>
        </div>
    );

    const isExpiring = profile?.subscription_expires_at && new Date(profile.subscription_expires_at) < new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Minha Assinatura</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Gerencie seu nível de acesso e limites</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Conta</p>
                        <p className="text-sm font-black text-emerald-600 uppercase tracking-tight">Assinatura Ativa</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <span className="material-symbols-outlined text-2xl">verified</span>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-10">
                {/* Current Plan Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 p-8 space-y-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full" />

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <span className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-6">Plano Atual</span>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentPlan?.name || 'Vistoria Free'}</h2>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-2xl font-black text-slate-900">R$ {(currentPlan?.price ? parseFloat(currentPlan.price) : 0).toFixed(2).replace('.', ',')}</span>
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">/ mês</span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-slate-50">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-500">Vistorias/mês</span>
                                <span className="text-slate-900">{currentPlan?.max_inspections || 5}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-500">Fotos p/ Vistoria</span>
                                <span className="text-slate-900">{currentPlan?.max_photos || 30}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-500">Limite de Armazenamento</span>
                                <span className="text-slate-900">{currentPlan?.storage_gb || 1} GB</span>
                            </div>
                        </div>

                        {profile?.subscription_expires_at && (
                            <div className={`p-5 rounded-3xl flex items-center gap-4 border transition-all ${isExpiring ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isExpiring ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                                    <span className="material-symbols-outlined text-xl">calendar_today</span>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expira em</p>
                                    <p className={`text-xs font-black ${isExpiring ? 'text-amber-700' : 'text-slate-900'}`}>
                                        {new Date(profile.subscription_expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-8 bg-slate-900 rounded-[40px] text-white space-y-6 shadow-2xl shadow-slate-900/20">
                        <h3 className="text-lg font-black tracking-tight leading-tight">Precisa de mais?</h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">Se o seu volume de vistorias cresceu, você pode subir de nível a qualquer momento. O novo limite é liberado instantaneamente.</p>
                        <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-lg">support_agent</span>
                            Falar com Suporte
                        </button>
                    </div>
                </div>

                {/* Upgrade Options */}
                <div className="lg:col-span-2 space-y-8">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-full bg-blue-600" />
                        Upgrades Disponíveis
                    </h3>

                    <div className="grid md:grid-cols-2 gap-8">
                        {plans.filter(p => p.id !== currentPlan?.id).map((plan) => (
                            <div key={plan.id} className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-xl hover:shadow-2xl transition-all group border-b-4" style={{ borderBottomColor: primaryColor }}>
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform duration-500">
                                        <span className="material-symbols-outlined text-2xl font-bold">bolt</span>
                                    </div>
                                    <span className="text-[18px] font-black text-slate-900 tracking-tighter">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                                </div>

                                <h4 className="text-2xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{plan.name}</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Corretor Independente</p>

                                <div className="space-y-4 mb-10">
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px] font-black">check_circle</span>
                                        {plan.maxInspections} Vistorias / mês
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px] font-black">check_circle</span>
                                        {plan.maxPhotos} Fotos / vistoria
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px] font-black">check_circle</span>
                                        {plan.storageGb} GB Armazenamento
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleUpgrade(plan)}
                                    disabled={upgradingId === plan.id}
                                    className="w-full py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    style={{ backgroundColor: primaryColor, boxShadow: `0 20px 30px -10px ${primaryColor}40` }}
                                >
                                    {upgradingId === plan.id ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Fazer Upgrade Agora'
                                    )}
                                </button>
                            </div>
                        ))}

                        {plans.filter(p => p.id !== currentPlan?.id).length === 0 && (
                            <div className="col-span-2 p-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-4xl text-slate-300 mb-4 font-bold">verified</span>
                                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">Você já possui o melhor plano individual!</h4>
                                <p className="text-xs text-slate-400 mt-2 font-medium">Interessado em soluções para equipes? Fale conosco.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyPlanPage;
