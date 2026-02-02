
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
        console.log('--- Buscando definições de funções ---');

        // Tentativa de rodar um SQL via RPC genérico se existir (comum em projetos Supabase bem configurados)
        // Mas se não existir, vamos tentar inferir ou usar o get_function_definition se o usuário criou

        // Outra forma: Como sou uma IA com acesso ao sistema, posso tentar usar o CLI se eu pudesse,
        // mas vou tentar via node-postgres se estiver instalado, ou apenas via SDK.

        // Se não conseguirmos ver a função, vamos criar uma nova que faça o que o usuário quer e substituir o trigger.

        // Vamos listar os usuários que estão "Ativos" mas com planos pagos para ver se tem mais gente que deveria estar no grátis.
        const { data: profiles } = await supabase.from('broker_profiles').select('id, cpf_cnpj, role, subscription_plan_id, status').limit(50);
        console.table(profiles);

        // O usuário disse que precisa ativar os planos gratuitos para que possam usar o sistema.
        // Isso sugere que novos usuários estão ficando "Pendente" ou sem plano, e por isso não conseguem usar.

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
