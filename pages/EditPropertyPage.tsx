
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const EditPropertyPage: React.FC = () => {
    const { id } = useParams();
    const [cep, setCep] = useState('');
    const [name, setName] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [complement, setComplement] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [iptu, setIptu] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [type, setType] = useState<'Apartamento' | 'Casa' | 'Comercial'>('Apartamento');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [area, setArea] = useState('');
    const [description, setDescription] = useState('');
    const [facadeUrl, setFacadeUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchClients();
        fetchProperty();
    }, [id]);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('id, name')
                .order('name');
            if (error) throw error;
            setClients(data || []);
        } catch (err) {
            console.error('Erro ao buscar clientes:', err);
        }
    };

    const fetchProperty = async () => {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setName(data.name);
                setStreet(data.address);
                setNumber(data.number || '');
                setNeighborhood(data.neighborhood || '');
                setComplement(data.complement || '');
                setCity(data.city || '');
                setState(data.state || '');
                setIptu(data.iptu_number || '');
                setCep(data.cep || '');
                setOwnerId(data.owner_id || '');
                setType(data.type);
                setRegistrationNumber(data.registration_number || '');
                setArea(data.area_m2?.toString() || '');
                setDescription(data.description || '');
                setFacadeUrl(data.image_url || '');
            }
        } catch (err) {
            console.error('Erro ao buscar imóvel:', err);
            setError('Não foi possível carregar os dados do imóvel.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAddressByCep = async (cepValue: string) => {
        const cleanCep = cepValue.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setStreet(data.logradouro);
                    setNeighborhood(data.bairro);
                    setCity(data.localidade);
                    setState(data.uf);
                }
            } catch (err) {
                console.error('Erro ao buscar CEP:', err);
            }
        }
    };

    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);

        let maskedValue = value;
        if (value.length > 5) {
            maskedValue = `${value.slice(0, 5)}-${value.slice(5)}`;
        }

        setCep(maskedValue);
        if (value.length === 8) fetchAddressByCep(value);
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
                .from('property-photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('property-photos')
                .getPublicUrl(filePath);

            setFacadeUrl(publicUrl);
        } catch (err: any) {
            console.error('Erro no upload:', err);
            setError('Erro ao enviar imagem da fachada.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const selectedClient = clients.find(c => c.id === ownerId);

            const { error: updateError } = await supabase
                .from('properties')
                .update({
                    name,
                    address: street,
                    number,
                    neighborhood,
                    complement,
                    city,
                    state,
                    cep,
                    owner: selectedClient ? selectedClient.name : '',
                    owner_id: ownerId || null,
                    type,
                    registration_number: registrationNumber,
                    iptu_number: iptu,
                    area_m2: area ? parseFloat(area) : null,
                    description,
                    image_url: facadeUrl
                })
                .eq('id', id);

            if (updateError) throw updateError;

            navigate('/properties');
        } catch (err: any) {
            console.error('Erro ao atualizar imóvel:', err);
            setError(err.message || 'Erro ao processar atualização do imóvel.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando imóvel...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Editar Imóvel</h1>
                    <p className="text-slate-500 mt-1">Atualize as informações técnicas do imóvel.</p>
                </div>
                <button
                    onClick={() => navigate('/properties')}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                        {/* Upload de Fachada */}
                        <div className="md:col-span-1 space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto da Fachada</p>
                            <div className="relative group aspect-[4/3] rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                {facadeUrl ? (
                                    <img src={facadeUrl} alt="Fachada" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-4">
                                        <span className="material-symbols-outlined text-slate-300 text-4xl">add_a_photo</span>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Toque para subir</p>
                                    </div>
                                )}

                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                    </div>
                                )}

                                <label className="absolute inset-0 cursor-pointer">
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                </label>
                            </div>
                        </div>

                        <div className="md:col-span-2 grid md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proprietário Vinculado</label>
                                <select
                                    value={ownerId}
                                    onChange={(e) => setOwnerId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer"
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Imóvel / Unidade</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Ed. Horizonte, Apto 302"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Matrícula / IPTU</label>
                                <input
                                    type="text"
                                    value={iptu}
                                    onChange={(e) => setIptu(e.target.value)}
                                    placeholder="Número do IPTU ou matrícula"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500/10 outline-none cursor-pointer"
                                >
                                    <option value="Apartamento">Apartamento</option>
                                    <option value="Casa">Casa</option>
                                    <option value="Comercial">Comercial</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Área (m²)</label>
                                <input
                                    type="number"
                                    value={area}
                                    onChange={(e) => setArea(e.target.value)}
                                    placeholder="Ex: 75.5"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 pt-4">
                        {/* Coluna da Esquerda: Endereço e CEP */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">location_on</span>
                                Localização & Endereço
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CEP (Busca Automática)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={cep}
                                            onChange={handleCepChange}
                                            placeholder="00000-000"
                                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logradouro</label>
                                        <input
                                            type="text"
                                            required
                                            value={street}
                                            onChange={(e) => setStreet(e.target.value)}
                                            placeholder="Ex: Rua São Paulo"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número</label>
                                        <input
                                            type="text"
                                            required
                                            value={number}
                                            onChange={(e) => setNumber(e.target.value)}
                                            placeholder="Ex: 500"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                                        <input
                                            type="text"
                                            required
                                            value={neighborhood}
                                            onChange={(e) => setNeighborhood(e.target.value)}
                                            placeholder="Ex: Centro"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Complemento</label>
                                        <input
                                            type="text"
                                            value={complement}
                                            onChange={(e) => setComplement(e.target.value)}
                                            placeholder="Ex: Apto 101"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-3 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                                        <input
                                            type="text"
                                            required
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="Ex: Manaus"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">UF</label>
                                        <input
                                            type="text"
                                            required
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            placeholder="AM"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna da Direita: Mapa e Detalhes */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">map</span>
                                Visualização no Mapa
                            </h3>

                            <div className="w-full h-48 rounded-3xl overflow-hidden border border-slate-100 bg-slate-50 relative shadow-inner">
                                {street.length > 5 ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(`${street}, ${number}, ${city} - ${state}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                        frameBorder="0"
                                        scrolling="no"
                                        title="Google Maps"
                                    ></iframe>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                        <span className="material-symbols-outlined text-4xl">map_search</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações do Imóvel</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detalhes relevantes para o laudo..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all outline-none resize-none"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-50 flex flex-col sm:flex-row gap-4 justify-end">
                        <button
                            type="button"
                            onClick={() => navigate('/properties')}
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

export default EditPropertyPage;
