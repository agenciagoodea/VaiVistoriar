const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseServiceKey = 'sb_secret_jH23lQKlWflymsFN20X2Ag_gzsJNk-T';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixPolicies() {
    console.log('🛡️ Corrigindo políticas de RLS para system_reviews...\n');

    try {
        // Como não podemos rodar comandos DDL arbitrários via API REST sem RPC especial, 
        // vamos tentar verificar se as políticas já existem via SELECT (se houver permissão)
        // Se não, vamos instruir o usuário.

        console.log('📝 Devido a restrições de segurança, as políticas de RLS devem ser aplicadas através do Dashboard do Supabase.');
        console.log('\nPor favor, execute o seguinte código no SQL Editor do seu projeto:');
        console.log('\n------------------------------------------------------------');
        console.log(`
-- 1. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON system_reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON system_reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON system_reviews;

-- 2. Permitir que qualquer pessoa veja reviews aprovados (Landing Page)
CREATE POLICY "Anyone can view approved reviews" 
ON system_reviews 
FOR SELECT 
USING (is_approved = true);

-- 3. Permitir que usuários autenticados vejam todos (Admin Dashboard)
CREATE POLICY "Authenticated users can see all reviews" 
ON system_reviews 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Permitir que usuários gerenciem seus próprios reviews
CREATE POLICY "Users can manage own reviews" 
ON system_reviews 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Permitir que o sistema (service role) faça edições de aprovação
-- (Isso já é permitido por padrão com a service role key)
    `);
        console.log('------------------------------------------------------------\n');

        console.log('✅ Instruções geradas com sucesso!');

    } catch (err) {
        console.error('\n❌ Erro:', err.message);
    }
}

fixPolicies();
