import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseServiceKey = 'sb_secret_jH23lQKlWflymsFN20X2Ag_gzsJNk-T';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const NEW_STATUSES = [
    'Concluída', 'Pendente', 'Em andamento', 'Rascunho', 'Agendada',
    'Finalizada', 'Cancelada', 'Enviada', 'Editando', 'Enviado por e-mail'
];

const sql = `
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_status_check;
ALTER TABLE inspections ADD CONSTRAINT inspections_status_check CHECK (status IN (${NEW_STATUSES.map(s => `'${s}'`).join(', ')}));
`;

async function fixConstraint() {
    console.log('🚀 Atualizando restrição de status na tabela inspections...\n');

    try {
        const { error } = await supabase.rpc('exec_sql', {
            query: sql
        });

        if (error) {
            console.error('❌ Erro ao executar SQL:', error.message);
            // Se o RPC não existir, tentamos via query direta (se o client permitir, o que o service_role as vezes permite dependendo da config)
            console.log('⚠️ Tentando método alternativo via PostgREST (se habilitado)...');
            // Nota: SQL bruto via PostgREST geralmente não é permitido sem RPC.
        } else {
            console.log('✅ Restrição de status atualizada com sucesso!');
            console.log('Valores permitidos:', NEW_STATUSES.join(', '));
        }

    } catch (err) {
        console.error('\n❌ Erro fatal:', err.message);
    }
}

fixConstraint();
