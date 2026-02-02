
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
        // 1. Check templates
        const { data: configs } = await supabase.from('system_configs').select('*');
        const templatesJson = configs.find(c => c.key === 'email_templates_json')?.value;
        const templates = JSON.parse(templatesJson || '[]');
        console.log('--- Email Templates ---');
        templates.forEach(t => console.log(`ID: ${t.id}, Name: ${t.name}`));

        // 2. Check recent payments for the user in the screenshot
        // Email from screenshot (Image 0): irasid34@gmail.com
        const { data: profile } = await supabase.from('broker_profiles').select('user_id').eq('email', 'irasid34@gmail.com').single();
        if (profile) {
            console.log('\n--- Recent Payments for irasid34@gmail.com ---');
            const { data: payments } = await supabase.from('payment_history')
                .select('*')
                .eq('user_id', profile.user_id)
                .order('created_at', { ascending: false })
                .limit(5);
            console.log(JSON.stringify(payments, null, 2));
        }

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
