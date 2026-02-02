const { createClient } = require('@supabase/supabase-js');

// Configuração correta encontrada no .env.local
const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseKey = 'sb_publishable_jD3NgKax7-Hji9-5zvUWGw_2KdanWcU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    console.log(`Tentando conectar a: ${supabaseUrl}`);

    try {
        const { data, error } = await supabase
            .from('system_reviews')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Erro ao conectar/consultar:', error);
        } else {
            console.log('✅ Conexão bem-sucedida! Tabela system_reviews acessível.');
            console.log('Count (ou null):', data);
        }
    } catch (e) {
        console.error('❌ Exceção:', e);
    }
}

checkConnection();
