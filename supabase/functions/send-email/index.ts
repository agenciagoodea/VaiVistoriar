import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer";

// POLYFILL: Deno.writeAll 
// @ts-ignore
if (typeof Deno.writeAll !== 'function') {
    // @ts-ignore
    Deno.writeAll = async function (w: any, data: Uint8Array) {
        let nwritten = 0;
        while (nwritten < data.length) {
            const n = await w.write(data.subarray(nwritten));
            if (n === null) break;
            nwritten += n;
        }
    };
}

const DEPLOY_ID = "v1-GENERIC-EMAIL";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_TEMPLATES = [
    {
        id: 'invite',
        name: 'Solicitação de Convite',
        subject: 'Você foi convidado para o VistoriaPro',
        html: `<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;"><div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;"><h1 style="color: #1e293b; margin-top: 0;">Olá!</h1><p style="color: #64748b; line-height: 1.6;">Você acaba de ser convidado para fazer parte da equipe do VistoriaPro.</p><a href="{{link}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 20px;">Concluir Cadastro</a><p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">Se você não solicitou este convite, ignore este e-mail.</p></div></div>`
    },
    {
        id: 'password_reset',
        name: 'Recuperação de Senha',
        subject: 'Recuperação de sua Senha - VistoriaPro',
        html: `<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;"><div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;"><h1 style="color: #1e293b; margin-top: 0; text-align: center;">Recuperar Senha</h1><p style="color: #64748b; line-height: 1.6; text-align: center;">Clique no botão abaixo para criar uma nova senha.</p><div style="text-align: center; margin: 40px 0;"><a href="{{link}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">Definir Nova Senha</a></div><p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px;">Se você não solicitou esta alteração, ignore este e-mail.</p></div></div>`
    },
    {
        id: 'send_report',
        name: 'Envio de Laudo Técnico',
        subject: 'Laudo de Vistoria Disponível - {{property_name}}',
        html: `<div style="font-family: sans-serif; padding: 40px; background: #f8fafc;"><div style="max-width: 600px; margin: 0 auto; bg-color: #fff; padding: 40px; border-radius: 20px;"><h1 style="color: #1e293b; margin-top: 0; text-align: center;">Vistoria Concluída</h1><p style="color: #64748b; line-height: 1.6; text-align: center;">Olá, <strong>{{client_name}}</strong>!</p><p style="color: #64748b; line-height: 1.6; text-align: center;">O laudo de vistoria do imóvel <strong>{{property_name}}</strong> já está disponível.</p><div style="text-align: center; margin: 40px 0;"><a href="{{report_link}}" style="display: inline-block; background: #2563eb; color: #fff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">Acessar Laudo Digital</a></div></div></div>`
    }
];

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || "https://cmrgzaoexmjilvbuduek.supabase.co";
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const respond = (data: any, status = 200) =>
        new Response(JSON.stringify({ ...data, deploy_id: DEPLOY_ID }), {
            status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    try {
        const body = await req.json()
        const { to, templateId, variables, config, origin } = body

        if (!SERVICE_ROLE) return respond({ success: false, error: 'SERVICE_ROLE_KEY ausente.' })

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

        // 1. Get SMTP Config and Template from DB if not provided
        const { data: configs } = await supabase.from('system_configs').select('*')

        let smtp = config || JSON.parse(configs?.find(c => c.key === 'email_smtp_config')?.value || '{}')
        const allTemplates = JSON.parse(configs?.find(c => c.key === 'email_templates_json')?.value || '[]')

        let template = allTemplates.find((t: any) => t.id === templateId) || DEFAULT_TEMPLATES.find(t => t.id === templateId);

        if (!smtp.host) {
            return respond({ success: false, error: 'Configurações de servidor SMTP não encontradas no banco de dados.' })
        }
        if (!template) {
            return respond({ success: false, error: `Template de e-mail '${templateId}' não encontrado.` })
        }

        // 2. Generate Recovery Link if it's a password reset
        const vars = variables || {};
        if (templateId === 'password_reset') {
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                type: 'recovery',
                email: to,
                options: { redirectTo: `${origin || 'https://www.vaivistoriar.com.br'}/#/reset-password` }
            })
            if (linkError) return respond({ success: false, error: `Erro ao gerar link: ${linkError.message}` })
            vars.link = linkData.properties.action_link;
        }

        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: Number(smtp.port),
            secure: Number(smtp.port) === 465,
            auth: {
                user: smtp.user,
                pass: smtp.pass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        let html = template.html;
        let subject = template.subject;

        // Replace all variables in HTML and Subject
        for (const key in vars) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, vars[key]);
            subject = subject.replace(regex, vars[key]);
        }

        const info = await transporter.sendMail({
            from: `"${smtp.senderName}" <${smtp.senderEmail}>`,
            to: to,
            subject: subject,
            html: html,
        });

        // Log success
        let logs = [];
        try {
            const existingLogs = configs?.find(c => c.key === 'email_delivery_log')?.value;
            logs = JSON.parse(existingLogs || '[]')
        } catch { logs = [] }

        logs = [{
            timestamp: new Date().toISOString(),
            recipient: to,
            success: true,
            deploy: DEPLOY_ID,
            error: info.response
        }, ...logs].slice(0, 50)

        await supabase.from('system_configs').upsert({ key: 'email_delivery_log', value: JSON.stringify(logs) })

        return respond({ success: true, response: info.response, messageId: info.messageId })

    } catch (err: any) {
        console.error('Email Error:', err.message)
        return respond({ success: false, error: err.message })
    }
})
