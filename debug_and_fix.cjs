
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseKey = 'sb_secret_jH23lQKlWflymsFN20X2Ag_gzsJNk-T';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Fixing Specific Payments ---');
    const targetFullIds = [
        '5c062a6f-aedc-4962-9993-98037c9df6c8',
        'ba4fc488-8179-4f5e-98b5-412e3314cecc'
    ];

    const { error: uErr } = await supabase.from('payment_history')
        .update({ status: 'approved' })
        .in('id', targetFullIds);

    if (uErr) console.error('Error updating payments:', uErr);
    else console.log('Successfully updated payments to approved.');

    console.log('--- Verifying ---');
    const { data: payments } = await supabase.from('payment_history').select('id, status').in('id', targetFullIds);
    console.log('Verification:', payments);
}

run();
