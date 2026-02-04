
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import VoiceInputButton from '../components/VoiceInputButton';

interface Photo {
    url: string;
    caption: string;
}

interface Room {
    id: string;
    name: string;
    condition: 'Novo' | 'Bom' | 'Regular' | 'Ruim';
    observations: string;
    photos: Photo[];
    isOpen: boolean;
}

interface Cost {
    id: string;
    description: string;
    value: string;
    receiptUrl: string;
}

const EditInspectionPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);

    // Quick Create State
    const [creatingLessor, setCreatingLessor] = useState(false);
    const [creatingLessee, setCreatingLessee] = useState(false);
    const [creatingProperty, setCreatingProperty] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');
    const [newPropertyName, setNewPropertyName] = useState('');
    const [newPropertyAddress, setNewPropertyAddress] = useState('');
    const [newPropertyType, setNewPropertyType] = useState('Apartamento');

    // Form State
    const [date, setDate] = useState('');
    const [reportType, setReportType] = useState<'Locação' | 'Venda'>('Locação');
    const [propertyId, setPropertyId] = useState('');
    const [lessorId, setLessorId] = useState('');
    const [lesseeId, setLesseeId] = useState('');
    const [keysDelivered, setKeysDelivered] = useState(false);
    const [keysPhotoUrl, setKeysPhotoUrl] = useState('');
    const [keysDescription, setKeysDescription] = useState('');
    const [isFurnished, setIsFurnished] = useState(false);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [costs, setCosts] = useState<Cost[]>([]);
    const [generalObservations, setGeneralObservations] = useState('');
    const [inspectionTips, setInspectionTips] = useState<string[]>([]);

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const { data: clientsData } = await supabase.from('clients').select('*').order('name');
            const { data: propertiesData } = await supabase.from('properties').select('*').order('name');
            const { data: tipsData } = await supabase.from('system_configs').select('value').eq('key', 'inspection_tips').single();

            setClients(clientsData || []);
            setProperties(propertiesData || []);

            if (tipsData?.value) {
                try {
                    const parsedTips = JSON.parse(tipsData.value);
                    const validTips = Array.isArray(parsedTips)
                        ? parsedTips.filter((t: any) => typeof t === 'string' && t.trim() !== '')
                        : (typeof parsedTips === 'string' && parsedTips.trim() !== '' ? [parsedTips] : []);
                    setInspectionTips(validTips);
                } catch (e) {
                    console.warn('Dicas no banco não são JSON válido, tentando recuperar como string:', e);
                    if (typeof tipsData.value === 'string' && tipsData.value.trim() !== '') {
                        setInspectionTips([tipsData.value.trim()]);
                    } else {
                        setInspectionTips([]);
                    }
                }
            }

            const { data: inspection, error } = await supabase
                .from('inspections')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (inspection) {
                // Ensure date is YYYY-MM-DD
                let formattedDate = '';
                if (inspection.scheduled_date) {
                    if (inspection.scheduled_date.includes('T')) {
                        formattedDate = inspection.scheduled_date.split('T')[0];
                    } else {
                        formattedDate = inspection.scheduled_date;
                    }
                }
                setDate(formattedDate);
                setReportType(inspection.report_type || 'Locação');
                setPropertyId(inspection.property_id || '');
                setLessorId(inspection.lessor_id || '');
                setLesseeId(inspection.lessee_id || '');
                setKeysDelivered(inspection.keys_data?.delivered || false);
                setKeysPhotoUrl(inspection.keys_data?.photo_url || '');
                setKeysDescription(inspection.keys_data?.description || '');
                setIsFurnished(inspection.is_furnished || false);

                // Defensive array handling
                const rawRooms = Array.isArray(inspection.rooms) ? inspection.rooms : [];
                setRooms(rawRooms.map((r: any) => ({ ...r, isOpen: false })));

                const rawCosts = Array.isArray(inspection.extra_costs) ? inspection.extra_costs : [];
                setCosts(rawCosts);

                setGeneralObservations(inspection.general_observations || '');
            }

        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    // Quick Create Functions
    const handleCreateClient = async (type: 'Proprietário' | 'Locatário' | 'Vendedor' | 'Comprador') => {
        if (!newClientName) return alert('Nome obrigatório');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.from('clients').insert([{
                user_id: user?.id,
                name: newClientName,
                phone: newClientPhone,
                email: newClientEmail,
                profile_type: type,
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(newClientName)}&background=random`
            }]).select().single();

            if (error) throw error;
            setClients([...clients, data]);
            if (type === 'Proprietário' || type === 'Vendedor') setLessorId(data.id);
            else setLesseeId(data.id);

            setCreatingLessor(false);
            setCreatingLessee(false);
            setNewClientName(''); setNewClientPhone(''); setNewClientEmail('');
        } catch (err: any) {
            alert('Erro ao criar cliente: ' + err.message);
        }
    };

    const handleCreateProperty = async () => {
        if (!newPropertyName || !newPropertyAddress) return alert('Nome e Endereço obrigatórios');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.from('properties').insert([{
                user_id: user?.id,
                name: newPropertyName,
                address: newPropertyAddress,
                type: newPropertyType,
                owner_id: lessorId || null,
                owner: clients.find(c => c.id === lessorId)?.name || ''
            }]).select().single();

            if (error) throw error;
            setProperties([...properties, data]);
            setPropertyId(data.id);
            setCreatingProperty(false);
            setNewPropertyName(''); setNewPropertyAddress('');
        } catch (err: any) {
            alert('Erro ao criar imóvel: ' + err.message);
        }
    };

    const addRoom = () => {
        const newRoom: Room = {
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            condition: 'Bom',
            observations: '',
            photos: [],
            isOpen: true
        };
        setRooms([newRoom, ...rooms.map(r => ({ ...r, isOpen: false }))]);
    };

    const toggleRoom = (roomId: string) => {
        setRooms(rooms.map(r => r.id === roomId ? { ...r, isOpen: !r.isOpen } : r));
    };

    const updateRoom = (roomId: string, field: keyof Room, value: any) => {
        setRooms(rooms.map(r => r.id === roomId ? { ...r, [field]: value } : r));
    };

    const deleteRoom = (roomId: string) => {
        if (window.confirm('Excluir este ambiente?')) {
            setRooms(rooms.filter(r => r.id !== roomId));
        }
    };

    const moveRoom = (index: number, direction: 'up' | 'down') => {
        const newRooms = [...rooms];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newRooms.length) {
            [newRooms[index], newRooms[targetIndex]] = [newRooms[targetIndex], newRooms[index]];
            setRooms(newRooms);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'keys' | { roomId: string }) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploading(typeof target === 'string' ? target : target.roomId);

        try {
            const uploadedUrls = await Promise.all(files.map(async (file: any) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;
                const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('inspection-photos').getPublicUrl(filePath);
                return publicUrl;
            }));

            if (target === 'keys') {
                setKeysPhotoUrl(uploadedUrls[0]);
            } else if (typeof target === 'object') {
                setRooms(rooms.map(r => {
                    if (r.id === target.roomId) {
                        return { ...r, photos: [...r.photos, ...uploadedUrls.map(url => ({ url, caption: '' }))] };
                    }
                    return r;
                }));
            }
        } catch (err) {
            alert('Erro no upload.');
        } finally {
            setUploading(null);
        }
    };

    const deletePhoto = (roomId: string, photoIndex: number) => {
        setRooms(rooms.map(r => {
            if (r.id === roomId) {
                return { ...r, photos: r.photos.filter((_, i) => i !== photoIndex) };
            }
            return r;
        }));
    };

    const updatePhotoCaption = (roomId: string, photoIndex: number, caption: string) => {
        setRooms(rooms.map(r => {
            if (r.id === roomId) {
                const newPhotos = [...r.photos];
                newPhotos[photoIndex] = { ...newPhotos[photoIndex], caption };
                return { ...r, photos: newPhotos };
            }
            return r;
        }));
    };

    const suggestAICaption = (roomId: string, photoIndex: number) => {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;
        const suggestions = [`Vistoria de rotina no ambiente ${room.name}.`, `Danos leves detectados.`, `Pintura em bom estado.`];
        const caption = suggestions[Math.floor(Math.random() * suggestions.length)];
        setRooms(rooms.map(r => {
            if (r.id === roomId) {
                const newPhotos = [...r.photos];
                newPhotos[photoIndex].caption = caption;
                return { ...r, photos: newPhotos };
            }
            return r;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sessão expirada');

            // Capturar dados do corretor atualizado
            const { data: profile } = await supabase.from('broker_profiles').select('*').eq('user_id', user.id).single();

            const selectedProperty = properties.find(p => p.id === propertyId);
            const selectedLessee = clients.find(c => c.id === lesseeId);

            const { error } = await supabase.from('inspections').update({
                property_id: propertyId,
                property_name: selectedProperty?.name,
                address: selectedProperty?.address,
                client_name: selectedLessee?.name || 'Venda',
                scheduled_date: date,
                report_type: reportType,
                lessor_id: lessorId || null,
                lessee_id: lesseeId || null,
                keys_data: { delivered: keysDelivered, photo_url: keysPhotoUrl, description: keysDescription },
                is_furnished: isFurnished,
                rooms: rooms.map(r => ({ id: r.id, name: r.name, condition: r.condition, observations: r.observations, photos: r.photos })),
                extra_costs: costs,
                general_observations: generalObservations,
                status: 'Finalizada',
                broker_data: profile || {} // Salvar snapshot do corretor
            }).eq('id', id);

            if (error) throw error;
            navigate('/inspections');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-400">CARREGANDO DADOS DA VISTORIA...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Editar Vistoria</h1>
                    <p className="text-slate-500">Ajuste os detalhes e etapas do laudo.</p>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                            {s}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="p-5 md:p-12">

                    {step === 1 && (
                        <div className="space-y-8">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Etapa 1: Dados Básicos</h2>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Data da Vistoria</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Tipo de Laudo</label>
                                    <div className="flex gap-2">
                                        {['Locação', 'Venda'].map(t => (
                                            <button key={t} onClick={() => setReportType(t as any)} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase border transition-all ${reportType === t ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Imóvel</label>
                                    <div className="flex gap-4">
                                        <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold">
                                            <option value="">Selecione...</option>
                                            {properties.map(p => <option key={p.id} value={p.id}>{p.name} - {p.address}</option>)}
                                        </select>
                                        <button onClick={() => setCreatingProperty(!creatingProperty)} className={`px-6 rounded-2xl border font-bold text-xs uppercase transition-all ${creatingProperty ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}>
                                            {creatingProperty ? 'Cancelar' : 'Novo'}
                                        </button>
                                    </div>

                                    {creatingProperty && (
                                        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
                                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-widest">Cadastrar Novo Imóvel</h4>
                                            <div className="space-y-3">
                                                <input placeholder="Apelido do Imóvel (ex: Ap do Centro)" value={newPropertyName} onChange={e => setNewPropertyName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-300" />
                                                <input placeholder="Endereço Completo" value={newPropertyAddress} onChange={e => setNewPropertyAddress(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-300" />
                                                <select value={newPropertyType} onChange={e => setNewPropertyType(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-300">
                                                    <option value="Apartamento">Apartamento</option>
                                                    <option value="Casa">Casa</option>
                                                    <option value="Comercial">Comercial</option>
                                                </select>
                                                <button onClick={handleCreateProperty} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all">Salvar Imóvel</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Etapa 2: Partes Envolvidas</h2>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400">
                                        {reportType === 'Locação' ? 'Locador (Proprietário)' : 'Vendedor (Proprietário)'}
                                    </label>
                                    <div className="flex gap-4">
                                        <select value={lessorId} onChange={e => setLessorId(e.target.value)} className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold">
                                            <option value="">Selecione...</option>
                                            {clients.filter(c => reportType === 'Locação' ? (c.profile_type === 'Proprietário' || !c.profile_type) : (c.profile_type === 'Vendedor' || !c.profile_type)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <button onClick={() => setCreatingLessor(!creatingLessor)} className={`px-6 rounded-2xl border font-bold text-xs uppercase transition-all ${creatingLessor ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}>
                                            {creatingLessor ? 'Cancelar' : 'Novo'}
                                        </button>
                                    </div>
                                    {creatingLessor && (
                                        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 mt-4">
                                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-widest">Cadastrar Novo Proprietário</h4>
                                            <div className="space-y-3">
                                                <input placeholder="Nome Completo" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-300" />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input placeholder="Telefone" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-300" />
                                                    <input placeholder="Email (Opcional)" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-300" />
                                                </div>
                                                <button onClick={() => handleCreateClient(reportType === 'Locação' ? 'Proprietário' : 'Vendedor')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-700">Salvar Proprietário</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400">
                                        {reportType === 'Locação' ? 'Locatário (Inquilino)' : 'Comprador'}
                                    </label>
                                    <div className="flex gap-4">
                                        <select value={lesseeId} onChange={e => setLesseeId(e.target.value)} className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold">
                                            <option value="">Selecione...</option>
                                            {clients.filter(c => reportType === 'Locação' ? (c.profile_type === 'Locatário' || !c.profile_type) : (c.profile_type === 'Comprador' || !c.profile_type)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <button onClick={() => setCreatingLessee(!creatingLessee)} className={`px-6 rounded-2xl border font-bold text-xs uppercase transition-all ${creatingLessee ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}>
                                            {creatingLessee ? 'Cancelar' : 'Novo'}
                                        </button>
                                    </div>
                                    {creatingLessee && (
                                        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 mt-4">
                                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-widest">Cadastrar Novo {reportType === 'Locação' ? 'Locatário' : 'Comprador'}</h4>
                                            <div className="space-y-3">
                                                <input placeholder="Nome Completo" value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-300" />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input placeholder="Telefone" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-300" />
                                                    <input placeholder="Email (Opcional)" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:border-indigo-300" />
                                                </div>
                                                <button onClick={() => handleCreateClient(reportType === 'Locação' ? 'Locatário' : 'Comprador')} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-700">Salvar {reportType === 'Locação' ? 'Locatário' : 'Comprador'}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Etapa 3: Chaves & Mobília</h2>
                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                                        <span className="text-xs font-black uppercase">Chaves Entregues?</span>
                                        <div className="flex gap-1 bg-white p-1 rounded-xl">
                                            <button onClick={() => setKeysDelivered(true)} className={`px-4 py-1 rounded-lg text-[10px] font-black ${keysDelivered ? 'bg-amber-500 text-white' : 'text-slate-400'}`}>Sim</button>
                                            <button onClick={() => setKeysDelivered(false)} className={`px-4 py-1 rounded-lg text-[10px] font-black ${!keysDelivered ? 'bg-slate-300 text-white' : 'text-slate-400'}`}>Não</button>
                                        </div>
                                    </div>
                                    {keysDelivered && (
                                        <div className="space-y-4">
                                            <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
                                                {keysPhotoUrl ? <img src={keysPhotoUrl} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-300">add_a_photo</span>}
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'keys')} />
                                            </div>
                                            <div className="relative">
                                                <textarea value={keysDescription} onChange={e => setKeysDescription(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl outline-none text-sm resize-none pr-12" placeholder="Descrição das chaves..." rows={3} />
                                                <VoiceInputButton
                                                    onResult={(text) => setKeysDescription(prev => prev ? `${prev} ${text}` : text)}
                                                    className="absolute bottom-3 right-3"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                                        <span className="text-xs font-black uppercase">Imóvel Mobiliado?</span>
                                        <div className="flex gap-1 bg-white p-1 rounded-xl">
                                            <button onClick={() => setIsFurnished(true)} className={`px-4 py-1 rounded-lg text-[10px] font-black ${isFurnished ? 'bg-amber-500 text-white' : 'text-slate-400'}`}>Sim</button>
                                            <button onClick={() => setIsFurnished(false)} className={`px-4 py-1 rounded-lg text-[10px] font-black ${!isFurnished ? 'bg-slate-300 text-white' : 'text-slate-400'}`}>Não</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Etapa 4: Ambientes</h2>
                                <button onClick={addRoom} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">Adicionar Ambiente</button>
                            </div>
                            <div className="space-y-4">
                                {rooms.map((room, idx) => (
                                    <div key={room.id} className="border border-slate-100 rounded-3xl overflow-hidden">
                                        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between cursor-pointer" onClick={() => toggleRoom(room.id)}>
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-slate-400 leading-none">{room.isOpen ? 'expand_more' : 'chevron_right'}</span>
                                                <span className="font-bold text-slate-900 uppercase text-xs">{room.name || 'Sem Nome'}</span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${room.condition === 'Novo' ? 'bg-emerald-50 text-emerald-600' :
                                                    room.condition === 'Bom' ? 'bg-blue-50 text-blue-600' :
                                                        room.condition === 'Regular' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                                    }`}>
                                                    {room.condition}
                                                </span>
                                                <span className="text-[10px] text-slate-400 lowercase">{room.photos.length} fotos</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); moveRoom(idx, 'up') }} disabled={idx === 0} className="p-1 text-slate-300 hover:text-indigo-600 disabled:opacity-0"><span className="material-symbols-outlined text-lg">expand_less</span></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveRoom(idx, 'down') }} disabled={idx === rooms.length - 1} className="p-1 text-slate-300 hover:text-indigo-600 disabled:opacity-0"><span className="material-symbols-outlined text-lg">expand_more</span></button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteRoom(room.id) }} className="p-1 text-slate-300 hover:text-rose-600"><span className="material-symbols-outlined text-lg">delete</span></button>
                                            </div>
                                        </div>
                                        {room.isOpen && (
                                            <div className="p-6 space-y-6">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <input type="text" value={room.name} onChange={e => updateRoom(room.id, 'name', e.target.value)} className="px-4 py-3 bg-slate-50 rounded-xl text-sm" placeholder="Nome do cômodo..." />
                                                    <select value={room.condition} onChange={e => updateRoom(room.id, 'condition', e.target.value as any)} className="px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold uppercase">
                                                        <option value="Novo">Novo</option>
                                                        <option value="Bom">Bom</option>
                                                        <option value="Regular">Regular</option>
                                                        <option value="Ruim">Ruim</option>
                                                    </select>
                                                </div>
                                                <div className="relative">
                                                    <textarea value={room.observations} onChange={e => updateRoom(room.id, 'observations', e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl text-sm resize-none pr-12" placeholder="Observações do cômodo..." rows={3} />
                                                    <VoiceInputButton
                                                        onResult={(text) => updateRoom(room.id, 'observations', room.observations ? `${room.observations} ${text}` : text)}
                                                        className="absolute bottom-3 right-3"
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black cursor-pointer inline-flex">
                                                        <span className="material-symbols-outlined text-sm">add_a_photo</span> Subir Fotos
                                                        <input type="file" multiple className="hidden" onChange={e => handleFileUpload(e, { roomId: room.id })} />
                                                    </label>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {room.photos.map((ph, pIdx) => (
                                                            <div key={pIdx} className="bg-slate-50 rounded-[24px] p-2.5 space-y-2.5">
                                                                <div className="relative aspect-square rounded-xl overflow-hidden group shadow-sm">
                                                                    <img src={ph.url} className="w-full h-full object-cover" />
                                                                    <div className="absolute top-1 right-1 flex gap-1 transform translate-y-[-10px] opacity-0 group-hover:opacity-100 transition-all">
                                                                        <button type="button" onClick={() => deletePhoto(room.id, pIdx)} className="p-1.5 bg-rose-600 text-white rounded-lg border-none"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                                    </div>
                                                                </div>
                                                                <div className="relative">
                                                                    <textarea
                                                                        value={ph.caption}
                                                                        onChange={e => updatePhotoCaption(room.id, pIdx, e.target.value)}
                                                                        className="w-full p-2 bg-white border border-slate-100 rounded-lg text-[10px] outline-none resize-none pr-10 font-bold"
                                                                        placeholder="Legenda..."
                                                                        rows={2}
                                                                    />
                                                                    <div className="absolute bottom-1 right-1 flex items-center gap-1">
                                                                        <VoiceInputButton
                                                                            onResult={(text) => updatePhotoCaption(room.id, pIdx, ph.caption ? `${ph.caption} ${text}` : text)}
                                                                            className="p-1 hover:bg-transparent"
                                                                        />
                                                                        <button type="button" onClick={() => suggestAICaption(room.id, pIdx)} className="text-emerald-500 hover:text-emerald-600 p-1" title="Sugerir com IA">
                                                                            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-8">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Etapa 5: Finalização</h2>
                            <div className="space-y-6">
                                <div className="relative">
                                    <textarea value={generalObservations} onChange={e => setGeneralObservations(e.target.value)} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[32px] outline-none text-sm resize-none pr-14" rows={6} placeholder="Observações gerais do laudo..." />
                                    <VoiceInputButton
                                        onResult={(text) => setGeneralObservations(prev => prev ? `${prev} ${text}` : text)}
                                        className="absolute bottom-6 right-6 p-3 bg-blue-50 hover:bg-blue-100"
                                    />
                                </div>

                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Custos Adicionais (Reparos/Despesas)</h3>
                                        <button onClick={() => setCosts([...costs, { id: Math.random().toString(), description: '', value: '', receiptUrl: '' }])} className="px-4 py-2 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase border border-slate-100 hover:bg-slate-50 transition-all">Add Despesa</button>
                                    </div>
                                    <div className="space-y-3">
                                        {costs.map((cost, cIdx) => (
                                            <div key={cost.id} className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                                                <input type="text" placeholder="Descrição (ex: Limpeza extra)" value={cost.description} onChange={e => { const n = [...costs]; n[cIdx].description = e.target.value; setCosts(n) }} className="flex-1 px-3 py-2 bg-slate-50 rounded-lg text-xs outline-none" />
                                                <input type="number" placeholder="R$ 0,00" value={cost.value} onChange={e => { const n = [...costs]; n[cIdx].value = e.target.value; setCosts(n) }} className="w-24 px-3 py-2 bg-slate-50 rounded-lg text-xs outline-none font-bold" />
                                                <button onClick={() => setCosts(costs.filter(c => c.id !== cost.id))} className="p-2 text-rose-300 hover:text-rose-600 transition-colors"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Dicas do Especialista:</p>
                                    <ul className="text-xs text-slate-500 space-y-1 list-disc ml-4">
                                        {inspectionTips.map((tip, i) => <li key={i}>{tip}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Nav */}
                    <div className="mt-12 pt-8 border-t border-slate-50 flex justify-between">
                        <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/inspections')} className="px-6 py-3 text-slate-400 font-bold">Voltar</button>
                        {step < 5 ? (
                            <button onClick={() => setStep(step + 1)} className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px]">Próximo</button>
                        ) : (
                            <button onClick={handleSave} disabled={saving} className="px-12 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-emerald-200">
                                {saving ? 'Gravando...' : 'Salvar Vistoria'}
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default EditInspectionPage;
