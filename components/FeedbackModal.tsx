import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        if (!comment.trim()) {
            alert('Por favor, escreva algo sobre sua experiência.');
            setSending(false);
            return;
        }

        try {
            const { error } = await supabase.from('system_reviews').insert({
                rating,
                comment,
                user_id: (await supabase.auth.getUser()).data.user?.id
            });

            if (error) {
                console.warn('Feedback table missing?', error);
            }

            alert('Obrigado pela sua avaliação!');
            onClose();
            setRating(0);
            setComment('');
        } catch (err) {
            alert('Erro ao enviar.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-3xl text-yellow-500">star</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900">Avalie sua Experiência</h2>
                    <p className="text-sm text-slate-500 mt-1">Sua opinião é fundamental para nós.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                type="button"
                                key={star}
                                onClick={() => setRating(star)}
                                className={`transition-transform hover:scale-110 outline-none ${star <= rating ? 'text-yellow-400 fill-current material-symbols-outlined text-3xl' : 'text-slate-200 material-symbols-outlined text-3xl'}`}
                            >
                                star
                            </button>
                        ))}
                    </div>

                    <div>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                            placeholder="Conte-nos como foi sua experiência..."
                            required
                        ></textarea>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-sm">Cancelar</button>
                        <button type="submit" disabled={sending || rating === 0 || !comment.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200 text-sm">
                            {sending ? 'Enviando...' : 'Enviar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
