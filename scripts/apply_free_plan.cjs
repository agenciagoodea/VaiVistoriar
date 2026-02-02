
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
    const envPath = 'd:/wamp64/www/VaiVistoriar/VaiVistoriar/.env.local';
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key_val] = line.split('\n');
            const parts = key_val.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                process.env[key] = value;
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
        // 1. Listar planos
        const { data: plans } = await supabase.from('plans').select('*');
        console.log('--- TODOS OS PLANOS ---');
        plans.forEach(p => {
            console.log(`ID: ${p.id} | Nome: ${p.name} | Preço: ${p.price} | Tipo: ${p.plan_type} | Status: ${p.status}`);
        });

        const freePlan = plans.find(p => parseFloat(p.price) === 0);
        if (!freePlan) {
            console.log('ERRO: Plano gratuito não encontrado!');
            return;
        }

        console.log('\nPlano Gratuito Escolhido:', freePlan.name, `(${freePlan.id})`);

        // 2. Aplicar ao usuário CNPJ 26306700000100
        console.log('\n--- Aplicando plano ao usuário CNPJ 26306700000100 ---');
        const { data: user, error: userError } = await supabase
            .from('broker_profiles')
            .select('id, cpf_cnpj, subscription_plan_id')
            .eq('cpf_cnpj', '26306700000100')
            .single();

        if (userError || !user) {
            console.error('Erro ao buscar o usuário:', userError?.message || 'Usuário não encontrado');
        } else {
            console.log('Usuário atual:', user);

            const { data: updateData, error: updateError } = await supabase
                .from('broker_profiles')
                .update({
                    subscription_plan_id: freePlan.id,
                    status: 'Ativo',
                    subscription_expires_at: new Date(new Date().getFullYear() + 10, 0, 1).toISOString() // Plano "eterno" ou data longa
                })
                .eq('id', user.id);

            if (updateError) {
                console.error('Erro ao atualizar plano:', updateError.message);
            } else {
                console.log('Sucesso! Plano gratuito aplicado ao usuário.');
            }
        }

    } catch (err) {
        console.error('Erro:', err.message);
    }
}

main();
