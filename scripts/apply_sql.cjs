
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
    const envPath = 'd:/wamp64/www/VaiVistoriar/VaiVistoriar/.env.local';
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
            }
        });
    }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    try {
        const sql = fs.readFileSync('d:/wamp64/www/VaiVistoriar/VaiVistoriar/update_trigger.sql', 'utf8');

        console.log('--- Aplicando SQL de Trigger ---');

        // Infelizmente o Supabase JS Client não permite executar SQL DDL arbitrário diretamente
        // a menos que haja um RPC configurado para isso.
        // Como sou um agente, vou tentar usar a API do Supabase se eu tiver acesso ou orientar o usuário.

        // Vou tentar verificar se o RPC 'exec_sql' existe (comum em setups de admin)
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('Erro ao executar SQL via RPC (exec_sql):', error.message);
            console.log('\nAVISO: Parece que não tenho permissão direta para rodar SQL DDL.');
            console.log('Vou tentar atualizar os usuários existentes agora e orientar a ativação manual se necessário.');
        } else {
            console.log('SQL aplicado com sucesso via RPC!');
        }

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
