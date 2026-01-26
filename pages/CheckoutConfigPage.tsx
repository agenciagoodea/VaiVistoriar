
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CheckoutConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mpAccessToken, setMpAccessToken] = useState('');
    const [mpPublicKey, setMpPublicKey] = useState('');
    const [testingMP, setTestingMP] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data } = await supabase.from('system_configs').select('*');
            if (data) {
                const mpAT = data.find(c => c.key === 'mercadopago_access_token');
                const mpPK = data.find(c => c.key === 'mercadopago_public_key');

                if (mpAT) setMpAccessToken(mpAT.value);
                if (mpPK) setMpPublicKey(mpPK.value);
            }
        } catch (err) {
            console.error('Erro ao buscar configurações:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'mercadopago_access_token', value: mpAccessToken, updated_at: new Date() },
                { key: 'mercadopago_public_key', value: mpPublicKey, updated_at: new Date() }
            ];

            for (const up of updates) {
                await supabase.from('system_configs').upsert(up);
            }

            alert('Configurações do Mercado Pago salvas!');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTestMP = async () => {
        setTestingMP(true);
        try {
            const { mercadopagoService } = await import('../lib/mercadopago');
            const result = await mercadopagoService.testToken(mpAccessToken);
            alert(`Conexão OK! Usuário: ${result.nickname} (${result.id})`);
        } catch (err: any) {
            alert(`Erro no Teste: ${err.message}`);
        } finally {
            setTestingMP(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse">Carregando Checkout...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout e Pagamentos</h1>
                    <p className="text-slate-500 mt-1">Configure as credenciais do Mercado Pago e páginas de retorno.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-bold"
                >
                    {saving ? 'Salvando...' : 'Salvar Credenciais'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-blue-600">payments</span>
                            <h3 className="font-bold text-slate-900">Mercado Pago</h3>
                        </div>
                        <button
                            onClick={handleTestMP}
                            disabled={testingMP}
                            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
                        >
                            {testingMP ? 'Testando...' : (
                                <>
                                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                                    Testar Token
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
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Public Key</label>
                                <input
                                    type="text"
                                    value={mpPublicKey}
                                    onChange={(e) => setMpPublicKey(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="material-symbols-outlined text-blue-600">link</span>
                        <h3 className="font-bold text-slate-900">Endpoints de Retorno (URLs de Webhook)</h3>
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">Utilize as seguintes URLs nas configurações do Mercado Pago para redirecionar o usuário após o pagamento:</p>
                        <div className="space-y-2">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sucesso</p>
                                    <code className="text-xs font-mono text-blue-600">/checkout/success</code>
                                </div>
                                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Falha</p>
                                    <code className="text-xs font-mono text-rose-600">/checkout/failure</code>
                                </div>
                                <span className="material-symbols-outlined text-rose-500">error</span>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendente</p>
                                    <code className="text-xs font-mono text-amber-600">/checkout/pending</code>
                                </div>
                                <span className="material-symbols-outlined text-amber-500">pending</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutConfigPage;
