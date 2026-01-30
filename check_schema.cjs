
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
        const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'payment_history' });

        if (error) {
            // Se o RPC não existir, tentamos via query direta se possível ou apenas pegamos um record
            console.log('RPC failed, trying to fetch one record...');
            const { data: records, error: fetchError } = await supabase.from('payment_history').select('*').limit(1);
            if (fetchError) throw fetchError;
            console.log('Columns:', Object.keys(records[0] || {}));
        } else {
            console.log('Columns:', data);
        }
    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
