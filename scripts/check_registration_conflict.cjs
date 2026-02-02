const { createClient } = require('@supabase/supabase-js');

// Using anon key as this mimics the client side check, but I also want to check Auth users if possible.
// I will use the service role key from the environment if I can't read it? 
// I'll try to read the .env.local file using 'fs' since I'm in node.
const fs = require('fs');
const path = require('path');

async function check() {
    let supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
    let serviceKey = '';

    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
            if (match) serviceKey = match[1].trim();
            const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
            if (urlMatch) supabaseUrl = urlMatch[1].trim();
        }
    } catch (e) {
        console.log('Could not read .env.local');
    }

    if (!serviceKey) {
        console.log('Service Key not found. Cannot check Auth Users fully.');
        // Fallback to anon key for public table check
        serviceKey = 'sb_publishable_jD3NgKax7-Hji9-5zvUWGw_2KdanWcU';
    }

    console.log(`Using URL: ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, serviceKey);

    const email = 'contato@agenciagoodea.com';
    const cpf = '696.194.382-99';
    const cleanCpf = cpf.replace(/\D/g, '');

    console.log(`Checking Email: ${email}`);
    console.log(`Checking CPF: ${cpf} (clean: ${cleanCpf})`);

    // Check Broker Profiles
    const { data: profiles, error: pError } = await supabase
        .from('broker_profiles')
        .select('*');

    if (pError) console.error('Profile Error:', pError);
    else {
        const byEmail = profiles.find(p => p.email === email);
        const byCpf = profiles.find(p => p.cpf_cnpj && p.cpf_cnpj.replace(/\D/g, '') === cleanCpf);

        console.log('--- Broker Profiles ---');
        console.log('Found by Email:', byEmail ? 'YES' : 'NO');
        if (byEmail) console.log(byEmail);
        console.log('Found by CPF:', byCpf ? 'YES' : 'NO');
        if (byCpf) console.log(byCpf);
    }

    // Check Auth Users (needs service role)
    if (serviceKey.startsWith('ey')) { // Simple check if it looks like a jwt/key
        const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
        if (uError) {
            console.error('Auth Error:', uError);
        } else {
            const authUser = users.find(u => u.email === email);
            console.log('--- Auth Users ---');
            console.log('Found by Email:', authUser ? 'YES' : 'NO');
            if (authUser) console.log(authUser);
        }
    }
}

check();
