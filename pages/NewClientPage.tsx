
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const NewClientPage: React.FC = () => {
    // Basic Data
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [profileType, setProfileType] = useState<'Locatário' | 'Proprietário' | 'Vendedor' | 'Comprador'>('Locatário');
    const [documentNumber, setDocumentNumber] = useState('');

    // Address Data
    const [cep, setCep] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [complement, setComplement] = useState('');
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    const [avatarUrl, setAvatarUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

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
        } catch (err) {
            console.error('Erro ao buscar CEP:', err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        setError(null);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
        } catch (err: any) {
            console.error('Erro no upload:', err);
            setError('Erro ao enviar imagem. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { error: insertError } = await supabase
                .from('clients')
                .insert([
                    {
                        user_id: user.id,
                        name,
                        email,
                        phone,
                        profile_type: profileType,
                        document_number: documentNumber,
                        cep,
                        street,
                        number,
                        complement,
                        district,
                        city,
                        state,
                        address: `${street}, ${number} - ${district}, ${city}/${state}`, // Backward compatibility for lists
                        avatar_url: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
                    }
                ]);

            if (insertError) throw insertError;

            navigate('/clients');
        } catch (err: any) {
            console.error('Erro ao cadastrar cliente:', err);
            setError(err.message || 'Erro ao processar cadastro do cliente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight text-blue-600">Cadastrar Cliente</h1>
                    <p className="text-slate-500 mt-1">Adicione um novo cliente para vincular às vistorias e imóveis.</p>
                </div>
                <button
                    onClick={() => navigate('/clients')}
                    className="px-8 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
                >
                    Cancelar
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-12">
                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in shake">
                        <span className="material-symbols-outlined text-rose-500">error</span>
                        <p className="text-xs font-bold text-rose-600">{error}</p>
                    </div>
                )}

                {/* BASIC INFO */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-10 space-y-10">
                    <div className="flex items-center gap-4 text-slate-800">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">person_add</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Dados do Cliente</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Informações pessoais e de contato</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-10">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group w-32 h-32">
                                <div className="w-32 h-32 rounded-[32px] overflow-hidden bg-slate-100 border-4 border-white shadow-xl">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} className="w-full h-full object-cover" alt="Perfil" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <span className="material-symbols-outlined text-5xl">person</span>
                                        </div>
                                    )}
                                    {uploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" /></div>}
                                </div>
                                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-xl">add_a_photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Foto do Cliente</p>
                        </div>

                        <div className="flex-1 grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label>
                                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João da Silva" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Perfil</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Locatário', 'Proprietário', 'Vendedor', 'Comprador'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setProfileType(type as any)}
                                            className={`py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${profileType === type ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-50 text-slate-400 border-slate-50 hover:border-slate-200'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CPF / CNPJ</label>
                                <input type="text" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="000.000.000-00" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">WhatsApp / Telefone</label>
                                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ADDRESS INFO */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 space-y-10">
                    <div className="flex items-center gap-4 text-slate-800">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">location_on</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Endereço Residencial</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Localização do cliente</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">CEP (Busca Automática)</label>
                            <input type="text" value={cep} onBlur={handleCEPBlur} onChange={e => setCep(e.target.value)} placeholder="00000-000" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/5 text-sm font-bold" />
                        </div>

                        <div className="hidden md:block"></div> {/* Spacer */}

                        {/* Endereço Completo */}
                        <div className="md:col-span-2 grid grid-cols-3 gap-6">
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rua / Logradouro</label>
                                <input type="text" value={street} onChange={e => setStreet(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/5 text-sm font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número</label>
                                <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/5 text-sm font-bold" />
                            </div>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bairro</label>
                                <input type="text" value={district} onChange={e => setDistrict(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/5 text-sm font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Complemento</label>
                                <input type="text" value={complement} onChange={e => setComplement(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/5 text-sm font-bold" />
                            </div>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-3 gap-6">
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cidade</label>
                                <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/5 text-sm font-bold" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estado</label>
                                <input type="text" value={state} onChange={e => setState(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/5 text-sm font-bold" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading || uploading}
                        className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {loading ? 'Salvando...' : 'Salvar Cliente'}
                        {!loading && <span className="material-symbols-outlined text-[18px]">check</span>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewClientPage;
