
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
        console.log('--- Investigando Agência Goodea ---');
        const { data: profiles, error } = await supabase
            .from('broker_profiles')
            .select('id, full_name, company_name, role, subscription_plan_id, status, plans:subscription_plan_id(*)')
            .ilike('company_name', '%Goodea%');

        if (error) {
            console.error('Erro ao buscar perfis:', error.message);
            return;
        }

        console.table(profiles.map(p => ({
            id: p.id,
            name: p.company_name || p.full_name,
            role: p.role,
            plan_name: p.plans?.name,
            plan_id: p.subscription_plan_id,
            plan_type: p.plans?.plan_type
        })));

        const { data: pjPlans } = await supabase.from('plans').select('*').eq('plan_type', 'PJ');
        console.log('\n--- Planos PJ Disponíveis ---');
        console.table(pjPlans.map(p => ({ id: p.id, name: p.name, type: p.plan_type, price: p.price })));

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
