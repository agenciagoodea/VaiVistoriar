
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const EditClientPage: React.FC = () => {
    const { id } = useParams();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [profileType, setProfileType] = useState<'Locatário' | 'Proprietário' | 'Vendedor' | 'Comprador'>('Locatário');
    const [documentNumber, setDocumentNumber] = useState('');
    const [address, setAddress] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchClient();
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
                setName(data.name);
                setEmail(data.email || '');
                setPhone(data.phone || '');
                setProfileType(data.profile_type);
                setDocumentNumber(data.document_number || '');
                setAddress(data.address || '');
                setAvatarUrl(data.avatar_url || '');
            }
        } catch (err: any) {
            console.error('Erro ao buscar cliente:', err);
            setError('Não foi possível carregar os dados do cliente.');
        } finally {
            setLoading(false);
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
        setSaving(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('clients')
                .update({
                    name,
                    email,
                    phone,
                    profile_type: profileType,
                    document_number: documentNumber,
                    address,
                    avatar_url: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
                })
                .eq('id', id);

            if (updateError) throw updateError;

            navigate('/clients');
        } catch (err: any) {
            console.error('Erro ao atualizar cliente:', err);
            setError(err.message || 'Erro ao processar atualização do cliente.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando dados...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Editar Cliente</h1>
                    <p className="text-slate-500 mt-1">Atualize as informações do seu cliente.</p>
                </div>
                <button
                    onClick={() => navigate('/clients')}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <span className="material-symbols-outlined text-[32px]">close</span>
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
                            <span className="material-symbols-outlined text-rose-500">error</span>
                            <p className="text-xs font-bold text-rose-600">{error}</p>
                        </div>
                    )}

                    <div className="flex flex-col items-center mb-8">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-slate-400 text-4xl">person</span>
                                )}

                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                    </div>
                                )}

                                <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                                    <span className="text-[8px] font-bold uppercase tracking-tighter">Alterar Foto</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                </label>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Avatar do Cliente</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                                Dados Básicos
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ex: João da Silva"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Perfil</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Locatário', 'Proprietário', 'Vendedor', 'Comprador'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setProfileType(type as any)}
                                                className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${profileType === type ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-50 text-slate-400 border-slate-50 hover:border-slate-200'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF / CNPJ (Opcional)</label>
                                    <input
                                        type="text"
                                        value={documentNumber}
                                        onChange={(e) => setDocumentNumber(e.target.value)}
                                        placeholder="000.000.000-00"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">contact_page</span>
                                Contato & Localização
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="cliente@email.com"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Residencial (Opcional)</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Rua, número, bairro..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row gap-4 justify-end">
                        <button
                            type="button"
                            onClick={() => navigate('/clients')}
                            className="px-8 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || uploading}
                            className="px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/25 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    Salvar Alterações
                                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditClientPage;
