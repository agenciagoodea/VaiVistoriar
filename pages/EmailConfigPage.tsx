import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SMTPConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    senderName: string;
    senderEmail: string;
    useSSL: boolean;
}

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    html: string;
}

interface EmailLog {
    timestamp: string;
    recipient: string;
    success: boolean;
    error?: string;
    deploy?: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
    {
        id: 'invite',
        name: 'Solicitação de Convite',
        subject: 'Você foi convidado para o VistoriaPro',
        html: `<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;"><div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;"><h1 style="color: #1e293b; margin-top: 0;">Olá, {{user_name}}!</h1><p style="color: #64748b; line-height: 1.6;">Você acaba de ser convidado para fazer parte da equipe do VistoriaPro. Clique no botão abaixo para concluir seu cadastro.</p><a href="{{link}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 20px;">Concluir Cadastro</a><p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">Se você não solicitou este convite, ignore este e-mail.</p></div></div>`
    },
    {
        id: 'payment_success',
        name: 'Confirmação de Pagamento',
        subject: 'Seu pagamento foi confirmado!',
        html: `<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;"><div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;"><h1 style="color: #1e293b; margin-top: 0;">Pagamento Confirmado! 🎉</h1><p style="color: #64748b; line-height: 1.6;">O seu plano {{plan_name}} já está ativo em sua conta. Aproveite todas as funcionalidades premium do VistoriaPro.</p><div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0;"><p style="margin: 0; color: #475569;">Valor: <strong>R$ {{amount}}</strong></p><p style="margin: 8px 0 0; color: #475569;">Data: <strong>{{date}}</strong></p></div><p style="color: #64748b;">Dúvidas? Entre em contato conosco.</p></div></div>`
    },
    {
        id: 'send_report',
        name: 'Envio de Laudo Técnico',
        subject: 'Laudo de Vistoria Disponível - {{property_name}}',
        html: `<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;"><div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;"><div style="text-align: center; margin-bottom: 30px;"><span style="background: #eff6ff; color: #2563eb; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; text-transform: uppercase;">Laudo Digital</span></div><h1 style="color: #1e293b; margin-top: 0; text-align: center;">Vistoria Concluída</h1><p style="color: #64748b; line-height: 1.6; text-align: center;">Olá, <strong>{{client_name}}</strong>!</p><p style="color: #64748b; line-height: 1.6; text-align: center;">O laudo de vistoria do imóvel <strong>{{property_name}}</strong> já está disponível para visualização e assinatura digital.</p><div style="text-align: center; margin: 40px 0;"><a href="{{report_link}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Acessar Laudo Digital</a></div><p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px;">Este link é único e seguro. Em caso de dúvidas, entre em contato com o responsável.</p></div></div>`
    },
    {
        id: 'password_reset',
        name: 'Recuperação de Senha',
        subject: 'Recuperação de sua Senha - VistoriaPro',
        html: `<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;"><div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;"><div style="text-align: center; margin-bottom: 30px;"><div style="width: 60px; hieght: 60px; background: #fef2f2; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; color: #ef4444;"><span style="font-size: 32px;">🔑</span></div></div><h1 style="color: #1e293b; margin-top: 0; text-align: center;">Recuperar Senha</h1><p style="color: #64748b; line-height: 1.6; text-align: center;">Olá! Você solicitou a recuperação de senha para sua conta no VistoriaPro. Clique no botão abaixo para criar uma nova senha.</p><div style="text-align: center; margin: 40px 0;"><a href="{{link}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.25);">Definir Nova Senha</a></div><p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px;">Este link expira em 24 horas. Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.</p></div></div>`
    }
];

const TEMPLATE_VARIABLES: Record<string, string[]> = {
    invite: ['{{user_name}}', '{{link}}'],
    payment_success: ['{{plan_name}}', '{{amount}}', '{{date}}'],
    send_report: ['{{client_name}}', '{{property_name}}', '{{report_link}}'],
    password_reset: ['{{user_name}}', '{{link}}']
};

const SNIPPETS = [
    { label: 'Botão de Ação', html: '<a href="{{link}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Clique Aqui</a>' },
    { label: 'Título', html: '<h1 style="color: #1e293b; margin: 0;">Título</h1>' },
    { label: 'Parágrafo', html: '<p style="color: #64748b; line-height: 1.6;">Texto aqui...</p>' },
    { label: 'Card Cinza', html: '<div style="background: #f8fafc; padding: 20px; border-radius: 12px;">Conteúdo</div>' }
];

const EmailConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'smtp' | 'templates' | 'logs'>('smtp');
    const [testingSmtp, setTestingSmtp] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [smtp, setSmtp] = useState<SMTPConfig>({
        host: '', port: 587, user: '', pass: '', senderName: 'VistoriaPro', senderEmail: '', useSSL: false
    });
    const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
    const [activeTemplateIdx, setActiveTemplateIdx] = useState(0);
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => { fetchConfigs(); }, []);

    const fetchConfigs = async () => {
        try {
            const { data } = await supabase.from('system_configs').select('*');
            if (data) {
                const configSmtp = data.find(c => c.key === 'email_smtp_config')?.value;
                if (configSmtp) setSmtp(JSON.parse(configSmtp));
                const configTemplates = data.find(c => c.key === 'email_templates_json')?.value;
                if (configTemplates) {
                    const dbTemplates = JSON.parse(configTemplates);
                    // Merge: Add defaults that are missing in DB
                    const merged = [...dbTemplates];
                    DEFAULT_TEMPLATES.forEach(def => {
                        if (!merged.find((t: any) => t.id === def.id)) {
                            merged.push(def);
                        }
                    });
                    setTemplates(merged);
                }
                const configLogs = data.find(c => c.key === 'email_delivery_log')?.value;
                if (configLogs) setLogs(JSON.parse(configLogs));
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = [
                { key: 'email_smtp_config', value: JSON.stringify(smtp) },
                { key: 'email_templates_json', value: JSON.stringify(templates) }
            ];
            for (const up of updates) {
                await supabase.from('system_configs').upsert({ ...up, updated_at: new Date() });
            }
            alert('Configurações salvas!');
        } catch (err: any) { alert(err.message); } finally { setSaving(false); }
    };

    const handleTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setTestingSmtp(true);
        try {
            const testTemplate = templates.find(t => t.id === 'invite');
            const { data, error: emailError } = await supabase.functions.invoke('send-invite', {
                body: {
                    to: testEmail,
                    name: 'Teste de Conexão',
                    invite_link: `${window.location.origin}/#/register?email=${testEmail}&name=${encodeURIComponent('Usuário de Teste')}`,
                    config: smtp,
                    template: testTemplate,
                    variables: {
                        user_name: 'Teste',
                        link: '#',
                        client_name: 'Cliente Teste',
                        property_name: 'Imóvel Exemplo',
                        report_link: '#'
                    }
                }
            });
            if (emailError) throw emailError;
            if (data && data.success === false) throw new Error(data.error || 'Erro na função.');
            alert(`E-mail enviado para: ${testEmail}`);
            setShowTestModal(false);
            fetchConfigs();
        } catch (err: any) {
            alert('Erro: ' + err.message);
            fetchConfigs();
        } finally { setTestingSmtp(false); }
    };

    const insertText = (text: string) => {
        const textarea = document.getElementById('template-editor') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentHtml = templates[activeTemplateIdx].html;

        const newHtml = currentHtml.substring(0, start) + text + currentHtml.substring(end);

        const nt = [...templates];
        nt[activeTemplateIdx].html = newHtml;
        setTemplates(nt);

        // Restore focus next tick
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + text.length, start + text.length);
        }, 0);
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-400">CARREGANDO...</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-32">
            <div className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-lg z-50 py-4 border-b border-slate-100">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">E-mail do Sistema</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Configuração de Servidor e Templates</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="px-12 py-4 bg-slate-900 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3">
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit">
                <button onClick={() => setTab('smtp')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest ${tab === 'smtp' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Servidor SMTP</button>
                <button onClick={() => setTab('templates')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest ${tab === 'templates' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Templates</button>
                <button onClick={() => setTab('logs')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest ${tab === 'logs' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>Logs</button>
            </div>

            {tab === 'smtp' ? (
                <section className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                    <div className="grid md:grid-cols-3 gap-10">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Servidor SMTP</label>
                            <input type="text" value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" placeholder="ex: smtp.gmail.com" />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Porta</label>
                            <input type="number" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: parseInt(e.target.value) || 0 })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                        </div>
                        <div className="flex items-end pb-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-10 h-6 rounded-full transition-all relative ${smtp.useSSL ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${smtp.useSSL ? 'left-5' : 'left-1'}`} />
                                    <input type="checkbox" className="hidden" checked={smtp.useSSL} onChange={e => setSmtp({ ...smtp, useSSL: e.target.checked })} />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight ml-2">Usar SSL / TLS</span>
                            </label>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">E-mail / Usuário</label>
                            <input type="text" value={smtp.user} onChange={e => setSmtp({ ...smtp, user: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Senha</label>
                            <input type="password" value={smtp.pass} onChange={e => setSmtp({ ...smtp, pass: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-10">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-[28px]">person</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Remetente Padrão</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nome do Remetente</label>
                                <input type="text" value={smtp.senderName} onChange={e => setSmtp({ ...smtp, senderName: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">E-mail do Remetente</label>
                                <input type="text" value={smtp.senderEmail} onChange={e => setSmtp({ ...smtp, senderEmail: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                            </div>
                        </div>
                    </div>
                    <div className="pt-10 border-t flex justify-between items-center">
                        <button onClick={() => setShowTestModal(true)} className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase">Testar Conexão</button>
                    </div>
                </section>
            ) : tab === 'templates' ? (
                <div className="grid grid-cols-12 gap-10">
                    <div className="col-span-4 space-y-4">
                        {templates.map((t, i) => (
                            <button key={t.id} onClick={() => { setActiveTemplateIdx(i); setPreviewMode(false); }} className={`w-full p-6 text-left rounded-[32px] border ${activeTemplateIdx === i ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-500'}`}>{t.name}</button>
                        ))}
                    </div>
                    <div className="col-span-8 bg-white rounded-[40px] shadow-sm border p-8 space-y-6">
                        <input value={templates[activeTemplateIdx]?.subject} onChange={e => { const nt = [...templates]; nt[activeTemplateIdx].subject = e.target.value; setTemplates(nt); }} className="w-full p-4 bg-slate-100 rounded-xl font-bold text-sm" placeholder="Assunto do E-mail..." />
                        <textarea id="template-editor" rows={12} value={templates[activeTemplateIdx]?.html} onChange={e => { const nt = [...templates]; nt[activeTemplateIdx].html = e.target.value; setTemplates(nt); }} className="w-full p-4 bg-slate-100 rounded-xl font-mono text-xs leading-relaxed" placeholder="HTML do E-mail..." />

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Variáveis Disponíveis (Clique para inserir)</p>
                                <div className="flex flex-wrap gap-2">
                                    {TEMPLATE_VARIABLES[templates[activeTemplateIdx].id]?.map(v => (
                                        <button key={v} onClick={() => insertText(v)} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-mono font-bold hover:bg-indigo-100 transition-colors">{v}</button>
                                    )) || <span className="text-xs text-slate-400 italic">Nenhuma variável específica.</span>}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Snippets Rápidos</p>
                                <div className="flex flex-wrap gap-2">
                                    {SNIPPETS.map((s, i) => (
                                        <button key={i} onClick={() => insertText(s.html)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">+ {s.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-900 uppercase">Histórico de Envios</h3>
                        <button onClick={fetchConfigs} className="material-symbols-outlined">refresh</button>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-[10px] font-black uppercase text-slate-400 bg-slate-50">
                                <th className="px-8 py-4">Data</th>
                                <th className="px-8 py-4">Destino</th>
                                <th className="px-8 py-4">Status</th>
                                <th className="px-8 py-4">Versão</th>
                                <th className="px-8 py-4">Erro Técnico</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">Nenhum log registrado ainda</td>
                                </tr>
                            ) : logs.map((log, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-4 text-slate-500 font-medium">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                                    <td className="px-8 py-4 text-slate-900 font-bold">{log.recipient}</td>
                                    <td className="px-8 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${log.success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {log.success ? 'Sucesso' : 'Falha'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-slate-400 text-[10px] font-mono">{log.deploy || '--'}</td>
                                    <td className="px-8 py-4 text-red-400 text-xs font-mono max-w-xs truncate" title={log.error}>
                                        {log.error || '--'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showTestModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md p-8 space-y-5 shadow-2xl">
                        <h3 className="text-xl font-black">Testar Envio</h3>
                        <input required type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="E-mail de destino" className="w-full p-4 bg-slate-100 rounded-2xl" />
                        <div className="flex gap-3">
                            <button onClick={() => setShowTestModal(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400">Cancelar</button>
                            <button onClick={handleTestEmail} disabled={testingSmtp} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase">{testingSmtp ? 'Enviando...' : 'Enviar Teste'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailConfigPage;
