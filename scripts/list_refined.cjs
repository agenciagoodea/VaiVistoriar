
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
        const email = 'adriano_amorim@hotmail.com';
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const filtered = users.filter(u => u.email === email);

        filtered.forEach(u => {
            console.log(`FOUND_ID: ${u.id}`);
            console.log(`CREATED: ${u.created_at}`);
            console.log(`METADATA: ${JSON.stringify(u.user_metadata)}`);
        });

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
