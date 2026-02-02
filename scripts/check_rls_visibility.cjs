
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnvVar = (name) => {
    const match = envContent.match(new RegExp(name + '=(.*)'));
    return match ? match[1].trim() : null;
};

const supabase = createClient(getEnvVar('VITE_SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));

async function checkRLS() {
    console.log('--- Checking RLS Policies ---');

    // We can query pg_policies via RPC or raw SQL if we have a way.
    // Since we don't have a direct raw SQL RPC, we can try to use the 'check_schema' script logic 
    // or just try to APPLY a fix directly if we suspect it.

    // Let's try to query the table using the SERVICE ROLE (should work) 
    // and then try to query it using the ANON KEY (should probably fail if RLS is tight).

    const { data: serviceData, error: serviceError } = await supabase
        .from('broker_profiles')
        .select('count')
        .limit(1);

    console.log('Service Role Test:', serviceError ? serviceError.message : 'OK (' + serviceData.length + ' rows)');

    const publicSupabase = createClient(getEnvVar('VITE_SUPABASE_URL'), getEnvVar('VITE_SUPABASE_ANON_KEY'));
    const { data: publicData, error: publicError } = await publicSupabase
        .from('broker_profiles')
        .select('*')
        .limit(1);

    console.log('Public Anon Test:', publicError ? publicError.message : 'OK (' + publicData.length + ' rows)');

    if (!publicError && publicData.length === 0 && serviceData.length > 0) {
        console.log('⚠️ RLS is likely blocking public access (returned 0 rows despite data existing).');
    }
}

checkRLS();
