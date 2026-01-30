
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
    const envPath = 'd:/wamp64/www/VaiVistoriar/VaiVistoriar/.env.local';
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    try {
        // 1. Listar todos os planos detalhadamente
        const { data: plans } = await supabase.from('plans').select('*');
        console.log('--- Planos ---');
        console.table(plans.map(p => ({ id: p.id, name: p.name, price: p.price, type: p.plan_type, status: p.status })));

        // 2. Buscar a função do trigger handle_new_user_trial_insert
        // Como não podemos rodar SQL arbitrário facilmente sem RPC, vamos tentar ver se existe um RPC para isso
        // ou se podemos inferir. 
        // Outra forma é tentar encontrar o código da função no banco.

        const { data: triggerFunc } = await supabase.rpc('get_function_definition', { function_name: 'handle_new_user_trial_insert' });
        if (triggerFunc) {
            console.log('\n--- Definição da Função do Trigger ---');
            console.log(triggerFunc);
        } else {
            console.log('\nFunção handle_new_user_trial_insert não encontrada via RPC.');

            // Tentativa 2: Buscar definições de triggers via query SQL direta se possível
            const { data: sqlResult, error: sqlError } = await supabase.from('pg_trigger').select('*').limit(1);
            // Isso provavelmente vai falhar porque pg_trigger não é uma tabela pública acessível via PostgREST.
        }

        // 3. Verificar usuários com status "Pendente" ou "Ativo" sem plano de R$ 0
        const { data: newUsers } = await supabase.from('broker_profiles').select('id, cpf_cnpj, subscription_plan_id, status').limit(10);
        console.log('\n--- Últimos Perfis ---');
        console.table(newUsers);

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

checkDatabase();
