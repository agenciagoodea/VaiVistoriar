
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
        const { data: profiles, error } = await supabase
            .from('broker_profiles')
            .select('user_id, full_name, company_name, role, subscription_plan_id, status, plans:subscription_plan_id(*)');

        if (error) {
            console.error('Erro:', error.message);
            return;
        }

        console.log('--- LISTA DE PERFIS E PLANOS ---');
        profiles.forEach(p => {
            console.log(`User: ${p.user_id} | Nome: ${p.full_name} | Empresa: ${p.company_name} | Role: ${p.role} | Plano: ${p.plans?.name} (${p.plans?.plan_type})`);
        });

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
