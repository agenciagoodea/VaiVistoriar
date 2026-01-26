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

const DEPLOY_ID = "v4-DETAILED-LOG";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
        const { to, name, invite_link, config, template: providedTemplate } = body

        if (!SERVICE_ROLE) return respond({ success: false, error: 'SERVICE_ROLE_KEY ausente.' })

        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

        let smtp = config || {}
        let template = providedTemplate

        if (!smtp.host || !template) {
            const { data: configs } = await supabase.from('system_configs').select('*')
            smtp = smtp.host ? smtp : JSON.parse(configs?.find(c => c.key === 'email_smtp_config')?.value || '{}')
            template = template || JSON.parse(configs?.find(c => c.key === 'email_templates_json')?.value || '[]').find(t => t.id === 'invite')
        }

        if (!smtp.host || !template) return respond({ success: false, error: 'Configurações de e-mail não encontradas.' })

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

        try {
            const html = template.html.replace(/{{user_name}}/g, name || '').replace(/{{link}}/g, invite_link || '');

            const info = await transporter.sendMail({
                from: `"${smtp.senderName}" <${smtp.senderEmail}>`,
                to: to,
                subject: template.subject,
                html: html,
            });

            console.log('SMTP Sent Info:', JSON.stringify(info));

            // Log success with server response
            supabase.from('system_configs').select('value').eq('key', 'email_delivery_log').maybeSingle().then(({ data }) => {
                let logs = []; try { logs = JSON.parse(data?.value || '[]') } catch { logs = [] }
                logs = [{
                    timestamp: new Date().toISOString(),
                    recipient: to,
                    success: true,
                    deploy: DEPLOY_ID,
                    error: info.response // Capturamos a resposta técnica do servidor aqui
                }, ...logs].slice(0, 50)
                supabase.from('system_configs').upsert({ key: 'email_delivery_log', value: JSON.stringify(logs) }).then(() => { })
            })

            return respond({ success: true, response: info.response, messageId: info.messageId })
        } catch (smtpErr: any) {
            console.error('SMTP Error:', smtpErr.message)
            await supabase.from('system_configs').select('value').eq('key', 'email_delivery_log').maybeSingle().then(({ data }) => {
                let logs = []; try { logs = JSON.parse(data?.value || '[]') } catch { logs = [] }
                logs = [{ timestamp: new Date().toISOString(), recipient: to, success: false, error: smtpErr.message, deploy: DEPLOY_ID }, ...logs].slice(0, 50)
                supabase.from('system_configs').upsert({ key: 'email_delivery_log', value: JSON.stringify(logs) }).then(() => { })
            })
            return respond({ success: false, error: `Falha SMTP: ${smtpErr.message}` })
        }
    } catch (err: any) {
        console.error('Internal Error:', err.message)
        return respond({ success: false, error: `Erro Interno: ${err.message}` })
    }
})