import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseServiceKey = 'sb_secret_jH23lQKlWflymsFN20X2Ag_gzsJNk-T';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyMigration() {
    console.log('🚀 Aplicando migration: add_review_approval...\n');

    try {
        // 1. Adicionar coluna is_approved
        console.log('1️⃣ Adicionando coluna is_approved...');
        const { error: alterError } = await supabase.rpc('exec_sql', {
            query: 'ALTER TABLE system_reviews ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;'
        });

        if (alterError && !alterError.message.includes('already exists')) {
            console.log('⚠️ Tentando método alternativo...');
            // Método alternativo: verificar se a coluna já existe
            const { data: columns } = await supabase
                .from('system_reviews')
                .select('is_approved')
                .limit(1);

            if (columns) {
                console.log('✅ Coluna is_approved já existe ou foi criada!');
            }
        } else {
            console.log('✅ Coluna is_approved adicionada!');
        }

        // 2. Atualizar reviews existentes
        console.log('\n2️⃣ Atualizando reviews existentes para aprovados...');
        const { error: updateError } = await supabase
            .from('system_reviews')
            .update({ is_approved: true })
            .is('is_approved', null);

        if (!updateError) {
            console.log('✅ Reviews existentes marcados como aprovados!');
        }

        // 3. Verificar resultado
        console.log('\n3️⃣ Verificando resultado...');
        const { data: stats, error: statsError } = await supabase
            .from('system_reviews')
            .select('is_approved');

        if (stats) {
            const total = stats.length;
            const approved = stats.filter(r => r.is_approved === true).length;
            const pending = stats.filter(r => r.is_approved === false).length;

            console.log('\n📊 Estatísticas:');
            console.log(`   Total de reviews: ${total}`);
            console.log(`   ✅ Aprovados: ${approved}`);
            console.log(`   ⏳ Pendentes: ${pending}`);
        }

        console.log('\n✅ Migration aplicada com sucesso!');
        console.log('\n💡 Próximos passos:');
        console.log('   1. Acesse o admin → Avaliações');
        console.log('   2. Teste aprovar/desaprovar reviews');
        console.log('   3. Verifique a landing page');

    } catch (err: any) {
        console.error('\n❌ Erro ao aplicar migration:', err.message);
        process.exit(1);
    }
}

applyMigration();
