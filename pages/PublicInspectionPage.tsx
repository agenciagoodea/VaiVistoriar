import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCpfCnpj } from '../lib/utils';

const PublicInspectionPage: React.FC = () => {
    const { id } = useParams();
    const [inspection, setInspection] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

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

            if (data) {
                if (data.property && Array.isArray(data.property)) data.property = data.property[0];
                if (data.lessor && Array.isArray(data.lessor)) data.lessor = data.lessor[0];
                if (data.lessee && Array.isArray(data.lessee)) data.lessee = data.lessee[0];

                // Fetch broker profile
                const { data: brokerProfile } = await supabase
                    .from('broker_profiles')
                    .select('*')
                    .eq('user_id', data.user_id)
                    .single();

                if (brokerProfile) {
                    data.broker_data = brokerProfile;

                    // If broker belongs to a company, fetch PJ profile for logo
                    if (brokerProfile.company_name) {
                        const { data: companyProfile } = await supabase
                            .from('broker_profiles')
                            .select('*')
                            .eq('role', 'PJ')
                            .eq('company_name', brokerProfile.company_name)
                            .maybeSingle();

                        if (companyProfile) {
                            data.company_data = companyProfile;
                        }
                    }
                }
            }

            setInspection(data);
        } catch (err) {
            console.error('Erro ao buscar vistoria:', err);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
        if (!reportRef.current) return;
        setExporting(true);

        try {
            const container = reportRef.current;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const contentWidth = pageWidth - (margin * 2);

            // Hide iframe elements (maps) during capture and show placeholders
            const iframes = container.querySelectorAll('iframe');
            iframes.forEach(el => (el as HTMLElement).style.opacity = '0');
            const mapPlaceholders = container.querySelectorAll('.map-placeholder-pdf');
            mapPlaceholders.forEach(el => (el as HTMLElement).style.display = 'block');

            // Selectors
            const header = container.querySelector('.report-header') as HTMLElement;
            const sections = Array.from(container.querySelectorAll('.report-section')) as HTMLElement[];
            const footer = container.querySelector('.report-footer') as HTMLElement;
            const siteFooter = container.querySelector('.report-site-footer') as HTMLElement;

            const captureElement = async (element: HTMLElement) => {
                const originalWidth = element.style.width;
                const originalMaxWidth = element.style.maxWidth;
                element.style.width = '1024px';
                element.style.maxWidth = '1024px';

                try {
                    const canvas = await html2canvas(element, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                        windowWidth: 1024
                    });

                    const linkData: { href: string; x: number; y: number; w: number; h: number }[] = [];
                    const rect = element.getBoundingClientRect();
                    const links = element.querySelectorAll('a.photo-link') as NodeListOf<HTMLAnchorElement>;

                    links.forEach(link => {
                        const lRect = link.getBoundingClientRect();
                        linkData.push({
                            href: link.href,
                            x: lRect.left - rect.left,
                            y: lRect.top - rect.top,
                            w: lRect.width,
                            h: lRect.height
                        });
                    });

                    return { canvas, linkData };
                } finally {
                    element.style.width = originalWidth;
                    element.style.maxWidth = originalMaxWidth;
                }
            };

            let currentY = margin;

            // Header
            if (header) {
                const { canvas } = await captureElement(header);
                const imgHeight = (canvas.height * contentWidth) / canvas.width;
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, imgHeight);
                currentY += imgHeight + 2;
            }

            // Sections
            for (const section of sections) {
                const { canvas, linkData } = await captureElement(section);
                const imgHeight = (canvas.height * contentWidth) / canvas.width;

                if (currentY + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    currentY = margin;
                }

                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, imgHeight);

                // Add links to PDF
                const pdfScaleFactor = contentWidth / 1024;
                linkData.forEach(ld => {
                    pdf.link(
                        margin + (ld.x * pdfScaleFactor),
                        currentY + (ld.y * pdfScaleFactor),
                        ld.w * pdfScaleFactor,
                        ld.h * pdfScaleFactor,
                        { url: ld.href }
                    );
                });

                currentY += imgHeight + 2;
            }

            // Footer (Signatures)
            if (footer) {
                const { canvas } = await captureElement(footer);
                const imgHeight = (canvas.height * contentWidth) / canvas.width;
                if (currentY + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    currentY = margin;
                }
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, imgHeight);
                currentY += imgHeight + 2;
            }

            // Site Footer
            if (siteFooter) {
                const { canvas } = await captureElement(siteFooter);
                const imgHeight = (canvas.height * contentWidth) / canvas.width;
                if (currentY + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    currentY = margin;
                }
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, currentY, contentWidth, imgHeight);
            }

            // Restore visibility
            iframes.forEach(el => (el as HTMLElement).style.opacity = '1');
            mapPlaceholders.forEach(el => (el as HTMLElement).style.display = 'none');

            pdf.save(`Laudo_${inspection.property?.name || inspection.property_name || 'Vistoria'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
            alert('Erro ao gerar PDF. Tente novamente.');
            // Restore visibility on error
            if (reportRef.current) {
                reportRef.current.querySelectorAll('iframe').forEach(el => (el as HTMLElement).style.opacity = '1');
                reportRef.current.querySelectorAll('.map-placeholder-pdf').forEach(el => (el as HTMLElement).style.display = 'none');
            }
        } finally {
            setExporting(false);
        }
    };



    if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Carregando Laudo...</div>;
    if (!inspection) return <div className="p-20 text-center font-bold text-rose-500 uppercase tracking-widest">Erro: Laudo não encontrado.</div>;

    const mapSearchQuery = encodeURIComponent(
        inspection.property ? `${inspection.property.address}, ${inspection.property.number}, ${inspection.property.city}` : inspection.address
    );
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${mapSearchQuery}`;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 pb-32 animate-in fade-in duration-500">
            {/* Action Bar - Simplified for Public */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 shadow-lg sticky top-4 z-50 print:hidden">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-sm font-black text-slate-900 leading-tight uppercase">Laudo Digital</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inspection.report_type}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={downloadPDF} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-md disabled:opacity-50">
                        {exporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <span className="material-symbols-outlined text-[16px]">download</span>} PDF
                    </button>
                </div>
            </div>

            {/* Document Container - Same as ViewInspectionPage */}
            <div id="inspection-report" ref={reportRef} className="bg-white border border-slate-200 shadow-xl rounded-[2px] overflow-hidden font-['Inter'] text-xs">

                {/* Compact Header (2-Row Layout) */}
                <div className="report-header p-6 md:p-8 border-b-2 border-blue-600 bg-white">
                    {/* Row 1: Top section with Company (Left) and Broker (Right) */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                        {/* Company Identity (Left) - Only show if has company data */}
                        {(inspection.company_data || inspection.broker_data?.company_name) ? (
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center p-1.5 shrink-0">
                                    {inspection.company_data?.avatar_url || inspection.broker_data?.avatar_url ? (
                                        <img
                                            src={inspection.company_data?.avatar_url || inspection.broker_data?.avatar_url}
                                            className="max-w-full max-h-full object-contain"
                                            alt="Logo da Empresa"
                                        />
                                    ) : (
                                        <span className="material-symbols-outlined text-slate-300 text-3xl">business</span>
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">
                                        {inspection.company_data?.company_name || inspection.broker_data?.company_name}
                                    </h2>
                                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                                        CNPJ: {formatCpfCnpj(inspection.company_data?.cpf_cnpj || inspection.broker_data?.cpf_cnpj || '')}
                                    </p>
                                    <div className="text-slate-400 text-[9px] font-semibold flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5 mt-1">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px] text-blue-500">phone</span>
                                            {inspection.company_data?.phone || inspection.broker_data?.phone || '---'}
                                        </span>
                                        <span className="hidden sm:inline border-l border-slate-200 h-2" />
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px] text-slate-300">location_on</span>
                                            {inspection.company_data?.street}, {inspection.company_data?.number} {inspection.company_data?.city}/{inspection.company_data?.state}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div />
                        )}

                        {/* Broker Details (Right) */}
                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 self-end md:self-auto ml-auto md:ml-0">
                            <div className="text-right">
                                <p className="text-[7px] font-black text-blue-600 uppercase tracking-widest leading-none">Vistoriador</p>
                                <p className="text-[10px] font-black text-slate-900 uppercase mt-0.5 leading-tight">{inspection.broker_data?.full_name}</p>
                                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                    <span className="text-[9px] font-bold text-slate-400">CRECI {inspection.broker_data?.creci || '---'}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-[8px] font-medium text-slate-400 lowercase">{inspection.broker_data?.email}</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                                <img src={inspection.broker_data?.avatar_url || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" alt="Avatar Vistoriador" />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Bottom bar with Report Info */}
                    <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="px-3 py-1 bg-slate-900 text-white rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center justify-center min-w-[90px] h-7 leading-none">
                                    {inspection.report_type}
                                </div>
                                <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-[10px] border border-blue-100 flex items-center justify-center gap-1.5 h-7 leading-none">
                                    <span className="text-[8px] font-bold text-blue-400 invisible sm:visible uppercase tracking-tighter leading-none">TIPO:</span>
                                    {inspection.type}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Emissão:</span>
                                <span className="text-[9px] font-black text-slate-700">{new Date(inspection.created_at || new Date()).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID:</span>
                                <span className="text-[9px] font-mono font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                    #{inspection.id.split('-')[0].toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100">
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${inspection.status === 'Enviado' ? 'bg-blue-500' : 'bg-green-500'}`} />
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em]">{inspection.status || 'Finalizado'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">

                    {/* BLOCO 1: Imóvel (Foto + Dados) e Partes */}
                    <div className="report-section grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100 items-start">

                        {/* Coluna 1: Foto e Dados do Imóvel */}
                        <div className="md:col-span-2 space-y-4">
                            {/* Foto */}
                            <div className="aspect-[21/9] w-full rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white group relative">
                                <a
                                    href={inspection.property?.image_url || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="photo-link block w-full h-full"
                                >
                                    <img
                                        src={inspection.property?.image_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400'}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        alt="Foto do Imóvel"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400'; }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <span className="material-symbols-outlined text-white drop-shadow-lg text-4xl">open_in_new</span>
                                    </div>
                                </a>
                            </div>

                            {/* Dados do Imóvel */}
                            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                <div>
                                    <h3 className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Imóvel</h3>
                                    <p className="text-lg font-black text-slate-900 uppercase leading-tight">{inspection.property?.name || inspection.property_name}</p>
                                    <a
                                        href={mapLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-700 mt-1 leading-normal inline-flex items-center gap-1 hover:underline transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                                        {inspection.property ? `${inspection.property.address}, ${inspection.property.number} - ${inspection.property.neighborhood}, ${inspection.property.city}/${inspection.property.state}` : inspection.address}
                                    </a>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <div className="px-2 py-1 bg-slate-50 rounded border border-slate-200">
                                        <span className="block text-[7px] font-bold text-slate-400 uppercase">Tipo</span>
                                        <span className="text-[10px] font-bold text-slate-800 uppercase">{inspection.property?.type || 'N/A'}</span>
                                    </div>
                                    <div className="px-2 py-1 bg-slate-50 rounded border border-slate-200">
                                        <span className="block text-[7px] font-bold text-slate-400 uppercase">Área</span>
                                        <span className="text-[10px] font-bold text-slate-800">{inspection.property?.area_m2 || '--'} m²</span>
                                    </div>
                                    <div className="px-2 py-1 bg-slate-50 rounded border border-slate-200">
                                        <span className="block text-[7px] font-bold text-slate-400 uppercase">Mobília</span>
                                        <span className="text-[10px] font-bold text-slate-800">{inspection.is_furnished ? 'Sim' : 'Não'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna 2: Partes */}
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">{inspection.report_type === 'Venda' ? 'Vendedor' : 'Locador'}</h3>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900 text-xs break-words">{inspection.lessor?.name}</p>
                                    <p className="text-slate-500 text-[10px]">CPF: {inspection.lessor?.document_number || '---'}</p>
                                    <p className="text-slate-500 text-[10px] break-all">Email: {inspection.lessor?.email || '---'}</p>
                                    <p className="text-slate-500 text-[10px]">Tel: {inspection.lessor?.phone || '---'}</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1">{inspection.report_type === 'Venda' ? 'Comprador' : 'Locatário'}</h3>
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-900 text-xs break-words">{inspection.lessee?.name}</p>
                                    <p className="text-slate-500 text-[10px]">CPF: {inspection.lessee?.document_number || '---'}</p>
                                    <p className="text-slate-500 text-[10px] break-all">Email: {inspection.lessee?.email || '---'}</p>
                                    <p className="text-slate-500 text-[10px]">Tel: {inspection.lessee?.phone || '---'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BLOCO 2: Chaves e Mapa */}
                    <div className="report-section grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 items-stretch">

                        {/* Chaves */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-6 items-start">
                            <div className="w-32 h-32 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-300 group relative shadow-sm">
                                <a
                                    href={inspection.keys_data?.photo_url || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="photo-link block w-full h-full"
                                >
                                    {inspection.keys_data?.photo_url ? (
                                        <>
                                            <img src={inspection.keys_data.photo_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <span className="material-symbols-outlined text-white drop-shadow-lg">open_in_new</span>
                                            </div>
                                        </>
                                    ) : <span className="flex items-center justify-center h-full text-[10px] text-slate-500">Sem foto</span>}
                                </a>
                            </div>
                            <div className="flex-1 space-y-3">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chaves ({inspection.keys_data?.delivered ? 'Entregues' : 'Pendente'})</h3>
                                <div className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 min-h-[90px] shadow-sm">
                                    {inspection.keys_data?.description || 'Nenhuma observação registrada para as chaves.'}
                                </div>
                            </div>
                        </div>

                        {/* Mapa */}
                        <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-square md:aspect-auto md:h-full min-h-[160px] group">
                            {(inspection.property?.address || inspection.address) && (
                                <>
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        scrolling="no"
                                        className="h-full w-full absolute inset-0 pointer-events-none"
                                        src={`https://maps.google.com/maps?q=${mapSearchQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    ></iframe>
                                    {/* Overlay clicável */}
                                    <a
                                        href={mapLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors cursor-pointer"
                                        title="Abrir no Google Maps"
                                    >
                                        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-blue-600 text-xl">open_in_new</span>
                                        </div>
                                    </a>
                                    {/* Placeholder para PDF */}
                                    <a
                                        href={mapLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="photo-link map-placeholder-pdf absolute inset-0 bg-slate-100 hidden p-0"
                                    >
                                        <div className="w-full h-full bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=600x600&maptype=roadmap')] bg-cover bg-center opacity-50 flex items-center justify-center">
                                            <div className="bg-white/90 p-4 rounded-xl shadow-sm border border-slate-200 text-center mx-4">
                                                <span className="material-symbols-outlined text-blue-600 block mb-1 text-2xl">map</span>
                                                <span className="text-[10px] font-bold text-blue-700 uppercase block">Ver Localização</span>
                                                <p className="text-[8px] text-slate-500 mt-1 line-clamp-2">{inspection.property?.address}</p>
                                            </div>
                                        </div>
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Ambientes */}
                    <div className="space-y-6">
                        {inspection.rooms?.map((room: any, idx: number) => (
                            <div key={idx} className="report-section break-inside-avoid border-t border-slate-100 pt-4">
                                <div className="flex items-center justify-between mb-4 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-slate-900 text-white text-[11px] font-black flex items-center justify-center rounded-md shadow-sm leading-none">
                                            {idx + 1}
                                        </div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">{room.name}</h4>
                                    </div>
                                    <div className={`text-[10px] font-black px-3 py-1 rounded-lg border shadow-sm flex items-center justify-center h-7 leading-none ${room.condition === 'Novo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        room.condition === 'Bom' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                        }`}>
                                        {room.condition}
                                    </div>
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
                                                    <td className="py-1 text-right font-bold text-slate-900">
                                                        {Number(c.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                                                <td className="py-2 pl-2 font-black text-slate-900 uppercase">Total</td>
                                                <td className="py-2 text-right font-black text-slate-900 pr-2">
                                                    {inspection.extra_costs.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                            </tr>
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

                    {/* Site Footer */}
                    <div className="report-site-footer text-center border-t border-slate-100 pt-4 mt-8 pb-2">
                        <p className="text-[8px] text-slate-400 uppercase tracking-widest">
                            Gerado via plataforma <b>VaiVistoriar</b> • www.vaivistoriar.com.br
                        </p>
                        <p className="text-[7px] text-slate-300 mt-0.5">
                            {new Date().toLocaleString('pt-BR')} • {inspection.id.split('-')[0]}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicInspectionPage;
