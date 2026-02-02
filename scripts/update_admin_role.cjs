const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseKey = 'sb_publishable_jD3NgKax7-Hji9-5zvUWGw_2KdanWcU'; // Anon key is fine if RLS allows or if using service role (better use service role if available in code but I only have anon here? No, I can check environment or use the one from files if I could read them. I'll rely on the user having RLS open or me being able to update OWN profile if I was logged in).
// Actually, I should use the SERVICE_ROLE key if I can find it. 
// I recall seeing it in `admin-dash/index.ts` reading from Deno.env. I cannot read Deno env vars.
// But I can try to use the Anon Key. If RLS blocks me, I can't do it.
// Wait, I can use `run_command` to execute a script that uses `dotenv` if `.env.local` exists.
// The user is on Windows. `.env.local` exists.

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteToAdmin() {
    const cpf = '70153841249';
    console.log(`Searching for CPF: ${cpf}`);

    // Try multiple formats
    const formats = [
        cpf,
        '701.538.412-49',
        '70.153.841/249', // unlikely
    ];

    let user = null;

    // We cannot easily filter by "clean" CPF in client side without fetching all.
    // Try explicit match first.
    const { data: users, error } = await supabase.from('broker_profiles').select('*');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    const cleanCpf = (val) => val ? val.replace(/\D/g, '') : '';
    user = users.find(u => cleanCpf(u.cpf_cnpj) === cpf);

    if (!user) {
        console.error('User with CPF 70153841249 not found.');
        return;
    }

    console.log(`Found user: ${user.full_name} (${user.email}) - Current Role: ${user.role}`);

    const { error: updateError } = await supabase
        .from('broker_profiles')
        .update({
            role: 'ADMIN',
            company_name: 'ADMINISTRADOR DO SISTEMA',
            status: 'Ativo'
        })
        .eq('user_id', user.user_id);

    if (updateError) {
        console.error('Error updating role:', updateError);
    } else {
        console.log('SUCCESS: User promoted to ADMIN.');
    }
}

promoteToAdmin();
