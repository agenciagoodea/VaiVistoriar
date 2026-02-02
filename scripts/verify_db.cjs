
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Função para carregar variáveis do .env.local manualmente se o dotenv falhar
function loadEnv() {
    const envPath = 'd:/wamp64/www/VaiVistoriar/VaiVistoriar/.env.local';
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log('--- Verificando Projeto Supabase ---');
    console.log('URL:', supabaseUrl);

    try {
        // 1. Listar planos
        const { data: plans, error: plansError } = await supabase.from('plans').select('*');
        if (plansError) {
            console.error('Erro ao buscar planos:', plansError.message);
        } else {
            console.log('Planos encontrados:', plans.length);
            console.table(plans.map(p => ({ id: p.id, name: p.name, price: p.price, type: p.plan_type })));
        }

        // 2. Buscar usuário específico (CNPJ 26306700000100)
        console.log('\n--- Buscando usuário CNPJ 26306700000100 ---');
        const { data: profiles, error: profilesError } = await supabase
            .from('broker_profiles')
            .select('*, plans:subscription_plan_id(*)')
            .eq('cpf_cnpj', '26306700000100');

        if (profilesError) {
            console.error('Erro ao buscar perfis:', profilesError.message);
        } else if (profiles && profiles.length > 0) {
            console.log('Perfil encontrado:');
            console.log(JSON.stringify(profiles[0], null, 2));
        } else {
            console.log('Nenhum perfil encontrado com esse CNPJ.');
        }

        // Tentativa de buscar o plano grátis (R$ 0,00)
        if (plans) {
            const freePlan = plans.find(p => parseFloat(p.price) === 0);
            if (freePlan) {
                console.log('\nPlano gratuito encontrado:', freePlan.id, freePlan.name);
            } else {
                console.log('\nNenhum plano com preço R$ 0,00 encontrado!');
            }
        }

    } catch (err) {
        console.error('Erro inesperado:', err.message);
    }
}

checkDatabase();
