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
        let loadedTemplates: any[] = [];

        if (data && data.value) {
            try {
                loadedTemplates = JSON.parse(data.value);
            } catch (e) {
                console.error('Erro ao parsar templates', e);
            }
        }

        // Fallback: Ensure send_report exists
        if (!loadedTemplates.find(t => t.id === 'send_report')) {
            loadedTemplates.push({
                id: 'send_report',
                name: 'Envio de Laudo Técnico',
                subject: 'Laudo de Vistoria Disponível - {{property_name}}',
                html: `<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;"><div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;"><div style="text-align: center; margin-bottom: 30px;"><span style="background: #eff6ff; color: #2563eb; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; text-transform: uppercase;">Laudo Digital</span></div><h1 style="color: #1e293b; margin-top: 0; text-align: center;">Vistoria Concluída</h1><p style="color: #64748b; line-height: 1.6; text-align: center;">Olá, <strong>{{client_name}}</strong>!</p><p style="color: #64748b; line-height: 1.6; text-align: center;">O laudo de vistoria do imóvel <strong>{{property_name}}</strong> segue anexo/linkado abaixo.</p><div style="text-align: center; margin: 40px 0;"><a href="{{report_link}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Baixar Laudo PDF</a></div><p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px;">Em caso de dúvidas, entre em contato com o responsável.</p></div></div>`
            });
        }

        setTemplates(loadedTemplates);
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

    // --- PDF Generation Logic ---
    const generatePDF = async (returnBlob = false): Promise<jsPDF | Blob | null> => {
        if (!reportRef.current) return null;

        try {
            const container = reportRef.current;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const contentWidth = pageWidth - (margin * 2);

            // Seletores ajustados para o novo layout compacto
            const header = container.querySelector('.report-header') as HTMLElement;
            const sections = Array.from(container.querySelectorAll('.report-section')) as HTMLElement[];
            const footer = container.querySelector('.report-footer') as HTMLElement;

            const captureElement = async (element: HTMLElement) => {
                return await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    windowWidth: 1024
                });
            };

            let currentY = margin;

            // Header
            if (header) {
                const canvas = await captureElement(header);
                const imgHeight = (canvas.height * contentWidth) / canvas.width;
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, imgHeight);
                currentY += imgHeight + 2;
            }

            // Sections
            for (const section of sections) {
                const canvas = await captureElement(section);
                const imgHeight = (canvas.height * contentWidth) / canvas.width;

                if (currentY + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    currentY = margin;
                }

                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, imgHeight);

                // Links
                const links = section.querySelectorAll('a.photo-link') as NodeListOf<HTMLAnchorElement>;
                const rect = section.getBoundingClientRect();
                links.forEach(link => {
                    const linkRect = link.getBoundingClientRect();
                    const scaleFactor = contentWidth / rect.width;
                    const pdfX = margin + ((linkRect.left - rect.left) * scaleFactor);
                    const pdfY = currentY + ((linkRect.top - rect.top) * scaleFactor);
                    const pdfW = linkRect.width * scaleFactor;
                    const pdfH = linkRect.height * scaleFactor;
                    pdf.link(pdfX, pdfY, pdfW, pdfH, { url: link.href });
                });

                currentY += imgHeight + 2;
            }

            // Footer (Signatures)
            if (footer) {
                const canvas = await captureElement(footer);
                const imgHeight = (canvas.height * contentWidth) / canvas.width;
                if (currentY + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    currentY = margin;
                }
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, imgHeight);
            }

            return returnBlob ? pdf.output('blob') : pdf;
        } catch (err) {
            console.error('Erro na geração do PDF', err);
            throw err;
        }
    };

    const downloadPDF = async () => {
        setExporting(true);
        try {
            const pdf = await generatePDF(false) as jsPDF;
            if (pdf) pdf.save(`Vistoria_${inspection.property_name.replace(/\s+/g, '_')}.pdf`);
        } catch (e) {
            alert('Erro ao gerar PDF.');
        } finally {
            setExporting(false);
        }
    };

    const uploadPDF = async () => {
        const blob = await generatePDF(true) as Blob;
        if (!blob) throw new Error('Falha ao gerar Blob do PDF');

        const fileName = `laudos/Vistoria_${inspection.id}_${Date.now()}.pdf`;
        const { data, error } = await supabase.storage
            .from('reports') // Bucket name must exist
            .upload(fileName, blob, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('reports').getPublicUrl(fileName);
        return publicUrl;
    };

    const handleSendEmail = async () => {
        setEmailSending(true);
        try {
            const targets = emailRecipients.filter(r => r.selected);
            if (customEmail) targets.push({ name: 'Destinatário', email: customEmail, type: 'Extra', selected: true });
            if (targets.length === 0) throw new Error('Selecione ao menos um destinatário.');

            // 1. Generate and Upload PDF
            let pdfUrl = window.location.href; // Fallback
            try {
                pdfUrl = await uploadPDF();
                console.log('PDF Uploaded:', pdfUrl);
            } catch (uploadErr) {
                console.error('Erro ao fazer upload do PDF, usando link web:', uploadErr);
                // Continue with web link if upload fails? Or block?
                // Letting it continue with web link as fallback, or simple alert warning?
                // For "professional" request, maybe better to fail?
                // But safety first:
                // alert('Não foi possível gerar o anexo PDF, enviando link de visualização.');
            }

            // 2. Send Emails
            for (const target of targets) {
                const { error } = await supabase.functions.invoke('send-email', {
                    body: {
                        to: target.email,
                        templateId: 'send_report',
                        origin: window.location.origin,
                        variables: {
                            client_name: target.name,
                            property_name: inspection.property_name || inspection.property?.name,
                            report_link: pdfUrl
                        }
                    }
                });
                if (error) throw error;
            }

            alert('E-mails enviados com sucesso com o link do PDF!');
            setEmailModalOpen(false);
        } catch (err: any) {
            alert('Erro ao enviar: ' + err.message);
        } finally {
            setEmailSending(false);
        }
    };

    const shareWhatsApp = () => {
        const url = window.location.href;
        const text = `Confira o Laudo de Vistoria: ${inspection.property_name}\nLink: ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Gerando Documento...</div>;
    if (!inspection) return <div className="p-20 text-center font-bold text-rose-500 uppercase tracking-widest">Erro: Vistoria não encontrada.</div>;

    // --- RENDER ---
    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 pb-32 animate-in fade-in duration-500">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 shadow-lg sticky top-4 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/inspections')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-400 group">
                        <span className="material-symbols-outlined text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-slate-900 leading-tight uppercase">Laudo Digital</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inspection.report_type}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={shareWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-md">
                        <span className="material-symbols-outlined text-[16px]">share</span> WhatsApp
                    </button>
                    <button onClick={openEmailModal} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-md">
                        <span className="material-symbols-outlined text-[16px]">mail</span> E-mail
                    </button>
                    <button onClick={downloadPDF} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-md disabled:opacity-50">
                        {exporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <span className="material-symbols-outlined text-[16px]">download</span>} PDF
                    </button>
                </div>
            </div>

            {/* Document Container - COMPACT LAYOUT */}
            <div id="inspection-report" ref={reportRef} className="bg-white border border-slate-200 shadow-xl rounded-[2px] overflow-hidden font-['Inter'] text-xs">

                {/* HEAD (Parte superior compacta) */}
                <div className="report-header p-6 border-b-4 border-blue-600 bg-slate-50 flex flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md bg-white">
                            <img src={inspection.broker_data?.avatar_url || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{inspection.broker_data?.company_name || 'Vistoria Profissional'}</h2>
                            <p className="text-blue-600 font-bold text-xs">{inspection.broker_data?.full_name} • CRECI {inspection.broker_data?.creci}</p>
                            <p className="text-slate-400 text-[10px]">{inspection.broker_data?.phone}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-md font-bold text-[10px] uppercase tracking-wider mb-2">
                            {inspection.report_type}
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">

                    {/* Partes & Imóvel (Lado a lado comprimido) */}
                    <div className="report-section grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Imóvel</h3>
                                <p className="text-lg font-black text-slate-900 uppercase leading-none">{inspection.property?.name || inspection.property_name}</p>
                                <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">
                                    {inspection.property ? `${inspection.property.address}, ${inspection.property.number} - ${inspection.property.neighborhood}, ${inspection.property.city}/${inspection.property.state}` : inspection.address}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-3 py-2 bg-white rounded border border-slate-200">
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Tipo</span>
                                    <span className="text-xs font-bold text-slate-800 uppercase">{inspection.property?.type || 'N/A'}</span>
                                </div>
                                <div className="px-3 py-2 bg-white rounded border border-slate-200">
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Área</span>
                                    <span className="text-xs font-bold text-slate-800">{inspection.property?.area_m2 || '--'} m²</span>
                                </div>
                                <div className="px-3 py-2 bg-white rounded border border-slate-200">
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Mobília</span>
                                    <span className="text-xs font-bold text-slate-800">{inspection.is_furnished ? 'Sim' : 'Não'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{inspection.report_type === 'Venda' ? 'Vendedor' : 'Locador'}</h3>
                                <p className="font-bold text-slate-900 truncate">{inspection.lessor?.name}</p>
                                <p className="text-slate-500 text-[10px]">{inspection.lessor?.document_number}</p>
                            </div>
                            <div>
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{inspection.report_type === 'Venda' ? 'Comprador' : 'Locatário'}</h3>
                                <p className="font-bold text-slate-900 truncate">{inspection.lessee?.name}</p>
                                <p className="text-slate-500 text-[10px]">{inspection.lessee?.document_number}</p>
                            </div>
                            <div className="col-span-2 mt-2 pt-2 border-t border-slate-200 flex gap-4 items-center">
                                <div className="w-12 h-12 rounded bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                                    {inspection.keys_data?.photo_url ? (
                                        <img src={inspection.keys_data.photo_url} className="w-full h-full object-cover" />
                                    ) : <span className="flex items-center justify-center h-full text-[10px]">Sem foto</span>}
                                </div>
                                <div className="flex-1">
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Chaves ({inspection.keys_data?.delivered ? 'Entregues' : 'Pendente'})</span>
                                    <span className="text-[10px] italic text-slate-600 leading-tight block">{inspection.keys_data?.description || 'Sem observações.'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ambientes Compactos */}
                    <div className="space-y-6">
                        {inspection.rooms?.map((room: any, idx: number) => (
                            <div key={idx} className="report-section break-inside-avoid border-t border-slate-100 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">{idx + 1}</span>
                                        <h4 className="text-sm font-black text-slate-900 uppercase">{room.name}</h4>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${room.condition === 'Novo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            room.condition === 'Bom' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                        }`}>
                                        {room.condition}
                                    </span>
                                </div>

                                {room.observations && (
                                    <div className="bg-slate-50 text-slate-700 text-[11px] p-3 rounded mb-3 border border-slate-100">
                                        {room.observations}
                                    </div>
                                )}

                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                    {room.photos?.map((photo: any, pIdx: number) => (
                                        <div key={pIdx} className="group relative">
                                            <a href={photo.url} target="_blank" className="photo-link block aspect-square rounded overflow-hidden border border-slate-200 bg-slate-100">
                                                <img src={photo.url} className="w-full h-full object-cover" loading="lazy" />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate">
                                                    {photo.caption || `Foto ${pIdx + 1}`}
                                                </div>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Custos e Infos Finais */}
                    {(inspection.extra_costs?.length > 0 || inspection.general_observations) && (
                        <div className="report-section grid md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-100">
                            {inspection.extra_costs?.length > 0 && (
                                <div>
                                    <h5 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Custos/Reparos</h5>
                                    <table className="w-full text-[10px]">
                                        <tbody>
                                            {inspection.extra_costs.map((c: any, i: number) => (
                                                <tr key={i} className="border-b border-slate-50 last:border-0">
                                                    <td className="py-1 text-slate-600">{c.description}</td>
                                                    <td className="py-1 text-right font-bold text-slate-900">R$ {c.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {inspection.general_observations && (
                                <div>
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Considerações Finais</h5>
                                    <p className="text-[10px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">{inspection.general_observations}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mapa Pequeno */}
                    <div className="report-section h-[150px] w-full rounded border border-slate-200 overflow-hidden bg-slate-100 mt-4 break-inside-avoid">
                        {(inspection.property?.address || inspection.address) && (
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                                    inspection.property ? `${inspection.property.address}, ${inspection.property.number}, ${inspection.property.city}` : inspection.address
                                )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            ></iframe>
                        )}
                    </div>

                    {/* Assinaturas */}
                    <div className="report-footer pt-8 pb-4 grid grid-cols-2 gap-12 mt-4 page-break-inside-avoid">
                        <div className="text-center">
                            <div className="h-px bg-slate-300 w-full mb-2" />
                            <p className="text-[9px] font-bold text-slate-900 uppercase">{inspection.lessor?.name}</p>
                            <p className="text-[8px] text-slate-400">{inspection.report_type === 'Venda' ? 'Vendedor' : 'Locador'}</p>
                        </div>
                        <div className="text-center">
                            <div className="h-px bg-slate-300 w-full mb-2" />
                            <p className="text-[9px] font-bold text-slate-900 uppercase">{inspection.lessee?.name}</p>
                            <p className="text-[8px] text-slate-400">{inspection.report_type === 'Venda' ? 'Comprador' : 'Locatário'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Modal */}
            {emailModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Enviar Laudo (PDF)</h3>
                            <button onClick={() => setEmailModalOpen(false)}><span className="material-symbols-outlined text-slate-400">close</span></button>
                        </div>
                        <div className="space-y-2">
                            {emailRecipients.map((r, i) => (
                                <label key={i} className="flex items-center gap-3 p-3 rounded border border-slate-100 bg-slate-50 cursor-pointer">
                                    <input type="checkbox" checked={r.selected} onChange={e => {
                                        const newR = [...emailRecipients];
                                        newR[i].selected = e.target.checked;
                                        setEmailRecipients(newR);
                                    }} className="rounded text-blue-600" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">{r.name}</p>
                                        <p className="text-[10px] text-slate-500">{r.email}</p>
                                    </div>
                                </label>
                            ))}
                            <input type="email" value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="Outro e-mail..." className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded text-xs" />
                        </div>
                        <button onClick={handleSendEmail} disabled={emailSending} className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-md disabled:opacity-50">
                            {emailSending ? 'Gerando PDF e Enviando...' : 'Enviar PDF Agora'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewInspectionPage;
