
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
        console.log('--- PLANOS ---');
        const { data: plans } = await supabase.from('plans').select('*');
        plans.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name} | Type: ${p.plan_type} | Price: ${p.price}`));

        console.log('\n--- Agência Goodea (Perfil Atual) ---');
        const { data: profile } = await supabase
            .from('broker_profiles')
            .select('id, company_name, full_name, role, subscription_plan_id, status, plans:subscription_plan_id(*)')
            .ilike('company_name', '%Goodea%')
            .single();

        if (profile) {
            console.log(`ID: ${profile.id}`);
            console.log(`Empresa: ${profile.company_name}`);
            console.log(`Role: ${profile.role}`);
            console.log(`Plano ID: ${profile.subscription_plan_id}`);
            console.log(`Plano Vinculado: ${profile.plans?.name} (${profile.plans?.plan_type})`);
        } else {
            console.log('Agência Goodea não encontrada!');
        }

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
