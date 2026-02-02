
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
    console.log('--- Checking PJ Profile ---');
    const { data: pj, error: pjError } = await supabase
        .from('broker_profiles')
        .select('user_id, company_id, role')
        .eq('user_id', '9b6310c8-7455-4c58-889e-573176ea6922')
        .single();

    if (pjError) console.error('PJ Error:', pjError);
    else console.log('PJ Profile:', pj);

    console.log('\n--- Checking Inspections Schema ---');
    const { data: insp, error: inspError } = await supabase.from('inspections').select('*').limit(1);
    if (inspError) console.error('Insp Error:', inspError);
    else console.log('Inspection Keys:', insp && insp.length > 0 ? Object.keys(insp[0]) : 'No data');

    console.log('\n--- Checking Properties Schema ---');
    const { data: prop, error: propError } = await supabase.from('properties').select('*').limit(1);
    if (propError) console.error('Prop Error:', propError);
    else console.log('Property Keys:', prop && prop.length > 0 ? Object.keys(prop[0]) : 'No data');

    console.log('\n--- Checking Clients Schema ---');
    const { data: cli, error: cliError } = await supabase.from('clients').select('*').limit(1);
    if (cliError) console.error('Client Error:', cliError);
    else console.log('Client Keys:', cli && cli.length > 0 ? Object.keys(cli[0]) : 'No data');
}

main();
