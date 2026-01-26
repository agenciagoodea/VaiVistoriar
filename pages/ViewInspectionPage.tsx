
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ViewInspectionPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [inspection, setInspection] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    // Email Modal State
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [emailRecipients, setEmailRecipients] = useState<{ name: string; email: string; type: string; selected: boolean }[]>([]);
    const [customEmail, setCustomEmail] = useState('');
    const [templates, setTemplates] = useState<any[]>([]);

    useEffect(() => {
        fetchInspection();
    }, [id]);

    const fetchInspection = async () => {
        try {
            const { data, error } = await supabase
                .from('inspections')
                .select(`
          *,
          lessor:lessor_id(*),
          lessee:lessee_id(*),
          property:properties(*)
        `)
                .eq('id', id)
                .single();

            if (error) throw error;

            // Normalizar retornos do Supabase (garantir objeto em vez de array)
            if (data) {
                if (data.property && Array.isArray(data.property)) data.property = data.property[0];
                if (data.lessor && Array.isArray(data.lessor)) data.lessor = data.lessor[0];
                if (data.lessee && Array.isArray(data.lessee)) data.lessee = data.lessee[0];
            }

            setInspection(data);
        } catch (err) {
            console.error('Erro ao buscar vistoria:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        const { data } = await supabase.from('system_configs').select('value').eq('key', 'email_templates_json').single();
        if (data) {
            try {
                setTemplates(JSON.parse(data.value));
            } catch (e) {
                console.error('Erro ao parsar templates', e);
            }
        }
    };

    const openEmailModal = () => {
        fetchTemplates();
        const recips = [];
        if (inspection.lessor?.email) {
            recips.push({ name: inspection.lessor.name, email: inspection.lessor.email, type: inspection.report_type === 'Venda' ? 'Vendedor' : 'Locador', selected: true });
        }
        if (inspection.lessee?.email) {
            recips.push({ name: inspection.lessee.name, email: inspection.lessee.email, type: inspection.report_type === 'Venda' ? 'Comprador' : 'Locatário', selected: true });
        }
        setEmailRecipients(recips);
        setEmailModalOpen(true);
    };

    const handleSendEmail = async () => {
        setEmailSending(true);
        try {
            const template = templates.find(t => t.id === 'send_report');
            if (!template) throw new Error('Template de envio de laudo não configurado.');

            const targets = emailRecipients.filter(r => r.selected);
            if (customEmail) targets.push({ name: 'Destinatário', email: customEmail, type: 'Extra', selected: true });

            if (targets.length === 0) throw new Error('Selecione ao menos um destinatário.');

            for (const target of targets) {
                const { error } = await supabase.functions.invoke('send-invite', {
                    body: {
                        to: target.email,
                        template: template,
                        variables: {
                            client_name: target.name,
                            property_name: inspection.property_name || inspection.property?.name,
                            report_link: window.location.href
                        }
                    }
                });
                if (error) throw error;
            }

            alert('E-mails enviados com sucesso!');
            setEmailModalOpen(false);
        } catch (err: any) {
            alert('Erro ao enviar: ' + err.message);
        } finally {
            setEmailSending(false);
        }
    };

    const downloadPDF = async () => {
        if (!reportRef.current) return;
        setExporting(true);

        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 1.5, // Slightly reduced scale for performance
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

            let heightLeft = imgHeight;
            let position = 0;

            // First Page
            pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
            heightLeft -= pageHeight;

            // Subsequent Pages
            while (heightLeft > 0) {
                position -= pageHeight; // Move image up
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`Vistoria_${inspection.property_name.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
            alert('Erro ao gerar arquivo PDF.');
        } finally {
            setExporting(false);
        }
    };

    const shareWhatsApp = () => {
        const url = window.location.href;
        const text = `Confira o Laudo de Vistoria: ${inspection.property_name}\nLink: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Gerando Documento...</div>;
    if (!inspection) return <div className="p-20 text-center font-bold text-rose-500 uppercase tracking-widest">Erro: Vistoria não encontrada.</div>;

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 pb-32 animate-in fade-in duration-500">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 sticky top-4 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/inspections')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 group">
                        <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tighter">Laudo Digital</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inspection.report_type} • {inspection.scheduled_date ? new Date(inspection.scheduled_date).toLocaleDateString('pt-BR') : 'Data N/A'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={shareWhatsApp} className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-green-100">
                        <span className="material-symbols-outlined text-[18px]">share</span>
                        WhatsApp
                    </button>
                    <button onClick={openEmailModal} className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        E-mail
                    </button>
                    <button onClick={downloadPDF} disabled={exporting} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50">
                        {exporting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                PDF
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Document Container for PDF Generation */}
            <div id="inspection-report" ref={reportRef} className="bg-white border border-slate-200 shadow-2xl rounded-[40px] overflow-hidden font-['Inter']">

                {/* PDF Header */}
                <div className="p-12 md:p-16 border-b-8 border-blue-600 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-8 items-center">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                            <img src={inspection.broker_data?.avatar_url || 'https://via.placeholder.com/100'} alt="Corretor" className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{inspection.broker_data?.company_name || 'Vistoria Profissional'}</h2>
                            <p className="text-blue-600 font-bold text-sm tracking-tight">{inspection.broker_data?.full_name} • CRECI {inspection.broker_data?.creci || '---'}</p>
                            <p className="text-slate-400 text-xs font-medium">{inspection.broker_data?.phone} • {inspection.broker_data?.address?.split(',')[1] || 'Certificado Digital'}</p>
                        </div>
                    </div>
                    <div className="text-center md:text-right">
                        <div className="inline-block px-6 py-2 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em]">
                            {inspection.report_type}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Documento Emitido em:</p>
                        <p className="text-sm font-black text-slate-900">{new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <div className="p-12 md:p-20 space-y-20">

                    {/* Parties Section */}
                    <div className="grid md:grid-cols-2 gap-16">
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-3">
                                {inspection.report_type === 'Venda' ? 'VENDEDOR (PROPRIETÁRIO)' : 'LOCADOR (PROPRIETÁRIO)'}
                            </h3>
                            <div className="space-y-2">
                                <p className="text-xl font-black text-slate-900 tracking-tighter">{inspection.lessor?.name || 'N/A'}</p>
                                <div className="space-y-1 text-slate-500 text-xs font-bold uppercase tracking-tight">
                                    <p>CPF/CNPJ: {inspection.lessor?.document_number || '---'}</p>
                                    <p>E-mail: {inspection.lessor?.email || '---'}</p>
                                    <p>Fone: {inspection.lessor?.phone || '---'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-3">
                                {inspection.report_type === 'Venda' ? 'COMPRADOR' : 'LOCATÁRIO (INQUILINO)'}
                            </h3>
                            <div className="space-y-2">
                                <p className="text-xl font-black text-slate-900 tracking-tighter">{inspection.lessee?.name || 'N/A'}</p>
                                <div className="space-y-1 text-slate-500 text-xs font-bold uppercase tracking-tight">
                                    <p>CPF/CNPJ: {inspection.lessee?.document_number || '---'}</p>
                                    <p>E-mail: {inspection.lessee?.email || '---'}</p>
                                    <p>Fone: {inspection.lessee?.phone || '---'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Nova Seção de Identificação do Imóvel (Layout Conforme Esquema) */}
                    <div className="bg-slate-50/50 rounded-[48px] border border-slate-100 p-8 md:p-12 space-y-12">
                        <div className="grid md:grid-cols-5 gap-12 items-start">
                            {/* Coluna Esquerda: ID + Dados Técnicos (3/5) */}
                            <div className="md:col-span-3 space-y-10">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full">
                                        <span className="material-symbols-outlined text-[14px]">apartment</span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Identificação do Imóvel</span>
                                    </div>
                                    <h4 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">{inspection.property?.name || inspection.property_name}</h4>

                                    <div className="flex items-start gap-3 pt-2">
                                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm text-blue-500">
                                            <span className="material-symbols-outlined">location_on</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-lg font-bold text-slate-700 leading-tight">
                                                {inspection.property ? (
                                                    `${inspection.property.address}, ${inspection.property.number}${inspection.property.complement ? ` - ${inspection.property.complement}` : ''}`
                                                ) : (
                                                    inspection.address
                                                )}
                                            </p>
                                            <p className="text-sm font-bold text-slate-500">
                                                {inspection.property && `${inspection.property.neighborhood}, ${inspection.property.city} - ${inspection.property.state}`}
                                            </p>
                                            <div className="flex flex-wrap gap-4 items-center pt-1">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">CEP: {inspection.property?.cep || 'Consultar Cadastro'}</p>
                                                {inspection.property?.iptu_number && (
                                                    <p className="text-xs font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">IPTU: {inspection.property.iptu_number}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Grid 2x2 para Dados Técnicos */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-center min-h-[80px]">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Tipo</p>
                                        <p className="text-sm font-black text-slate-800 uppercase leading-none">{inspection.property?.type || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-center min-h-[80px]">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Área</p>
                                        <p className="text-sm font-black text-slate-800 leading-none">{inspection.property?.area_m2 || '--'} m²</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-center min-h-[80px]">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Mobília</p>
                                        <p className={`text-sm font-black uppercase leading-none ${inspection.is_furnished ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {inspection.is_furnished ? 'Sim' : 'Não'}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-center min-h-[80px]">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Chaves</p>
                                        <p className={`text-sm font-black uppercase leading-none ${inspection.keys_data?.delivered ? 'text-amber-600' : 'text-slate-400'}`}>
                                            {inspection.keys_data?.delivered ? 'Entregues' : 'Pendente'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Coluna Direita: Foto das Chaves + Observações (2/5) */}
                            <div className="md:col-span-2 space-y-4 h-full flex flex-col">
                                <div className="aspect-square rounded-[32px] overflow-hidden border-4 border-white shadow-xl bg-slate-200 relative group flex-1">
                                    {inspection.keys_data?.photo_url ? (
                                        <a href={inspection.keys_data.photo_url} target="_blank" rel="noopener noreferrer" className="photo-link block w-full h-full">
                                            <img src={inspection.keys_data.photo_url} alt="Chaves" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        </a>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <span className="material-symbols-outlined text-4xl">vpn_key</span>
                                            <p className="text-[9px] font-black uppercase tracking-widest">Sem foto</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 bg-white rounded-[24px] border border-slate-100 shadow-sm">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Observação das Chaves</p>
                                    <p className="text-[10px] font-bold text-slate-600 leading-relaxed uppercase italic">
                                        {inspection.keys_data?.description || 'Nenhum registro adicional.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Seção Inferior: Mapa Full Width */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 px-2">
                                <span className="material-symbols-outlined text-blue-500 text-[18px]">map</span>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Localização no Mapa</p>
                            </div>
                            <div className="h-[300px] w-full rounded-[40px] overflow-hidden border-4 border-white shadow-2xl relative bg-slate-100">
                                {(inspection.property?.address || inspection.address) && (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                                            inspection.property
                                                ? `${inspection.property.address}, ${inspection.property.number}, ${inspection.property.city} - ${inspection.property.state}`
                                                : inspection.address
                                        )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                        frameBorder="0"
                                        scrolling="no"
                                        title="Mapa do Imóvel"
                                        className="contrast-[1.1] brightness-[1.05]"
                                    ></iframe>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="space-y-16">
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] border-b-2 border-slate-100 pb-3 text-center">ANÁLISE DETALHADA POR AMBIENTE</h3>
                        {inspection.rooms?.map((room: any, idx: number) => (
                            <div key={idx} className="space-y-8 break-inside-avoid pt-4">
                                <div className="flex items-center justify-between border-l-8 border-blue-600 pl-8 py-2">
                                    <div>
                                        <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{idx + 1}. {room.name}</h4>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${room.condition === 'Novo' ? 'bg-emerald-50 text-emerald-600' :
                                                room.condition === 'Bom' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                ESTADO: {room.condition}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Protocolo Unidade</p>
                                        <p className="text-[10px] font-mono font-bold text-slate-200">ID-{room.id?.slice(0, 6).toUpperCase()}</p>
                                    </div>
                                </div>

                                <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 italic text-slate-600 font-medium text-sm leading-relaxed relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200" />
                                    {room.observations || 'Nenhum detalhe técnico específico registrado.'}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {room.photos?.map((photo: any, pIdx: number) => (
                                        <div key={pIdx} className="space-y-3 break-inside-avoid group">
                                            <a
                                                href={photo.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="photo-link block aspect-[4/3] rounded-[28px] overflow-hidden border-4 border-white shadow-xl relative ring-1 ring-slate-100 group"
                                                title="Clique para ver em tamanho real"
                                            >
                                                <img src={photo.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white font-black text-[9px] px-3 py-1 rounded-full border border-white/20">
                                                    #{pIdx + 1}
                                                </div>
                                            </a>
                                            {photo.caption && (
                                                <div className="px-3">
                                                    <p className="text-[10px] font-bold text-slate-400 leading-snug uppercase tracking-tight italic">"{photo.caption}"</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Costs Table */}
                    {inspection.extra_costs && inspection.extra_costs.length > 0 && (
                        <div className="space-y-8 break-inside-avoid pt-12">
                            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] border-b-2 border-rose-50 pb-3 text-center">DEMONSTRATIVO DE REPAROS E DESPESAS</h3>
                            <div className="bg-white border-4 border-slate-50 rounded-[48px] overflow-hidden shadow-2xl">
                                <table className="w-full">
                                    <thead className="bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição da Despesa</th>
                                            <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {inspection.extra_costs.map((cost: any, cIdx: number) => (
                                            <tr key={cIdx} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-10 py-6 text-sm font-bold text-slate-700 uppercase tracking-tight">{cost.description}</td>
                                                <td className="px-10 py-6 text-right text-sm font-black text-slate-900 tabular-nums">R$ {parseFloat(cost.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-900">
                                        <tr>
                                            <td className="px-10 py-7 text-xs font-black text-white uppercase tracking-[0.3em]">CUSTO TOTAL CALCULADO</td>
                                            <td className="px-10 py-7 text-right text-xl font-black text-blue-400 tabular-nums">
                                                R$ {inspection.extra_costs.reduce((acc: number, cost: any) => acc + (parseFloat(cost.value) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Final Considerations */}
                    <div className="space-y-8 break-inside-avoid pt-12">
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] border-b-2 border-slate-100 pb-3 text-center">TERMO DE DECLARAÇÃO E CIÊNCIA</h3>
                        <div className="p-12 bg-slate-900 border-4 border-white shadow-2xl rounded-[48px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full" />
                            <p className="text-slate-300 text-sm leading-relaxed font-medium relative z-10">
                                {inspection.general_observations || 'Nenhuma ressalva adicional foi registrada para este laudo de vistoria.'}
                            </p>
                            <div className="mt-10 pt-8 border-t border-white/10 flex items-center gap-4 relative z-10">
                                <span className="material-symbols-outlined text-blue-500">verified_user</span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Documento validado tecnicamente pelo corretor responsável. As partes declaram estar de acordo com o estado do imóvel supra descrito.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="pt-24 grid md:grid-cols-2 gap-32 break-inside-avoid">
                        <div className="text-center space-y-6">
                            <div className="h-1 bg-slate-100 w-full rounded-full" />
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Assinatura do {inspection.report_type === 'Venda' ? 'Vendedor' : 'Locador'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inspection.lessor?.name}</p>
                            </div>
                        </div>
                        <div className="text-center space-y-6">
                            <div className="h-1 bg-slate-100 w-full rounded-full" />
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Assinatura do {inspection.report_type === 'Venda' ? 'Comprador' : 'Locatário'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inspection.lessee?.name}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 text-center">
                        <p className="text-[8px] font-black uppercase tracking-[0.6em] text-slate-300">Plataforma VistoriaPro • Certificação Digital de Vistoria • Imobiliária e Vendas</p>
                    </div>

                </div>
            </div>
            {/* Email Modal */}
            {emailModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900">Enviar Laudo por E-mail</h3>
                            <button onClick={() => setEmailModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Destinatários Encontrados:</p>
                            {emailRecipients.length === 0 && <p className="text-sm text-slate-500 italic">Nenhum e-mail cadastrado nas partes envolvidas.</p>}

                            {emailRecipients.map((r, i) => (
                                <label key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input type="checkbox" checked={r.selected} onChange={e => {
                                        const newR = [...emailRecipients];
                                        newR[i].selected = e.target.checked;
                                        setEmailRecipients(newR);
                                    }} className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500 border-gray-300" />
                                    <div>
                                        <p className="text-sm font-black text-slate-900">{r.name}</p>
                                        <p className="text-xs text-slate-500">{r.email} • {r.type}</p>
                                    </div>
                                </label>
                            ))}

                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Outro E-mail (Opcional):</p>
                                <input type="email" value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="ex: gerente@imobiliaria.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm" />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button onClick={() => setEmailModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                            <button onClick={handleSendEmail} disabled={emailSending} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2">
                                {emailSending ? 'Enviando...' : 'Enviar Agora'}
                                {!emailSending && <span className="material-symbols-outlined text-[18px]">send</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewInspectionPage;
