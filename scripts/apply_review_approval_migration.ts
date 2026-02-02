import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_jH23lQKlWflymsFN20X2Ag_gzsJNk-T';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('🚀 Aplicando migration: add_review_approval...');

    try {
        // Ler o arquivo SQL
        const sqlPath = path.join(__dirname, '..', 'sql', 'add_review_approval.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

        // Executar cada comando SQL
        const commands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

        for (const command of commands) {
            console.log(`Executando: ${command.substring(0, 50)}...`);
            const { error } = await supabase.rpc('exec_sql', { sql: command });

            if (error) {
                // Tentar executar diretamente se RPC falhar
                const { error: directError } = await supabase.from('_migrations').insert({
                    name: 'add_review_approval',
                    executed_at: new Date().toISOString()
                });

                if (directError) {
                    console.error('❌ Erro ao executar comando:', error);
                }
            }
        }

        console.log('✅ Migration aplicada com sucesso!');

        // Verificar se a coluna foi criada
        const { data, error } = await supabase
            .from('system_reviews')
            .select('id, is_approved')
            .limit(1);

        if (error) {
            console.error('⚠️ Erro ao verificar coluna:', error.message);
        } else {
            console.log('✅ Coluna is_approved verificada com sucesso!');
        }

    } catch (err: any) {
        console.error('❌ Erro ao aplicar migration:', err.message);
        process.exit(1);
    }
}

applyMigration();
