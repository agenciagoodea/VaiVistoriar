
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
        const PLAN_ID_PJ_FREE = '5c09eeb7-100f-4f84-aaa7-9bcc5df05306'; // IMOBILIÁRIA START
        const PLAN_ID_PF_FREE = 'fd4c420f-09b2-40a7-b43f-972e21378368'; // CORRETOR START

        console.log('--- FORÇANDO ATUALIZAÇÃO DE PLANOS PJ ---');

        // 1. Buscar todos os usuários com role PJ que estão no plano grátis de PF ou sem plano
        const { data: wrongPjs } = await supabase
            .from('broker_profiles')
            .select('id, company_name, full_name, role, subscription_plan_id')
            .eq('role', 'PJ')
            .or(`subscription_plan_id.eq.${PLAN_ID_PF_FREE},subscription_plan_id.is.null`);

        console.log(`Encontrados ${wrongPjs?.length || 0} usuários PJ com plano incorreto.`);

        if (wrongPjs && wrongPjs.length > 0) {
            const { error: updateError } = await supabase
                .from('broker_profiles')
                .update({
                    subscription_plan_id: PLAN_ID_PJ_FREE,
                    status: 'Ativo'
                })
                .in('id', wrongPjs.map(p => p.id));

            if (updateError) console.error('Erro ao atualizar PJs:', updateError.message);
            else console.log('Usuários PJ atualizados para o plano IMOBILIÁRIA START.');
        }

        // 2. Garantir que BROKERS estão no plano grátis de PF se não tiverem plano
        const { data: pfMissing } = await supabase
            .from('broker_profiles')
            .select('id')
            .eq('role', 'BROKER')
            .is('subscription_plan_id', null);

        if (pfMissing && pfMissing.length > 0) {
            await supabase
                .from('broker_profiles')
                .update({
                    subscription_plan_id: PLAN_ID_PF_FREE,
                    status: 'Ativo'
                })
                .in('id', pfMissing.map(p => p.id));
            console.log(`${pfMissing.length} Corretores atualizados para o plano CORRETOR START.`);
        }

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
