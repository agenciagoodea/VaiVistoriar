
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plan } from '../types';
import { mercadopagoService } from '../lib/mercadopago';

interface MyPlanPageProps {
    role?: 'PJ' | 'BROKER' | 'ADMIN';
}

const MyPlanPage: React.FC<MyPlanPageProps> = ({ role: propRole }) => {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [currentPlan, setCurrentPlan] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [primaryColor, setPrimaryColor] = useState('#2563eb');
    const [supportWhatsapp, setSupportWhatsapp] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Configs (Colors + WhatsApp)
            const { data: configs } = await supabase.from('system_configs').select('*');
            if (configs) {
                const color = configs.find(c => c.key === 'home_primary_color')?.value;
                if (color) setPrimaryColor(color);
                const whatsapp = configs.find(c => c.key === 'support_whatsapp')?.value;
                if (whatsapp) setSupportWhatsapp(whatsapp);
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
            // Usar o role da prop se disponível, senão fallback para o do perfil ou metadata
            const effectiveRole = (propRole || profileData?.role || user.user_metadata?.role || 'PF').toUpperCase();
            console.log('🔍 Effective Role for Plan Filtering:', effectiveRole);

            const { data: allPlans } = await supabase
                .from('plans')
                .select('*')
                .eq('status', 'Ativo')
                .eq('plan_type', effectiveRole === 'PJ' ? 'PJ' : 'PF')
                .neq('price', 0)
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

            // 4. Fetch Order History (Meus Pedidos)
            const { data: history, error: histErr } = await supabase
                .from('payment_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (histErr) console.warn('Histórico indisponível:', histErr.message);
            else if (history) setOrders(history);

        } catch (err) {
            console.error('Erro ao buscar dados do plano:', err);
        } finally {
            setLoading(false);
        }
    };

    const [upgradingId, setUpgradingId] = useState<string | null>(null);
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        if (!profile?.user_id) return;

        // Listener Real-time
        const channel = supabase
            .channel(`profile-${profile.user_id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'broker_profiles',
                filter: `user_id=eq.${profile.user_id}`
            }, (payload) => {
                // Se o plano ou o status mudou para algo diferente de gratuito/pendente
                if (payload.new.subscription_plan_id !== payload.old?.subscription_plan_id || payload.new.status !== payload.old?.status) {
                    fetchData();
                    if (payload.new.status === 'Ativo' && payload.old?.status !== 'Ativo') {
                        alert('🎉 Assinatura Ativada! Seu acesso foi liberado.');
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile?.user_id]);

    const handleUpgrade = async (plan: Plan) => {
        // Truque para evitar bloqueador de popups: abrir a janela IMEDIATAMENTE
        const paymentWindow = window.open('', 'MercadoPagoCheckout', 'width=800,height=800,scrollbars=yes');
        if (paymentWindow) {
            paymentWindow.document.write(`
                <div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 10px;">
                    <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="color: #64748b; font-weight: bold;">Preparando seu checkout...</p>
                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                </div>
            `);
        }

        try {
            setUpgradingId(plan.id);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                paymentWindow?.close();
                throw new Error('Faça login para continuar.');
            }

            const { mercadopagoService } = await import('../lib/mercadopago');
            const data = await mercadopagoService.createPreference(plan, user.id, user.email || '');

            if (data?.init_point) {
                if (paymentWindow) {
                    paymentWindow.location.href = data.init_point;

                    // POLLING: Consultar Mercado Pago diretamente a cada 4 segundos
                    const pollInterval = setInterval(async () => {
                        // Verificar se a janela foi fechada pelo usuário
                        if (paymentWindow.closed) {
                            clearInterval(pollInterval);
                            fetchData(); // Atualiza dados ao fechar manualmente
                            return;
                        }

                        try {
                            // Consultar API do Mercado Pago diretamente (usando ID da preferência)
                            const { mercadopagoService } = await import('../lib/mercadopago');
                            const checkResult = await mercadopagoService.checkPaymentStatus(user.id, plan.id, data.id);

                            if (checkResult?.paymentApproved) {
                                clearInterval(pollInterval);
                                paymentWindow.close();
                                alert('🎉 Pagamento Aprovado! Seu plano foi ativado com sucesso.');
                                fetchData();
                            }
                        } catch (pollErr) {
                            console.log('Polling check:', pollErr);
                        }
                    }, 4000);

                    // Timeout de 10 minutos para parar o polling
                    setTimeout(() => clearInterval(pollInterval), 600000);

                } else {
                    window.location.href = data.init_point;
                }
            } else {
                paymentWindow?.close();
                const mpError = data?.error_message || data?.message || 'Motivo desconhecido';
                throw new Error(`O Mercado Pago não gerou o link. Detalhe: ${mpError}`);
            }
        } catch (err: any) {
            paymentWindow?.close();
            console.error('Falha no Upgrade:', err);
            alert('Atenção: ' + (err.message || 'Ocorreu um erro ao iniciar o pagamento.'));
        } finally {
            setUpgradingId(null);
        }
    };

    const handleSyncStatus = async (order: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sessão expirada');

            const result = await mercadopagoService.checkPaymentStatus(user.id, order.plan_id, undefined, order.mp_id);

            if (result?.paymentApproved) {
                alert('✅ Pagamento Confirmado! Seu plano foi ativado.');
                fetchData();
            } else {
                alert(`Status atual: ${result?.latestStatus || 'Pendente'}. Caso já tenha pago, aguarde alguns minutos.`);
            }
        } catch (err: any) {
            alert('Erro ao sincronizar: ' + err.message);
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
                        <p className={`text-sm font-black uppercase tracking-tight ${profile?.status === 'Ativo' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {profile?.status || 'Pendente'}
                        </p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${profile?.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        <span className="material-symbols-outlined text-2xl">
                            {profile?.status === 'Ativo' ? 'verified' : 'pending_actions'}
                        </span>
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
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{currentPlan?.name || 'Assinatura Ativa'}</h2>
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
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">{plan.type === 'PJ' ? 'Plano Empresarial' : 'Corretor Independente'}</p>

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
                                <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">Você já possui o melhor plano para sua categoria!</h4>
                                <p className="text-xs text-slate-400 mt-2 font-medium">Interessado em soluções para equipes? Fale conosco.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Meus Pedidos / Histórico */}
            <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-1.5 h-6 rounded-full bg-slate-900" />
                    Meus Pedidos e Faturas
                </h3>

                <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5">Identificador</th>
                                <th className="px-8 py-5">Nº Transação MP</th>
                                <th className="px-8 py-5">Plano</th>
                                <th className="px-8 py-5">Data/Hora</th>
                                <th className="px-8 py-5">Valor</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map((order, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 font-bold text-slate-500 text-xs">#{order.id.slice(0, 8)}</td>
                                    <td className="px-8 py-5 font-mono text-[10px] text-slate-400">{order.mp_id || '-'}</td>
                                    <td className="px-8 py-5 font-black text-slate-900">{order.plan_name}</td>
                                    <td className="px-8 py-5 text-xs text-slate-500">
                                        {new Date(order.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-8 py-5 font-bold text-slate-700">R$ {parseFloat(order.amount).toFixed(2).replace('.', ',')}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${order.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                            order.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                                order.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                                                    order.status === 'refunded' ? 'bg-slate-100 text-slate-500' :
                                                        'bg-slate-50 text-slate-400'
                                            }`}>
                                            {order.status === 'approved' ? 'Pago' :
                                                order.status === 'pending' ? 'Aguardando' :
                                                    order.status === 'rejected' ? 'Recusado' :
                                                        order.status === 'refunded' ? 'Estornado' :
                                                            order.status === 'cancelled' ? 'Cancelado' :
                                                                order.status === 'charged_back' ? 'Contestação' :
                                                                    order.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        {order.status === 'pending' && order.init_point && (
                                            <div className="flex flex-col items-end gap-1">
                                                <button
                                                    onClick={() => window.open(order.init_point, 'MercadoPago', 'width=800,height=800')}
                                                    className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 underline tracking-widest"
                                                >
                                                    Pagar / Pix
                                                </button>
                                                <button
                                                    onClick={() => handleSyncStatus(order)}
                                                    className="text-[9px] font-bold uppercase text-slate-400 hover:text-blue-600 flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[12px]">sync</span>
                                                    Sincronizar
                                                </button>
                                            </div>
                                        )}
                                        {order.status === 'approved' && (
                                            <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] italic">Você ainda não possui histórico de pedidos.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Suporte WhatsApp */}
            <div className="p-8 bg-slate-900 rounded-[40px] text-white space-y-6 shadow-2xl shadow-slate-900/20">
                <h3 className="text-lg font-black tracking-tight leading-tight">Precisa de ajuda?</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Estamos aqui para te ajudar! Entre em contato pelo WhatsApp e tire suas dúvidas sobre planos e vistorias.</p>
                <a
                    href={supportWhatsapp ? `https://wa.me/${supportWhatsapp.replace(/\D/g, '')}?text=Olá! Preciso de ajuda com meu plano VaiVistoriar.` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-6 py-3 bg-green-500 hover:bg-green-400 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-colors shadow-lg"
                >
                    <span className="material-symbols-outlined text-lg">chat</span>
                    Falar com Suporte via WhatsApp
                </a>
            </div>
        </div>
    );
};

export default MyPlanPage;
