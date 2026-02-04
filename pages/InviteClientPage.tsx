
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const InviteClientPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [client, setClient] = useState<any>(null);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [document, setDocument] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    useEffect(() => {
        if (id) fetchClient();
    }, [id]);

    const fetchClient = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setClient(data);
                setName(data.name || '');
                setEmail(data.email || '');
                setPhone(data.phone || '');
                setDocument(data.document_number || '');
            }
        } catch (err: any) {
            setError('Link inválido ou cliente não encontrado.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCEPBlur = async () => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setStreet(data.logradouro);
                setDistrict(data.bairro);
                setCity(data.localidade);
                setState(data.uf);
            }
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error: updateError } = await supabase
                .from('clients')
                .update({
                    name,
                    document_number: document,
                    email,
                    phone,
                    cep,
                    street,
                    number,
                    complement,
                    district,
                    city,
                    state,
                    address: `${street}, ${number} - ${district}, ${city}/${state}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    if (success) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center space-y-6 animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-5xl">check_circle</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900">Dados Enviados!</h1>
                <p className="text-slate-500">Obrigado por completar suas informações. Seus dados já foram atualizados no sistema.</p>
                <button onClick={() => window.close()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Fechar Janela</button>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-5xl">error</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900">Ops! Algo deu errado</h1>
                <p className="text-slate-500">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Completar Cadastro</h1>
                    <p className="text-slate-500">Por favor, confira e complete seus dados para o laudo de vistoria.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 p-8 md:p-12 space-y-10">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
                                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CPF / CNPJ</label>
                                <input required type="text" value={document} onChange={e => setDocument(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail</label>
                                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">WhatsApp / Telefone</label>
                                <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CEP</label>
                                <input type="text" value={cep} onBlur={handleCEPBlur} onChange={e => setCep(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rua / Logradouro</label>
                                <input type="text" value={street} onChange={e => setStreet(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número</label>
                                <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bairro</label>
                                <input type="text" value={district} onChange={e => setDistrict(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Complemento</label>
                                <input type="text" value={complement} onChange={e => setComplement(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cidade</label>
                                <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estado</label>
                                <input type="text" value={state} onChange={e => setState(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold" />
                            </div>
                        </div>

                        <button disabled={saving} type="submit" className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                            {saving ? 'Enviando...' : 'Confirmar meus Dados'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteClientPage;
