
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
        console.log('--- AUDITORIA DE USUÁRIOS ---');

        // 1. List ALL auth users (paging if needed)
        const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
        if (authErr) throw authErr;

        console.log(`Total de usuários no Auth: ${users.length}`);

        // Find by email or name
        const adrianoUsers = users.filter(u =>
            (u.email && u.email.includes('adriano')) ||
            (u.user_metadata?.full_name && u.user_metadata.full_name.includes('Adriano'))
        );

        console.log('\n--- USUÁRIOS ADRIANO NO AUTH ---');
        adrianoUsers.forEach(u => {
            console.log(`ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at} | Role: ${u.user_metadata?.role}`);
        });

        // 2. Check broker_profiles for the same
        const { data: profiles, error: profErr } = await supabase
            .from('broker_profiles')
            .select('*');
        if (profErr) throw profErr;

        const adrianoProfiles = profiles.filter(p =>
            (p.email && p.email.includes('adriano')) ||
            (p.full_name && p.full_name.includes('Adriano')) ||
            (p.cpf_cnpj === '70153841249')
        );

        console.log('\n--- PERFIS ADRIANO NO BANCO ---');
        adrianoProfiles.forEach(p => {
            console.log(`ID: ${p.id} | UserID: ${p.user_id} | Email: ${p.email} | Role: ${p.role} | CPF: ${p.cpf_cnpj}`);
        });

        // 3. Confirm which UserID is currently in use for the login
        // (We can't do this easily without the user's token, but we can see discrepancies)

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
