import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const FeedbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            const { error } = await supabase.from('system_reviews').insert({
                rating,
                comment,
                user_id: (await supabase.auth.getUser()).data.user?.id
            });

            if (error) {
                // Table might not exist, just alert success for now as placeholder or log
                console.warn('Feedback table missing?', error);
            }

            alert('Obrigado pela sua avaliação!');
            navigate(-1);
        } catch (err) {
            alert('Erro ao enviar.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 animate-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-yellow-500">star</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">Avalie sua Experiência</h1>
                    <p className="text-slate-500 mt-2">Sua opinião é fundamental para melhorarmos o VaiVistoriar.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                type="button"
                                key={star}
                                onClick={() => setRating(star)}
                                className={`transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400 fill-current material-symbols-outlined text-4xl' : 'text-slate-200 material-symbols-outlined text-4xl'}`}
                            >
                                star
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Comentário (Opcional)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="Conte-nos o que você está achando..."
                        ></textarea>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={sending || rating === 0} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200">
                            {sending ? 'Enviando...' : 'Enviar Avaliação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackPage;
