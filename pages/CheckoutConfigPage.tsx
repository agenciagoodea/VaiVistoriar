import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CheckoutConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Credenciais de Produção
    const [mpAccessToken, setMpAccessToken] = useState('');
    const [mpPublicKey, setMpPublicKey] = useState('');

    // Credenciais de Testes / Sandbox
    const [mpTestAccessToken, setMpTestAccessToken] = useState('');
    const [mpTestPublicKey, setMpTestPublicKey] = useState('');

    // Modo de Operação (production | sandbox)
    const [mpMode, setMpMode] = useState<'production' | 'sandbox'>('production');

    const [testingProd, setTestingProd] = useState(false);
    const [testingTest, setTestingTest] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data } = await supabase.from('system_configs').select('*');
            if (data) {
                const mpAT = data.find(c => c.key === 'mercadopago_access_token');
                const mpPK = data.find(c => c.key === 'mercadopago_public_key');
                const mpTAT = data.find(c => c.key === 'mercadopago_test_access_token');
                const mpTPK = data.find(c => c.key === 'mercadopago_test_public_key');
                const mode = data.find(c => c.key === 'mercadopago_mode');

                if (mpAT) setMpAccessToken(mpAT.value);
                if (mpPK) setMpPublicKey(mpPK.value);
                if (mpTAT) setMpTestAccessToken(mpTAT.value);
                if (mpTPK) setMpTestPublicKey(mpTPK.value);
                if (mode && (mode.value === 'production' || mode.value === 'sandbox')) {
                    setMpMode(mode.value as 'production' | 'sandbox');
                }
            }
        } catch (err) {
            console.error('Erro ao buscar configurações do checkout:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'mercadopago_access_token', value: mpAccessToken.trim() },
                { key: 'mercadopago_public_key', value: mpPublicKey.trim() },
                { key: 'mercadopago_test_access_token', value: mpTestAccessToken.trim() },
                { key: 'mercadopago_test_public_key', value: mpTestPublicKey.trim() },
                { key: 'mercadopago_mode', value: mpMode }
            ];

            for (const up of updates) {
                await supabase.from('system_configs').upsert(up);
            }

            alert('Configurações do Mercado Pago salvas com sucesso!');
        } catch (err: any) {
            alert(`Erro ao salvar configurações: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleTestMP = async (tokenToTest: string, type: 'prod' | 'test') => {
        if (type === 'prod') setTestingProd(true);
        else setTestingTest(true);

        try {
            if (!tokenToTest.trim()) {
                alert(`Informe o Access Token de ${type === 'prod' ? 'Produção' : 'Testes'} antes de testar.`);
                return;
            }

            const { mercadopagoService } = await import('../lib/mercadopago');
            const result = await mercadopagoService.testToken(tokenToTest.trim());

            if (result.success === false) {
                let errorDetails = result.message || result.error || 'Erro desconhecido';
                if (result.mp_status === 401) errorDetails = 'Access Token inválido ou expirado.';
                if (result.mp_status === 403) errorDetails = 'A conta não tem permissão para acessar este recurso.';

                alert(`Erro no Mercado Pago (${type === 'prod' ? 'Produção' : 'Testes'}): ${errorDetails}`);
                return;
            }

            alert(`✅ Conexão OK (${type === 'prod' ? 'Produção' : 'Testes'})!\nUsuário: ${result.nickname || 'OK'} (ID: ${result.id || 'N/A'})\nTipo: ${result.user_type || 'Conta Ativa'}\nPaís/Site: ${result.site_id || 'MLB'}`);
        } catch (err: any) {
            alert(`Erro na Conexão (${type === 'prod' ? 'Produção' : 'Testes'}): ${err.message}`);
        } finally {
            if (type === 'prod') setTestingProd(false);
            else setTestingTest(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse">Carregando Checkout...</div>;

    const webhookUrl = 'https://vaivistoriar.com.br/api/functions/mercadopago-webhook';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout e Pagamentos</h1>
                    <p className="text-slate-500 mt-1">Configure as credenciais do Mercado Pago, modo de testes e Webhook de notificações.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                    {saving ? 'Salvando...' : 'Salvar Credenciais'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Seleção do Modo de Operação */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-600">settings_applications</span>
                        <h3 className="font-bold text-slate-900">Modo de Operação do Mercado Pago</h3>
                    </div>
                    <p className="text-sm text-slate-500">Escolha qual ambiente das credenciais o sistema deve utilizar para processar assinaturas:</p>
                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                        <label className={`p-5 rounded-2xl border-2 cursor-pointer flex items-center gap-4 transition-all ${mpMode === 'production' ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
                            <input
                                type="radio"
                                name="mpMode"
                                value="production"
                                checked={mpMode === 'production'}
                                onChange={() => setMpMode('production')}
                                className="w-5 h-5 text-blue-600"
                            />
                            <div>
                                <p className="font-bold text-slate-900 text-sm">Modo Produção (Valores Reais)</p>
                                <p className="text-xs text-slate-500 mt-0.5">Processa pagamentos reais de clientes via Mercado Pago.</p>
                            </div>
                        </label>
                        <label className={`p-5 rounded-2xl border-2 cursor-pointer flex items-center gap-4 transition-all ${mpMode === 'sandbox' ? 'border-amber-600 bg-amber-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
                            <input
                                type="radio"
                                name="mpMode"
                                value="sandbox"
                                checked={mpMode === 'sandbox'}
                                onChange={() => setMpMode('sandbox')}
                                className="w-5 h-5 text-amber-600"
                            />
                            <div>
                                <p className="font-bold text-amber-900 text-sm">Modo Sandbox / Testes</p>
                                <p className="text-xs text-slate-500 mt-0.5">Utiliza credenciais de teste para simulação sem cobrança real.</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Credenciais de Produção */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-emerald-600">verified_user</span>
                            <h3 className="font-bold text-slate-900">Credenciais de Produção</h3>
                        </div>
                        <button
                            onClick={() => handleTestMP(mpAccessToken, 'prod')}
                            disabled={testingProd}
                            className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center gap-2"
                        >
                            {testingProd ? 'Testando...' : (
                                <>
                                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                                    Testar Token Produção
                                </>
                            )}
                        </button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Access Token (Produção)</label>
                                <input
                                    type="password"
                                    value={mpAccessToken}
                                    onChange={(e) => setMpAccessToken(e.target.value)}
                                    placeholder="APP_USR-..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Public Key (Produção)</label>
                                <input
                                    type="text"
                                    value={mpPublicKey}
                                    onChange={(e) => setMpPublicKey(e.target.value)}
                                    placeholder="APP_USR-..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Credenciais de Testes / Sandbox */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-amber-600">science</span>
                            <h3 className="font-bold text-slate-900">Credenciais de Testes (Sandbox)</h3>
                        </div>
                        <button
                            onClick={() => handleTestMP(mpTestAccessToken, 'test')}
                            disabled={testingTest}
                            className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all flex items-center gap-2"
                        >
                            {testingTest ? 'Testando...' : (
                                <>
                                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                                    Testar Token Teste
                                </>
                            )}
                        </button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Test Access Token (Sandbox)</label>
                                <input
                                    type="password"
                                    value={mpTestAccessToken}
                                    onChange={(e) => setMpTestAccessToken(e.target.value)}
                                    placeholder="TEST-..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Test Public Key (Sandbox)</label>
                                <input
                                    type="text"
                                    value={mpTestPublicKey}
                                    onChange={(e) => setMpTestPublicKey(e.target.value)}
                                    placeholder="TEST-..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Webhook e Endpoints */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="material-symbols-outlined text-blue-600">link</span>
                        <h3 className="font-bold text-slate-900">Endpoints de Webhook e Retorno de Pagamento</h3>
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">Cadastre a URL do Webhook no painel de desenvolvedores do Mercado Pago para atualização automática das assinaturas:</p>
                        <div className="space-y-3">
                            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">URL do WebHook (Notificações de Pagamento)</p>
                                    <code className="text-xs font-mono font-bold text-purple-900 block select-all">{webhookUrl}</code>
                                </div>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(webhookUrl); alert('URL do Webhook copiada!'); }}
                                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-1 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                    Copiar URL
                                </button>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retorno - Sucesso</p>
                                    <code className="text-xs font-mono text-blue-600">/#/checkout/success</code>
                                </div>
                                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retorno - Falha</p>
                                    <code className="text-xs font-mono text-rose-600">/#/checkout/failure</code>
                                </div>
                                <span className="material-symbols-outlined text-rose-500">error</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Guia explicativo */}
                <div className="bg-slate-900 rounded-[40px] p-10 text-white space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-400 text-3xl">help_center</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black">Como configurar o Mercado Pago?</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Guia de Integração para Assinaturas</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <h4 className="font-black text-blue-400 uppercase text-[10px] tracking-widest">1. Obter Credenciais</h4>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Acesse o <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" className="text-blue-400 underline" rel="noreferrer">Painel do Desenvolvedor</a>, selecione sua aplicação e vá em <strong>Credenciais de Produção</strong> ou <strong>Credenciais de Teste</strong>. Copie o <i>Access Token</i> e a <i>Public Key</i>.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-black text-blue-400 uppercase text-[10px] tracking-widest">2. Webhook de Notificações</h4>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                No painel do Mercado Pago, cadastre a URL do <strong>WebHook</strong> informada acima e selecione os eventos de <i>Pagamentos</i>. Sempre que um pagamento for aprovado, o plano do usuário será ativado automaticamente.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-black text-blue-400 uppercase text-[10px] tracking-widest">3. Teste de Validação</h4>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Utilize os botões <strong>Testar Token</strong> para checar em tempo real a comunicação da sua chave diretamente com a API oficial do Mercado Pago.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-black text-emerald-400 uppercase text-[10px] tracking-widest">Dica Premium</h4>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Certifique-se de que sua conta do Mercado Pago está ativa e validada para receber pagamentos PIX e Cartão de Crédito.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutConfigPage;
