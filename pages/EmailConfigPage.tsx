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

const DEFAULT_TEMPLATES: EmailTemplate[] = [
    {
        id: 'invite',
        name: 'Solicitação de Convite',
        subject: 'Você foi convidado para o VistoriaPro',
        html: `
<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;">
        <h1 style="color: #1e293b; margin-top: 0;">Olá, {{user_name}}!</h1>
        <p style="color: #64748b; line-height: 1.6;">Você acaba de ser convidado para fazer parte da equipe do VistoriaPro. Clique no botão abaixo para concluir seu cadastro.</p>
        <a href="{{link}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 20px;">Concluir Cadastro</a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">Se você não solicitou este convite, ignore este e-mail.</p>
    </div>
</div>`
    },
    {
        id: 'payment_success',
        name: 'Confirmação de Pagamento',
        subject: 'Seu pagamento foi confirmado!',
        html: `
<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;">
        <h1 style="color: #1e293b; margin-top: 0;">Pagamento Confirmado! 🎉</h1>
        <p style="color: #64748b; line-height: 1.6;">O seu plano {{plan_name}} já está ativo em sua conta. Aproveite todas as funcionalidades premium do VistoriaPro.</p>
        <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0;">
            <p style="margin: 0; color: #475569;">Valor: <strong>R$ {{amount}}</strong></p>
            <p style="margin: 8px 0 0; color: #475569;">Data: <strong>{{date}}</strong></p>
        </div>
        <p style="color: #64748b;">Dúvidas? Entre em contato conosco.</p>
    </div>
</div>`
    },
    {
        id: 'user_registered',
        name: 'Registro de Usuário',
        subject: 'Bem-vindo ao VistoriaPro',
        html: `
<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;">
        <h1 style="color: #1e293b; margin-top: 0;">Bem-vindo, {{user_name}}!</h1>
        <p style="color: #64748b; line-height: 1.6;">É um prazer ter você conosco. Sua conta foi criada com sucesso e você já pode começar a realizar suas vistorias com agilidade e segurança.</p>
        <a href="{{login_url}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 20px;">Acessar Minha Conta</a>
    </div>
</div>`
    }
];

const EmailConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'smtp' | 'templates'>('smtp');

    // Test States
    const [testingSmtp, setTestingSmtp] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [testEmail, setTestEmail] = useState('');

    const [smtp, setSmtp] = useState<SMTPConfig>({
        host: 'smtp.servidor.com',
        port: 587,
        user: '',
        pass: '',
        senderName: 'VistoriaPro',
        senderEmail: 'contato@vistoriapro.com',
        useSSL: true
    });

    const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
    const [activeTemplateIdx, setActiveTemplateIdx] = useState(0);
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const handleTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setTestingSmtp(true);
        try {
            // Simulação de envio
            await new Promise(resolve => setTimeout(resolve, 2000));
            alert(`E-mail de teste enviado com sucesso para: ${testEmail}\n\nNota: Esta é uma simulação da conexão SMTP.`);
            setShowTestModal(false);
        } catch (err: any) {
            alert('Erro ao testar conexão: ' + err.message);
        } finally {
            setTestingSmtp(false);
        }
    };

    const fetchConfigs = async () => {
        try {
            const { data } = await supabase.from('system_configs').select('*');
            if (data) {
                const configSmtp = data.find(c => c.key === 'email_smtp_config')?.value;
                if (configSmtp) setSmtp(JSON.parse(configSmtp));

                const configTemplates = data.find(c => c.key === 'email_templates_json')?.value;
                if (configTemplates) setTemplates(JSON.parse(configTemplates));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
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
            alert('Configurações de e-mail publicadas com sucesso!');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-bold text-slate-400">CARREGANDO...</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-32">
            <div className="flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-lg z-50 py-4 border-b border-slate-100">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">E-mail do Sistema</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Configuração de Servidor e Templates HTML</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-12 py-4 bg-slate-900 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center gap-3"
                >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <span className="material-symbols-outlined text-[18px]">save</span>}
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit">
                <button onClick={() => setTab('smtp')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'smtp' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Servidor SMTP</button>
                <button onClick={() => setTab('templates')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'templates' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Templates de E-mail</button>
            </div>

            {tab === 'smtp' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <section className="lg:col-span-12 bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-[28px]">dns</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Conexão com o Servidor</h3>
                        </div>

                        <div className="grid md:grid-cols-3 gap-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Servidor SMTP (Host)</label>
                                <input type="text" value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" placeholder="ex: smtp.gmail.com" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Porta</label>
                                <input type="number" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: parseInt(e.target.value) })} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold" />
                            </div>
                            <div className="flex items-end pb-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-10 h-6 rounded-full transition-all relative ${smtp.useSSL ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${smtp.useSSL ? 'left-5' : 'left-1'}`} />
                                        <input type="checkbox" className="hidden" checked={smtp.useSSL} onChange={e => setSmtp({ ...smtp, useSSL: e.target.checked })} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Usar SSL / TLS</span>
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
                                    <span className="material-symbols-outlined text-[28px]">email</span>
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

                        <div className="border-t border-slate-100 pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Verificação de Configuração</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Envie um e-mail de teste para validar os dados acima</p>
                            </div>
                            <button
                                onClick={() => setShowTestModal(true)}
                                className="px-10 py-4 bg-blue-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3"
                            >
                                <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
                                Testar Conexão agora
                            </button>
                        </div>
                    </section>

                    {/* TEST MODAL */}
                    {showTestModal && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                                <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Testar Envio</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Informe um e-mail para receber a mensagem de teste.</p>
                                </div>
                                <form onSubmit={handleTestEmail} className="p-8 space-y-5">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-mail de Destino</label>
                                        <input
                                            required
                                            type="email"
                                            value={testEmail}
                                            onChange={e => setTestEmail(e.target.value)}
                                            placeholder="ex: seuemail@gmail.com"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 text-sm font-bold"
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowTestModal(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                                        <button
                                            type="submit"
                                            disabled={testingSmtp}
                                            className="flex-1 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {testingSmtp ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <span className="material-symbols-outlined text-[18px]">send</span>}
                                            {testingSmtp ? 'Enviando...' : 'Enviar Teste'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-4 space-y-4">
                        {templates.map((t, i) => (
                            <button
                                key={t.id}
                                onClick={() => { setActiveTemplateIdx(i); setPreviewMode(false); }}
                                className={`w-full p-6 text-left rounded-[32px] border transition-all ${activeTemplateIdx === i ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">{t.id}</p>
                                <h4 className="text-sm font-black tracking-tight">{t.name}</h4>
                            </button>
                        ))}
                    </div>

                    <div className="lg:col-span-8 bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Editando: {templates[activeTemplateIdx].name}</h3>
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                <button onClick={() => setPreviewMode(false)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!previewMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Design HTML</button>
                                <button onClick={() => setPreviewMode(true)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Visualizar</button>
                            </div>
                        </div>

                        {!previewMode ? (
                            <div className="p-8 space-y-6 flex-1 bg-slate-900">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Assunto do E-mail</label>
                                    <input
                                        type="text"
                                        value={templates[activeTemplateIdx].subject}
                                        onChange={e => {
                                            const nt = [...templates];
                                            nt[activeTemplateIdx].subject = e.target.value;
                                            setTemplates(nt);
                                        }}
                                        className="w-full px-5 py-4 bg-slate-800 text-white border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Conteúdo HTML</label>
                                    <textarea
                                        rows={15}
                                        value={templates[activeTemplateIdx].html}
                                        onChange={e => {
                                            const nt = [...templates];
                                            nt[activeTemplateIdx].html = e.target.value;
                                            setTemplates(nt);
                                        }}
                                        className="w-full px-6 py-8 bg-slate-800 text-blue-300 font-mono text-xs leading-relaxed border-none rounded-[32px] outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar"
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {['{{user_name}}', '{{link}}', '{{plan_name}}', '{{amount}}', '{{date}}'].map(tag => (
                                        <button key={tag} onClick={() => {
                                            const nt = [...templates];
                                            nt[activeTemplateIdx].html += tag;
                                            setTemplates(nt);
                                        }} className="px-3 py-1.5 bg-slate-800 text-slate-500 text-[10px] font-mono rounded-lg hover:text-white transition-colors">{tag}</button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-10 bg-slate-50 flex-1 overflow-auto custom-scrollbar">
                                <div className="bg-white border border-slate-200 shadow-lg rounded-3xl overflow-hidden max-w-xl mx-auto min-h-[500px]">
                                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-200" />
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-400">Assunto: {templates[activeTemplateIdx].subject}</p>
                                        </div>
                                    </div>
                                    <div dangerouslySetInnerHTML={{ __html: templates[activeTemplateIdx].html }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailConfigPage;
