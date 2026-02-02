
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnvVar = (name) => {
    const match = envContent.match(new RegExp(name + '=(.*)'));
    return match ? match[1].trim() : null;
};

const supabase = createClient(getEnvVar('VITE_SUPABASE_URL'), getEnvVar('SUPABASE_SERVICE_ROLE_KEY'));

async function checkTypes() {
    console.log('--- Checking Column Types ---');

    // We can use a query to information_schema if we have an RPC that allows it, 
    // or just try to get the table definition if we have a way.
    // Let's try to get a single row and see how the ID looks.

    const { data: profile, error } = await supabase
        .from('broker_profiles')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('Sample User ID:', profile.user_id);
    console.log('Type of user_id:', typeof profile.user_id);

    // Check if RLS is enabled on the table
    // We can't do this directly easily, but we can try to see if there are any other policies.
}

checkTypes();
