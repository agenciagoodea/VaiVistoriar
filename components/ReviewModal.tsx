import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface ReviewModalProps {
    session: Session | null;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ session }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session?.user) {
            checkReviewStatus();
        }
    }, [session]);

    const checkReviewStatus = async () => {
        // 1. Check local storage for "remind later"
        const remindLater = localStorage.getItem('review_remind_later');
        if (remindLater) {
            const date = new Date(remindLater);
            // If dismissed less than 2 days ago, don't show
            if (new Date().getTime() - date.getTime() < 2 * 24 * 60 * 60 * 1000) {
                return;
            }
        }

        // 2. Check DB if user already reviewed
        try {
            const { data, error } = await supabase
                .from('system_reviews')
                .select('id')
                .eq('user_id', session?.user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                console.error('Error checking review', error);
            }

            if (!data) {
                // No review found, show modal
                // Wait a bit so it doesn't pop up immediately on login
                setTimeout(() => setIsOpen(true), 3000);
            }
        } catch (e) {
            console.error('Error checking review', e);
        }
    };

    const handleRemindLater = () => {
        localStorage.setItem('review_remind_later', new Date().toISOString());
        setIsOpen(false);
    };

    const handleSubmit = async () => {
        if (rating === 0) return alert('Por favor, selecione uma nota de 1 a 5.');
        setLoading(true);
        try {
            const { error } = await supabase.from('system_reviews').insert({
                user_id: session?.user.id,
                rating,
                comment
            });

            if (error) throw error;

            alert('Obrigado pela sua avaliação!');
            setIsOpen(false);
        } catch (err: any) {
            console.error(err);
            alert('Erro ao enviar avaliação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-md w-full p-10 relative overflow-hidden text-center space-y-8 animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                <div className="space-y-4">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 mb-6">
                        <span className="material-symbols-outlined text-[40px]">star</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">O que está achando?</h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed">Sua opinião é fundamental para evoluirmos! Avalie o VaiVistoriar:</p>
                </div>

                <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`transition-transform hover:scale-110 focus:outline-none ${rating >= star ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200'}`}
                        >
                            <span className="material-symbols-outlined text-[40px] fill-current" style={{ fontVariationSettings: `'FILL' ${rating >= star ? 1 : 0}` }}>star</span>
                        </button>
                    ))}
                </div>

                <textarea
                    rows={3}
                    placeholder="Deixe um comentário (opcional)..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-colors shadow-xl"
                    >
                        {loading ? 'Enviando...' : 'Enviar Avaliação'}
                    </button>
                    <button
                        onClick={handleRemindLater}
                        className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Lembrar depois w
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
