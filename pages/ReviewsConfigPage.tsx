
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import ReviewList from '../components/ReviewList';

const ReviewsConfigPage: React.FC = () => {
    const [saving, setSaving] = useState(false);

    const handleRequestReviews = async () => {
        if (!confirm('Deseja realmente solicitar uma avaliação a todos os usuários ativos no próximo acesso?')) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('system_configs').upsert({
                key: 'review_request_timestamp',
                value: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

            if (error) throw error;
            alert('Solicitação disparada! Os usuários verão o convite no próximo login.');
        } catch (err: any) {
            alert('Erro ao solicitar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">6. Avaliações da Comunidade</h1>
                    <p className="text-slate-500 mt-1">Gerencie depoimentos e solicite novos feedbacks</p>
                </div>
                <button
                    onClick={handleRequestReviews}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100 transition-all active:scale-95 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[18px]">campaign</span>
                    {saving ? 'PROCESSANDO...' : 'SOLICITAR A TODOS'}
                </button>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-8">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Depoimentos Recentes</h3>
                    <div className="flex gap-1 text-amber-400">
                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                    </div>
                </div>

                <div className="min-h-[400px]">
                    <ReviewList />
                </div>
            </div>
        </div>
    );
};

export default ReviewsConfigPage;
