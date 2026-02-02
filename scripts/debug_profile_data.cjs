
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local from project root
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
    const match = envContent.match(new RegExp(`${name}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY'); // Changed to ANON keyword as VITE prefix is common

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Debugging Profile Data ---');

    // Check if we can list any profiles to see if connection works
    const { data: profiles, error: pError } = await supabase
        .from('broker_profiles')
        .select('*')
        .limit(1);

    if (pError) {
        console.error('Error fetching samples:', pError);
    } else {
        console.log('Successfully connected and fetched a sample (count):', profiles.length);
    }

    // Try to find the profile by CNPJ directly since user mentioned it
    const cnpj = '21306700000100'; // It's already a string, but Let's be sure
    const { data: cnpjProfile, error: cError } = await supabase
        .from('broker_profiles')
        .select('*')
        .eq('cpf_cnpj', String(cnpj))
        .limit(1); // Use limit(1) instead of single() to see multiple if they exist

    if (cError) {
        console.error('Error fetching profile by CNPJ:', cError.message);
    } else {
        console.log('Profile found by CNPJ:', cnpjProfile);
    }
}

debug();
