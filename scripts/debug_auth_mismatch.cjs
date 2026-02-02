
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
        const userId = 'd77c7cde-4a84-4478-8fc1-c83f8fd903e7';

        // Check Auth User
        const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(userId);
        if (authErr) {
            console.log('--- ERRO AO BUSCAR NO AUTH ---');
            console.log(authErr.message);
        } else {
            console.log('--- USUÁRIO NO AUTH ---');
            console.log(`ID: ${authUser.user.id}`);
            console.log(`Email: ${authUser.user.email}`);
            console.log(`Role (metadata): ${authUser.user.user_metadata?.role}`);
        }

        // Check Profile
        const { data: profile, error: profErr } = await supabase
            .from('broker_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (profErr) {
            console.log('--- ERRO AO BUSCAR PERFIL ---');
            console.log(profErr.message);
        } else {
            console.log('--- PERFIL NO BANCO ---');
            console.log(`UserID: ${profile.user_id}`);
            console.log(`Role: ${profile.role}`);
            console.log(`Email: ${profile.email}`);
        }

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
