
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
        const email = 'contato@agenciagoodea.com';
        const { data: profiles, error } = await supabase
            .from('broker_profiles')
            .select('*')
            .eq('email', email);

        if (error) throw error;

        console.log(`--- PERFIS PARA O E-MAIL ${email} ---`);
        profiles.forEach(p => {
            console.log(`ID: ${p.id} | Name: ${p.full_name} | Role: ${p.role} | Plan: ${p.subscription_plan_id} | UserID: ${p.user_id}`);
        });

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
