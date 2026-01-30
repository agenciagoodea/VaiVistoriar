
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
    const envPath = 'd:/wamp64/www/VaiVistoriar/VaiVistoriar/.env.local';
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
            }
        });
    }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    try {
        const PLAN_ID_PJ = '5c09eeb7-100f-4f84-aaa7-9bcc5df05306'; // IMOBILIÁRIA START
        const PLAN_ID_PF = 'fd4c420f-09b2-40a7-b43f-972e21378368'; // CORRETOR START

        console.log('--- Iniciando Ativação em Massa ---');

        // 1. Ativar PJs Pendentes
        const { data: pjs, error: pjError } = await supabase
            .from('broker_profiles')
            .update({
                subscription_plan_id: PLAN_ID_PJ,
                status: 'Ativo',
                subscription_expires_at: new Date(new Date().getFullYear() + 10, 0, 1).toISOString()
            })
            .eq('role', 'PJ')
            .or('status.eq.Pendente,subscription_plan_id.is.null');

        if (pjError) console.error('Erro ao ativar PJs:', pjError.message);
        else console.log('Usuários PJ atualizados com sucesso.');

        // 2. Ativar PFs (BROKERS) Pendentes
        const { data: pfs, error: pfError } = await supabase
            .from('broker_profiles')
            .update({
                subscription_plan_id: PLAN_ID_PF,
                status: 'Ativo',
                subscription_expires_at: new Date(new Date().getFullYear() + 10, 0, 1).toISOString()
            })
            .eq('role', 'BROKER')
            .or('status.eq.Pendente,subscription_plan_id.is.null');

        if (pfError) console.error('Erro ao ativar PFs:', pfError.message);
        else console.log('Usuários PF atualizados com sucesso.');

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
