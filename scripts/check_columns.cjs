
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
    console.log('--- Checking Broker Profiles Columns ---');
    // Fetch one row to see keys
    const { data: profiles, error: pError } = await supabase.from('broker_profiles').select('*').limit(1);
    if (pError) console.error('Profile Error:', pError);
    else if (profiles.length > 0) {
        console.log('Broker Profile Keys:', Object.keys(profiles[0]));
        console.log('Sample Profile:', profiles[0]);
    } else {
        console.log('No profiles found');
    }

    console.log('\n--- Checking Inspections Columns ---');
    const { data: insp, error: iError } = await supabase.from('inspections').select('*').limit(1);
    if (iError) console.error('Insp Error:', iError);
    else if (insp && insp.length > 0) console.log('Inspection Keys:', Object.keys(insp[0]));

    console.log('\n--- Checking Properties Columns ---');
    const { data: prop, error: prError } = await supabase.from('properties').select('*').limit(1);
    if (prError) console.error('Prop Error:', prError);
    else if (prop && prop.length > 0) console.log('Property Keys:', Object.keys(prop[0]));

    console.log('\n--- Checking Clients Columns ---');
    const { data: cli, error: cError } = await supabase.from('clients').select('*').limit(1);
    if (cError) console.error('Client Error:', cError);
    else if (cli && cli.length > 0) console.log('Client Keys:', Object.keys(cli[0]));
}

main();
