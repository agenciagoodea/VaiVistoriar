
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const ReportsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalSubscribers: 0,
        activeRevenue: 0,
        totalInspections: 0,
        newUsersLast30Days: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);

                // Admin Function Call
                const { data: metrics, error } = await supabase.functions.invoke('admin-dash', {
                    body: { action: 'get_metrics' }
                });

                if (error) throw error;

                if (metrics && metrics.stats) {
                    setStats({
                        totalSubscribers: metrics.stats.activeSubs || 0,
                        activeRevenue: metrics.stats.mrr || 0,
                        totalInspections: metrics.stats.totalInspections || 0,
                        newUsersLast30Days: metrics.stats.newUsers30d || 0
                    });
                }

            } catch (err) {
                console.error('Erro ao buscar estatísticas:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400">Gerando relatórios...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Relatórios e Métricas</h1>
                <p className="text-slate-500 mt-1">Visão geral do desempenho e crescimento da plataforma.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-2xl">group</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assinantes Ativos</p>
                    <p className="text-3xl font-black text-slate-900">{stats.totalSubscribers}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-2xl">payments</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita Mensal Est.</p>
                    <p className="text-3xl font-black text-slate-900">R$ {stats.activeRevenue.toFixed(2).replace('.', ',')}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-2xl">assignment</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Vistorias</p>
                    <p className="text-3xl font-black text-slate-900">{stats.totalInspections}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-2xl">trending_up</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Novas Contas (30d)</p>
                    <p className="text-3xl font-black text-slate-900">{stats.newUsersLast30Days}</p>
                </div>
            </div>

            <div className="bg-slate-900 p-10 rounded-[40px] text-white">
                <h2 className="text-2xl font-black tracking-tight mb-4">Análise Geográfica e de Uso</h2>
                <p className="text-slate-400 max-w-lg mb-8">Esta seção será expandida com mapas de calor e gráficos de uso intenso por região assim que mais dados forem coletados.</p>
                <div className="h-48 bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-700 border-dashed">
                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Gráficos em Desenvolvimento</span>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
