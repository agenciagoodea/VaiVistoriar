import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    is_approved?: boolean;
    broker_profiles: {
        full_name: string;
        avatar_url: string;
    } | null;
}

const ReviewList: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleToggleApproval = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;

        // 1. Atualização Otimista (feedback instantâneo na UI)
        setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: newStatus } : r));

        try {


            const { error } = await supabase
                .from('system_reviews')
                .update({ is_approved: newStatus })
                .eq('id', id);

            if (error) throw error;



            // Feedback via toast/alert (opcional se a UI já mudou)
            if (newStatus) {

            }
        } catch (err: any) {
            console.error('❌ Erro na sincronização:', err);
            // Reverter em caso de erro
            setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: currentStatus } : r));
            alert('❌ Erro ao salvar alteração: ' + err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.')) return;

        try {
            const { error } = await supabase
                .from('system_reviews')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchReviews(); // Refresh list
        } catch (err: any) {
            alert('Erro ao excluir avaliação: ' + err.message);
        }
    };

    const fetchReviews = async () => {
        try {
            // Tenta buscar com join (requer FK correta)
            const { data, error } = await supabase
                .from('system_reviews')
                .select(`
                    id, rating, comment, created_at, user_id, is_approved,
                    broker_profiles:user_id (full_name, avatar_url)
                `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.warn('Erro no join de avaliações, tentando busca manual...', error);

                // Fallback: Busca avaliações primeiro
                const { data: rawReviews, error: revError } = await supabase
                    .from('system_reviews')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (revError) throw revError;

                // Depois busca perfis
                const userIds = [...new Set(rawReviews.map(r => r.user_id))];
                const { data: profiles } = await supabase
                    .from('broker_profiles')
                    .select('user_id, full_name, avatar_url')
                    .in('user_id', userIds);

                const merged = rawReviews.map(r => ({
                    ...r,
                    broker_profiles: profiles?.find(p => p.user_id === r.user_id) || null
                }));

                setReviews(merged);
            } else {
                setReviews(data as any || []);
            }
        } catch (err) {
            console.error('Erro ao buscar avaliações:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center p-10">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full" />
        </div>
    );

    if (reviews.length === 0) return (
        <div className="text-center p-10 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Ainda não há avaliações da comunidade.</p>
        </div>
    );

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((r) => (
                <div key={r.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl hover:shadow-2xl transition-all space-y-4 relative">
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button
                            onClick={() => handleToggleApproval(r.id, !!r.is_approved)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${r.is_approved ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            title={r.is_approved ? 'Publicada - Clique para despublicar' : 'Pendente - Clique para publicar'}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {r.is_approved ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                        </button>
                        <button
                            onClick={() => handleDelete(r.id)}
                            className="w-8 h-8 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center justify-center"
                            title="Excluir avaliação"
                        >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md">
                            {r.broker_profiles?.avatar_url ? (
                                <img src={r.broker_profiles.avatar_url} alt={r.broker_profiles.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <span className="material-symbols-outlined text-xl">person</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate">
                                {r.broker_profiles?.full_name || 'Usuário do Sistema'}
                            </p>
                            <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className="material-symbols-outlined text-[14px] fill-current" style={{ fontVariationSettings: `'FILL' ${i < r.rating ? 1 : 0}` }}>
                                        star
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    {r.comment && (
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic line-clamp-3">
                            "{r.comment}"
                        </p>
                    )}
                    <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest text-right">
                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default ReviewList;
