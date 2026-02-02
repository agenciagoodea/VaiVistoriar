
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnvVar = (name) => {
    const match = envContent.match(new RegExp(name + '=(.*)'));
    return match ? match[1].trim() : null;
};

const supabase = createClient(getEnvVar('VITE_SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));

async function inspectTable() {
    console.log('--- Inspecting broker_profiles ---');

    // Check columns and types
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'broker_profiles' });
    if (colError) {
        console.log('RPC get_table_columns failed:', colError.message);
        // Fallback: try to get one record and see keys
        const { data: samples } = await supabase.from('broker_profiles').select('*').limit(1);
        if (samples && samples[0]) {
            console.log('Columns from sample:', Object.keys(samples[0]));
        }
    } else {
        console.log('Columns:', cols);
    }

    // Check row for the specific user
    const email = 'contato@agenciagoodea.com';
    const { data: profile, error: pError } = await supabase
        .from('broker_profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (pError) {
        console.error('Profile fetch error:', pError.message);
    } else {
        console.log('Profile found:', {
            user_id: profile.user_id,
            email: profile.email,
            role: profile.role,
            cpf_cnpj: profile.cpf_cnpj
        });
    }

    // Try a broad check on RLS settings via information_schema or similar if possible
    // Since we can't run raw SQL easily, let's try to find if RLS is enabled via a trick
}

inspectTable();
