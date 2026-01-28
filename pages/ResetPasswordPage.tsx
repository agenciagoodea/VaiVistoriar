
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [brand, setBrand] = useState({ primaryColor: '#2563eb', logoUrl: '' });

    const navigate = useNavigate();

    useEffect(() => {
        const fetchConfigs = async () => {
            const { data } = await supabase.from('system_configs').select('*');
            if (data) {
                const primary = data.find(c => c.key === 'home_primary_color')?.value;
                const logo = data.find(c => c.key === 'home_logo_url')?.value;
                if (primary || logo) setBrand({ primaryColor: primary || '#2563eb', logoUrl: logo || '' });
            }
        };
        fetchConfigs();

        // Verificar se temos o token na URL (o Supabase lida com isso se estivermos na rota de redirecionamento)
        // Se o usuário chegar aqui sem uma sessão de recuperação, algo está errado
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError('Link de recuperação inválido ou expirado.');
            }
        });
    }, []);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setMessage('Senha alterada com sucesso! Redirecionando para o login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Erro ao redefinir a senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-['Inter']">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[100px]" style={{ backgroundColor: `${brand.primaryColor}15` }}></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[100px]" style={{ backgroundColor: `${brand.primaryColor}10` }}></div>
            </div>

            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden transform transition-all">
                <div className="p-6 md:p-8 pb-4 text-center">
                    <div className="inline-flex items-center gap-2 mb-6" style={{ color: brand.primaryColor }}>
                        {brand.logoUrl ? (
                            <img src={brand.logoUrl} className="h-10 w-auto object-contain" alt="Logo" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined font-bold text-4xl">home_app_logo</span>
                                <span className="text-2xl font-black text-slate-900 tracking-tight">VistoriaPro</span>
                            </>
                        )}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nova Senha</h2>
                    <p className="text-slate-400 font-medium text-sm mt-2">Defina sua nova credencial de acesso</p>
                </div>

                <div className="px-8 pb-8 pt-4">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
                            <span className="material-symbols-outlined text-rose-500">error</span>
                            <p className="text-xs font-bold text-rose-600">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                            <p className="text-xs font-bold text-emerald-600">{message}</p>
                        </div>
                    )}

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-[20px]">lock_open</span>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-[20px]">lock_clock</span>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-xl transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            style={{
                                backgroundColor: brand.primaryColor,
                                boxShadow: `0 20px 25px -5px ${brand.primaryColor}40`
                            }}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    Atualizar Senha
                                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
