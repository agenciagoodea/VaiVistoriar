
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
        const { data, error } = await supabase.from('inspections').select('*').limit(1);
        if (error) throw error;
        if (data && data.length > 0) {
            console.log('--- COLUNAS DE INSPECTIONS ---');
            console.log(Object.keys(data[0]));
        } else {
            console.log('Nenhuma inspeção encontrada.');
        }
    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
