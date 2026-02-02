
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
        const targetCpfCnpj = '26306700000100'; // Agência Goodea
        const { data: profile, error: profErr } = await supabase
            .from('broker_profiles')
            .select('user_id, full_name, role, cpf_cnpj')
            .eq('cpf_cnpj', targetCpfCnpj)
            .single();

        if (profErr) throw profErr;

        console.log('--- PROFILE DATA ---');
        console.log(`Full Name: ${profile.full_name}`);
        console.log(`Role (DB): [${profile.role}]`);
        console.log(`User ID: ${profile.user_id}`);

        const { data: { user }, error: authErr } = await supabase.auth.admin.getUserById(profile.user_id);
        if (authErr) {
            console.error('Error fetching auth user:', authErr.message);
        } else {
            console.log('\n--- AUTH METADATA ---');
            console.log(`Role (Metadata): [${user.user_metadata?.role}]`);
        }

        // Listar planos PJ ativos com preço > 0
        const { data: plans } = await supabase.from('plans').select('id, name, plan_type, price').eq('status', 'Ativo').eq('plan_type', 'PJ');
        console.log('\n--- PLANOS PJ DISPONÍVEIS ---');
        plans.filter(p => p.price > 0).forEach(p => console.log(`${p.name} | R$ ${p.price}`));

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
