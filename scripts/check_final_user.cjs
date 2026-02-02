
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
        const userId = 'fe74ea88-3ba9-4a04-8e63-cadba3781e29';
        const { data: profile, error } = await supabase
            .from('broker_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        console.log('--- PERFIL ---');
        console.log(`Email: ${profile.email}`);
        console.log(`Role: ${profile.role}`);
        console.log(`Status: ${profile.status}`);

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
