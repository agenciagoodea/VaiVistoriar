
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnvVar = (name) => {
    const match = envContent.match(new RegExp(name + '=(.*)'));
    return match ? match[1].trim() : null;
};

const supabase = createClient(getEnvVar('VITE_SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));

async function main() {
    console.log('--- Checking PJ Profile specifically for company_name ---');
    const { data: pj, error: pjError } = await supabase
        .from('broker_profiles')
        .select('user_id, company_name, role')
        .eq('user_id', '9b6310c8-7455-4c58-889e-573176ea6922')
        .single();

    if (pjError) console.log('Error:', pjError.message);
    else console.log('PJ Data:', pj);
}

main();
