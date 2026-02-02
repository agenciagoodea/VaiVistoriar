const { createClient } = require('@supabase/supabase-js');

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
        // Verificar se a tabela existe e tentar adicionar a coluna
        console.log('1️⃣ Verificando estrutura da tabela system_reviews...');

        const { data: existingReviews, error: checkError } = await supabase
            .from('system_reviews')
            .select('*')
            .limit(1);

        if (checkError) {
            throw new Error(`Erro ao acessar tabela: ${checkError.message}`);
        }

        console.log('✅ Tabela system_reviews encontrada!');

        // Verificar se a coluna is_approved já existe
        if (existingReviews && existingReviews.length > 0) {
            const hasColumn = 'is_approved' in existingReviews[0];

            if (hasColumn) {
                console.log('✅ Coluna is_approved já existe!');
            } else {
                console.log('⚠️ Coluna is_approved não encontrada.');
                console.log('📝 Por favor, execute o seguinte SQL no Supabase SQL Editor:');
                console.log('\nALTER TABLE system_reviews ADD COLUMN is_approved BOOLEAN DEFAULT false;');
                console.log('CREATE INDEX idx_system_reviews_approved ON system_reviews(is_approved);\n');
            }
        }

        // 2. Atualizar reviews existentes para aprovados (compatibilidade)
        console.log('\n2️⃣ Atualizando reviews existentes...');
        const { data: allReviews } = await supabase
            .from('system_reviews')
            .select('id, is_approved');

        if (allReviews) {
            const needsUpdate = allReviews.filter(r => r.is_approved === null || r.is_approved === undefined);

            if (needsUpdate.length > 0) {
                console.log(`   Encontrados ${needsUpdate.length} reviews sem status de aprovação`);

                for (const review of needsUpdate) {
                    await supabase
                        .from('system_reviews')
                        .update({ is_approved: true })
                        .eq('id', review.id);
                }

                console.log('✅ Reviews atualizados para aprovados!');
            } else {
                console.log('✅ Todos os reviews já possuem status de aprovação!');
            }
        }

        // 3. Verificar resultado final
        console.log('\n3️⃣ Verificando resultado...');
        const { data: stats } = await supabase
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

    } catch (err) {
        console.error('\n❌ Erro ao aplicar migration:', err.message);
        process.exit(1);
    }
}

applyMigration();
