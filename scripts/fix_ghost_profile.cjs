const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const serviceKey = 'sb_secret_jH23lQKlWflymsFN20X2Ag_gzsJNk-T';

const supabase = createClient(supabaseUrl, serviceKey);

async function fixGhost() {
    const email = 'contato@agenciagoodea.com';
    const cpf = '696.194.382-99';
    const cleanCpf = cpf.replace(/\D/g, '');

    console.log(`Cleaning up ghost profile for: ${email}`);

    // Delete by Email if user_id is null
    const { data: d1, error: e1 } = await supabase
        .from('broker_profiles')
        .delete()
        .eq('email', email)
        .is('user_id', null)
        .select();

    if (e1) console.error('Error deleting by email:', e1);
    else console.log('Deleted by email:', d1);

    // Delete by CPF if user_id is null (just in case)
    // Note: cpf_cnpj format in DB might vary (clean or formatted). Checking both or just clean if I could, but I can't apply function in .eq easily?
    // Actually, I can use .ilike or similar if needed, but let's assume it matches what the check script found (it didn't find by CPF last time, so maybe only email matches).

    // The previous check script found:
    // Found by Email: YES
    // Found by CPF: NO
    // So only email delete is needed.
}

fixGhost();
