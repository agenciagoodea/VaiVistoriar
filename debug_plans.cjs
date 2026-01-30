
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
        const { data: plans } = await supabase.from('plans').select('id, name, plan_type, price');
        console.log('--- TODOS OS PLANOS ---');
        plans.forEach(p => console.log(`${p.id} | ${p.name} | ${p.plan_type} | R$ ${p.price}`));

        const { data: profiles } = await supabase
            .from('broker_profiles')
            .select('full_name, company_name, role, subscription_plan_id')
            .ilike('full_name', '%Goodea%');

        console.log('\n--- Agência Goodea (Busca por Full Name) ---');
        profiles.forEach(p => console.log(`${p.full_name} | ${p.company_name} | Role: ${p.role} | Plan: ${p.subscription_plan_id}`));

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
