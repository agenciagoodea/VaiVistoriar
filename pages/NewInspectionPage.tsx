
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const NewInspectionPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);
    const [usageLimitReached, setUsageLimitReached] = useState(false);
    const [roomsLimitReached, setRoomsLimitReached] = useState(false);
    const [limitInfo, setLimitInfo] = useState<{ maxInspections: number; currentInspections: number; maxRooms: number } | null>(null);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
    }, []);

    const fetchInitialData = async () => {
        try {
            const { data: clientsData } = await supabase.from('clients').select('*').order('name');
            const { data: propertiesData } = await supabase.from('properties').select('*').order('name');
            const { data: tipsData } = await supabase.from('system_configs').select('value').eq('key', 'inspection_tips').single();

            setClients(clientsData || []);
            setProperties(propertiesData || []);
            if (tipsData) setInspectionTips(tipsData.value);

            // Verificar limites de uso
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('broker_profiles')
                    .select('*, plans:subscription_plan_id(max_inspections, max_rooms)')
                    .eq('user_id', user.id)
                    .single();

                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const { count } = await supabase
                    .from('inspections')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .gte('created_at', startOfMonth.toISOString());

                const maxI = (profile?.plans as any)?.max_inspections || 0;
                const maxR = (profile?.plans as any)?.max_rooms || 0;
                const currentI = count || 0;

                setLimitInfo({ maxInspections: maxI, currentInspections: currentI, maxRooms: maxR });
                if (maxI > 0 && currentI >= maxI) {
                    setUsageLimitReached(true);
                }
            }
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        }
    };

    const addRoom = () => {
        if (limitInfo && limitInfo.maxRooms > 0 && rooms.length >= limitInfo.maxRooms) {
            alert(`Seu plano permite no máximo ${limitInfo.maxRooms} cômodos por vistoria. Faça upgrade para adicionar mais.`);
            return;
        }

        const newRoom: Room = {
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            condition: 'Bom',
            observations: '',
            photos: [],
            isOpen: true
        };
        // Adicionar no topo (unshift) para melhor usabilidade conforme solicitado
        setRooms([newRoom, ...rooms.map(r => ({ ...r, isOpen: false }))]);
    };

    const toggleRoom = (id: string) => {
        setRooms(rooms.map(r => r.id === id ? { ...r, isOpen: !r.isOpen } : r));
    };

    const updateRoom = (id: string, field: keyof Room, value: any) => {
        setRooms(rooms.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const deleteRoom = (id: string) => {
        if (window.confirm('Excluir este ambiente?')) {
            setRooms(rooms.filter(r => r.id !== id));
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'keys' | { roomId: string, photoIndex?: number } | 'costs') => {
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
                        const newPhotos = [...r.photos, ...uploadedUrls.map(url => ({ url, caption: '' }))];
                        return { ...r, photos: newPhotos };
                    }
                    return r;
                }));
            }
        } catch (err) {
            console.error('Erro no upload:', err);
            alert('Erro ao enviar imagens.');
        } finally {
            setUploading(null);
        }
    };

    const deletePhoto = (roomId: string, photoIndex: number) => {
        setRooms(rooms.map(r => {
            if (r.id === roomId) {
                const newPhotos = r.photos.filter((_, i) => i !== photoIndex);
                return { ...r, photos: newPhotos };
            }
            return r;
        }));
    };

    const movePhoto = (roomId: string, fromIndex: number, toIndex: number) => {
        setRooms(rooms.map(r => {
            if (r.id === roomId) {
                const newPhotos = [...r.photos];
                if (toIndex >= 0 && toIndex < newPhotos.length) {
                    [newPhotos[fromIndex], newPhotos[toIndex]] = [newPhotos[toIndex], newPhotos[fromIndex]];
                }
                return { ...r, photos: newPhotos };
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
        const suggestions = [
            `Observado desgaste natural no acabamento do(a) ${room.name}.`,
            `Presença de pequenas marcas de uso na superfície.`,
            `Item em excelente estado de conservação, sem avarias visíveis.`,
            `Necessita de reparo/pintura localizado.`
        ];
        updatePhotoCaption(roomId, photoIndex, suggestions[Math.floor(Math.random() * suggestions.length)]);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sessão expirada');

            const selectedProperty = properties.find(p => p.id === propertyId);

            const { data, error } = await supabase.from('inspections').insert([{
                user_id: user.id,
                property_id: propertyId,
                property_name: selectedProperty?.name,
                address: selectedProperty?.address,
                client_name: reportType === 'Locação' ? (clients.find(c => c.id === lesseeId)?.name || 'N/A') : 'Venda',
                type: 'Entrada', // Pode ser dinâmico depois
                report_type: reportType,
                status: 'Agendada',
                scheduled_date: date,
                lessor_id: lessorId || null,
                lessee_id: lesseeId || null,
                keys_data: { delivered: keysDelivered, photo_url: keysPhotoUrl, description: keysDescription },
                is_furnished: isFurnished,
                rooms: rooms.map(r => ({ id: r.id, name: r.name, condition: r.condition, observations: r.observations, photos: r.photos })),
                extra_costs: costs,
                general_observations: generalObservations
            }]);

            if (error) throw error;
            navigate('/inspections');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Limit Warning */}
            {usageLimitReached && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10 text-center space-y-6">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                            <span className="material-symbols-outlined text-4xl">block</span>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900">Limite Atingido</h3>
                            <p className="text-slate-500 font-medium">Seu plano atual permite apenas <b>{limitInfo?.maxInspections} vistoria(s)</b> por mês. Você já utilizou todo o seu limite.</p>
                        </div>
                        <div className="pt-4 space-y-4">
                            <button
                                onClick={() => navigate('/plan-config')}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all font-bold"
                            >
                                Fazer Upgrade Agora
                            </button>
                            <button
                                onClick={() => navigate('/inspections')}
                                className="w-full py-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all"
                            >
                                Voltar para Minhas Vistorias
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header & Stepper */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Nova Vistoria</h1>
                    <p className="text-slate-500">Siga os passos para gerar um laudo profissional.</p>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                                {s}
                            </div>
                            {s < 5 && <div className={`w-6 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-slate-100'}`} />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div className="p-8 md:p-12">

                    {/* PASSO 1 - DADOS BÁSICOS */}
                    {step === 1 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3 text-blue-600">
                                <span className="material-symbols-outlined text-3xl font-bold">info</span>
                                <h2 className="text-xl font-black tracking-tight uppercase">Passo 1: Identificação</h2>
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data da Vistoria</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Laudo</label>
                                    <div className="flex gap-2">
                                        {['Locação', 'Venda'].map(t => (
                                            <button key={t} onClick={() => setReportType(t as any)} className={`flex-1 py-4 rounded-3xl text-xs font-black uppercase border transition-all ${reportType === t ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Selecione o Imóvel</label>
                                    <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-bold appearance-none cursor-pointer">
                                        <option value="">Selecione um imóvel do catálogo...</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - {p.address}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASSO 2 - PARTES ENVOLVIDAS */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3 text-indigo-600">
                                <span className="material-symbols-outlined text-3xl font-bold">group</span>
                                <h2 className="text-xl font-black tracking-tight uppercase">Passo 2: Partes Envolvidas</h2>
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 text-indigo-600">
                                        {reportType === 'Locação' ? 'Dados do Locador (Proprietário)' : 'Dados do Vendedor (Proprietário)'}
                                    </label>
                                    <select value={lessorId} onChange={e => setLessorId(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold">
                                        <option value="">Selecione o {reportType === 'Locação' ? 'proprietário' : 'vendedor'}...</option>
                                        {clients.filter(c => reportType === 'Locação' ? c.profile_type === 'Proprietário' : c.profile_type === 'Vendedor').map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 text-indigo-600">
                                        {reportType === 'Locação' ? 'Dados do Locatário (Inquilino)' : 'Dados do Comprador'}
                                    </label>
                                    <select value={lesseeId} onChange={e => setLesseeId(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold">
                                        <option value="">Selecione o {reportType === 'Locação' ? 'locatário' : 'comprador'}...</option>
                                        {clients.filter(c => reportType === 'Locação' ? c.profile_type === 'Locatário' : c.profile_type === 'Comprador').map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASSO 3 - CHAVES E MOBÍLIA */}
                    {step === 3 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3 text-amber-500">
                                <span className="material-symbols-outlined text-3xl font-bold">vpn_key</span>
                                <h2 className="text-xl font-black tracking-tight uppercase">Passo 3: Chaves & Mobília</h2>
                            </div>
                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                        <span className="text-sm font-black text-slate-700 uppercase">Chaves Entregues?</span>
                                        <div className="flex bg-white p-1 rounded-xl shadow-sm">
                                            <button onClick={() => setKeysDelivered(true)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${keysDelivered ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-400'}`}>Sim</button>
                                            <button onClick={() => setKeysDelivered(false)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${!keysDelivered ? 'bg-slate-300 text-white' : 'text-slate-400'}`}>Não</button>
                                        </div>
                                    </div>

                                    {keysDelivered && (
                                        <div className="space-y-4 animate-in fade-in zoom-in-95">
                                            <div className="relative group aspect-video rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                                {keysPhotoUrl ? (
                                                    <img src={keysPhotoUrl} alt="Chaves" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center">
                                                        <span className="material-symbols-outlined text-slate-300 text-4xl">add_a_photo</span>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Foto das Chaves</p>
                                                    </div>
                                                )}
                                                <label className="absolute inset-0 cursor-pointer">
                                                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'keys')} />
                                                </label>
                                            </div>
                                            <div className="relative">
                                                <textarea value={keysDescription} onChange={e => setKeysDescription(e.target.value)} placeholder="Descreva o estado das chaves, chaveiros, controles..." rows={3} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm resize-none pr-12" />
                                                <VoiceInputButton
                                                    onResult={(text) => setKeysDescription(prev => prev ? `${prev} ${text}` : text)}
                                                    className="absolute bottom-3 right-3"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                        <span className="text-sm font-black text-slate-700 uppercase">Imóvel Mobiliado?</span>
                                        <div className="flex bg-white p-1 rounded-xl shadow-sm">
                                            <button onClick={() => setIsFurnished(true)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${isFurnished ? 'bg-amber-500 text-white shadow-md shadow-amber-200' : 'text-slate-400'}`}>Sim</button>
                                            <button onClick={() => setIsFurnished(false)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${!isFurnished ? 'bg-slate-300 text-white' : 'text-slate-400'}`}>Não</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASSO 4 - AMBIENTES (THE BIG ONE) */}
                    {step === 4 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-emerald-600">
                                    <span className="material-symbols-outlined text-3xl font-bold">meeting_room</span>
                                    <h2 className="text-xl font-black tracking-tight uppercase">Passo 4: Ambientes</h2>
                                </div>
                                <button
                                    onClick={addRoom}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all transform active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                    Adicionar Ambiente
                                </button>
                            </div>

                            <div className="space-y-4">
                                {rooms.length === 0 ? (
                                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px] space-y-3">
                                        <span className="material-symbols-outlined text-5xl text-slate-200">dashboard_customize</span>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Crie os cômodos para vistoriar</p>
                                    </div>
                                ) : rooms.map((room, index) => (
                                    <div key={room.id} className={`group bg-white border transition-all ${room.isOpen ? 'rounded-[32px] border-emerald-200 ring-4 ring-emerald-500/5' : 'rounded-2xl border-slate-100 hover:border-emerald-200 shadow-sm'}`}>
                                        {/* Title Bar */}
                                        <div className="px-6 py-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleRoom(room.id)}>
                                                <span className={`material-symbols-outlined transition-transform duration-300 ${room.isOpen ? 'rotate-180 text-emerald-600' : 'text-slate-300'}`}>expand_more</span>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                    <span className="font-black text-slate-800 uppercase text-xs truncate max-w-[150px]">{room.name || 'Novo Ambiente'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${room.condition === 'Novo' ? 'bg-emerald-50 text-emerald-600' :
                                                            room.condition === 'Bom' ? 'bg-blue-50 text-blue-600' :
                                                                room.condition === 'Regular' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                                            }`}>
                                                            {room.condition}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{room.photos.length} fotos</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => moveRoom(index, 'up')} disabled={index === 0} className="p-2 text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-all"><span className="material-symbols-outlined">expand_less</span></button>
                                                <button onClick={() => moveRoom(index, 'down')} disabled={index === rooms.length - 1} className="p-2 text-slate-300 hover:text-blue-500 disabled:opacity-0 transition-all"><span className="material-symbols-outlined">expand_more</span></button>
                                                <button onClick={() => deleteRoom(room.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><span className="material-symbols-outlined">delete</span></button>
                                            </div>
                                        </div>

                                        {/* Content Area */}
                                        {room.isOpen && (
                                            <div className="px-8 pb-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-slate-50 mt-2 pt-8">
                                                <div className="grid md:grid-cols-3 gap-8">
                                                    <div className="space-y-1.5 md:col-span-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Ambiente</label>
                                                        <input type="text" value={room.name} onChange={e => updateRoom(room.id, 'name', e.target.value)} placeholder="Ex: Sala de Jantar, Quarto 01..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm font-bold" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</label>
                                                        <select value={room.condition} onChange={e => updateRoom(room.id, 'condition', e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-black uppercase tracking-wider cursor-pointer">
                                                            <option value="Novo">Novo</option>
                                                            <option value="Bom">Bom</option>
                                                            <option value="Regular">Regular</option>
                                                            <option value="Ruim">Ruim</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 relative">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Observações do Cômodo</label>
                                                    <textarea value={room.observations} onChange={e => updateRoom(room.id, 'observations', e.target.value)} placeholder="Descreva danos, rachaduras, estado da pintura..." rows={4} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm resize-none pr-12" />
                                                    <VoiceInputButton
                                                        onResult={(text) => updateRoom(room.id, 'observations', room.observations ? `${room.observations} ${text}` : text)}
                                                        className="absolute bottom-3 right-3"
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fotos do Ambiente</label>
                                                        <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-all">
                                                            <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                                                            Subir Fotos
                                                            <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleFileUpload(e, { roomId: room.id })} />
                                                        </label>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {room.photos.map((photo, pIdx) => (
                                                            <div key={pIdx} className="bg-slate-50 rounded-[28px] p-3 space-y-3 relative group/photo">
                                                                <div className="aspect-square rounded-2xl overflow-hidden relative shadow-sm">
                                                                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                                                                    <div className="absolute top-2 right-2 flex gap-1 transform translate-y-[-10px] opacity-0 group-hover/photo:translate-y-0 group-hover/photo:opacity-100 transition-all duration-300">
                                                                        <button onClick={() => movePhoto(room.id, pIdx, pIdx - 1)} className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70"><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
                                                                        <button onClick={() => movePhoto(room.id, pIdx, pIdx + 1)} className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70"><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
                                                                        <button onClick={() => deletePhoto(room.id, pIdx)} className="p-1.5 bg-rose-600/90 text-white rounded-lg hover:bg-rose-600"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="relative">
                                                                        <textarea
                                                                            value={photo.caption}
                                                                            onChange={e => updatePhotoCaption(room.id, pIdx, e.target.value)}
                                                                            placeholder="Legenda da foto..."
                                                                            className="w-full p-3 bg-white border border-slate-100 rounded-xl text-[11px] outline-none resize-none pr-12 font-bold"
                                                                            rows={2}
                                                                        />
                                                                        <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                                                            <VoiceInputButton
                                                                                onResult={(text) => updatePhotoCaption(room.id, pIdx, photo.caption ? `${photo.caption} ${text}` : text)}
                                                                                className="p-1 hover:bg-transparent"
                                                                            />
                                                                            <button
                                                                                onClick={() => suggestAICaption(room.id, pIdx)}
                                                                                className="text-emerald-500 hover:text-emerald-600 p-1"
                                                                                title="Sugerir com IA"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                                                            </button>
                                                                        </div>
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

                    {/* PASSO 5 - OBSERVAÇÕES & CUSTOS */}
                    {step === 5 && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3 text-rose-500">
                                <span className="material-symbols-outlined text-3xl font-bold">receipt_long</span>
                                <h2 className="text-xl font-black tracking-tight uppercase">Passo 5: Observações & Extras</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Observações Gerais</label>
                                    <textarea value={generalObservations} onChange={e => setGeneralObservations(e.target.value)} placeholder="Detalhe acordos, problemas estruturais graves ou recomendações..." rows={6} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[32px] outline-none text-sm resize-none pr-14" />
                                    <VoiceInputButton
                                        onResult={(text) => setGeneralObservations(prev => prev ? `${prev} ${text}` : text)}
                                        className="absolute bottom-6 right-6 p-3 bg-blue-50 hover:bg-blue-100"
                                    />
                                </div>

                                <div className="p-6 bg-slate-50 rounded-[32px] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Custos Adicionais (Reparos/Despesas)</h3>
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

                                <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100/50 space-y-3">
                                    <p className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest">
                                        <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                                        Dicas do Especialista
                                    </p>
                                    <ul className="text-[11px] text-blue-700/70 space-y-1 ml-6 list-disc font-medium">
                                        {inspectionTips.length > 0 ? (
                                            inspectionTips.map((tip, i) => <li key={i}>{tip}</li>)
                                        ) : (
                                            <>
                                                <li>Mencione itens que necessitam reparo imediato.</li>
                                                <li>Registre condições especiais do mobiliário ou eletrônicos.</li>
                                                <li>Documente acordos verbais realizados durante a visita.</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="pt-12 mt-12 border-t border-slate-50 flex justify-between gap-4">
                        <button
                            onClick={() => step > 1 ? setStep(step - 1) : navigate('/inspections')}
                            className="px-8 py-4 text-sm font-bold text-slate-400 hover:bg-slate-50 rounded-3xl transition-all"
                        >
                            {step === 1 ? 'Cancelar' : 'Voltar Etapa'}
                        </button>

                        {step < 5 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                className="px-12 py-4 bg-slate-900 hover:bg-black text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all transform active:scale-95 flex items-center gap-2"
                            >
                                Próximo Passo
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-16 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-200 transition-all transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        Finalizar Laudo
                                        <span className="material-symbols-outlined text-[18px]">cloud_done</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default NewInspectionPage;
