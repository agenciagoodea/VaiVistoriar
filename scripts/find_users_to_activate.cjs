
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
        // 1. Planos
        const { data: plans } = await supabase.from('plans').select('*');
        const freePlanPF = plans.find(p => parseFloat(p.price) === 0 && p.plan_type === 'PF');
        const freePlanPJ = plans.find(p => parseFloat(p.price) === 0 && p.plan_type === 'PJ');

        console.log('Plano Grátis PF:', freePlanPF?.name, `(${freePlanPF?.id})`);
        console.log('Plano Grátis PJ:', freePlanPJ?.name, `(${freePlanPJ?.id})`);

        // 2. Buscar usuários sem plano ou pendentes
        const { data: users, error } = await supabase
            .from('broker_profiles')
            .select('id, cpf_cnpj, role, subscription_plan_id, status, full_name')
            .or('status.eq.Pendente,subscription_plan_id.is.null');

        if (error) {
            console.error('Erro ao buscar usuários:', error.message);
            return;
        }

        console.log(`\nEncontrados ${users.length} usuários que podem precisar de ativação:`);
        console.table(users);

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
