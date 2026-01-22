
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const LoginPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [identifier, setIdentifier] = useState(''); // CPF, CNPJ ou E-mail
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [role, setRole] = useState<'BROKER' | 'PJ'>('BROKER');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [brand, setBrand] = useState({ primaryColor: '#2563eb', logoUrl: '' });

    const navigate = useNavigate();

    React.useEffect(() => {
        const fetchConfigs = async () => {
            const { data } = await supabase.from('system_configs').select('*');
            if (data) {
                const primary = data.find(c => c.key === 'home_primary_color')?.value;
                const logo = data.find(c => c.key === 'home_logo_url')?.value;
                if (primary || logo) setBrand({ primaryColor: primary || '#2563eb', logoUrl: logo || '' });
            }
        };
        fetchConfigs();
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                let loginEmail = '';
                const cleanId = identifier.replace(/\D/g, '');

                if (!cleanId) {
                    throw new Error('Por favor, informe o CPF ou CNPJ.');
                }

                // Busca o e-mail associado ao CPF/CNPJ no banco usando RPC
                const { data: fetchedEmail, error: rpcError } = await supabase
                    .rpc('get_email_by_cpf', { p_cpf_cnpj: cleanId });

                if (rpcError) throw rpcError;

                if (fetchedEmail) {
                    loginEmail = fetchedEmail;
                } else {
                    throw new Error('CPF/CNPJ não cadastrado.');
                }

                const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
                    email: loginEmail,
                    password,
                });

                if (signInError) throw signInError;

                // Controle de Sessão Única
                const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                await supabase.from('broker_profiles').update({
                    current_session_id: sessionId
                }).eq('user_id', session?.user.id);

                localStorage.setItem('vpro_session_token', sessionId);
                navigate('/admin');
            } else {
                const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                    email: identifier,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: role,
                            cpf_cnpj: cpfCnpj.replace(/\D/g, '')
                        },
                    },
                });

                if (signUpError) throw signUpError;

                // O trigger DB handle_new_user_trial_insert cuidará de atribuir o plano trial.
                setMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro durante a autenticação.');
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
                <div className="p-8 pb-4 text-center">
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
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
                    </h2>
                    <p className="text-slate-400 font-medium text-sm mt-2">
                        {isLogin ? 'Entre com suas credenciais para continuar' : 'Comece sua jornada profissional hoje'}
                    </p>
                </div>

                <div className="px-8 pb-8 pt-4">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                            <span className="material-symbols-outlined text-rose-500">error</span>
                            <p className="text-xs font-bold text-rose-600">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                            <p className="text-xs font-bold text-emerald-600">{message}</p>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {!isLogin && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-[20px]">person</span>
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Seu nome"
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-300 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setRole('BROKER')}
                                            className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${role === 'BROKER' ? 'text-white shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-50 hover:border-slate-200'}`}
                                            style={{
                                                backgroundColor: role === 'BROKER' ? brand.primaryColor : undefined,
                                                borderColor: role === 'BROKER' ? brand.primaryColor : undefined,
                                                boxShadow: role === 'BROKER' ? `0 10px 15px -3px ${brand.primaryColor}40` : undefined
                                            }}
                                        >
                                            Corretor (PF)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole('PJ')}
                                            className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${role === 'PJ' ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/20' : 'bg-slate-50 text-slate-400 border-slate-50 hover:border-slate-200'}`}
                                        >
                                            Imobiliária (PJ)
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                {isLogin ? 'CPF ou CNPJ' : (role === 'BROKER' ? 'Seu CPF' : 'C.N.P.J da Empresa')}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-[20px]">
                                    {isLogin ? 'badge' : (role === 'BROKER' ? 'person_pin' : 'business_center')}
                                </span>
                                <input
                                    type="text"
                                    required
                                    value={isLogin ? identifier : cpfCnpj}
                                    onChange={(e) => isLogin ? setIdentifier(e.target.value) : setCpfCnpj(e.target.value)}
                                    placeholder={role === 'BROKER' ? "000.000.000-00" : "00.000.000/0000-00"}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-300 font-medium"
                                />
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail para Login</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-[20px]">mail</span>
                                    <input
                                        type="email"
                                        required
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-300 font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha</label>
                                {isLogin && <button type="button" className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">Esqueceu?</button>}
                            </div>
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
                                    {isLogin ? 'Entrar no Sistema' : 'Criar minha Conta'}
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                        <p className="text-slate-400 text-xs font-medium">
                            {isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="ml-2 font-black uppercase tracking-wider hover:underline"
                                style={{ color: brand.primaryColor }}
                            >
                                {isLogin ? 'Cadastre-se grátis' : 'Fazer Login'}
                            </button>
                        </p>
                    </div>

                    <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-black text-slate-300 uppercase tracking-widest border-t border-slate-50 pt-6">
                        <Link to="/" className="hover:opacity-70 transition-opacity flex items-center gap-1.5" style={{ color: brand.primaryColor }}>
                            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                            Início
                        </Link>
                        <Link to="/terms" className="hover:opacity-70 transition-opacity" style={{ color: brand.primaryColor }}>Termos</Link>
                        <Link to="/privacy" className="hover:opacity-70 transition-opacity" style={{ color: brand.primaryColor }}>Privacidade</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
