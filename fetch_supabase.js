import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseKey = 'sb_publishable_jD3NgKax7-Hji9-5zvUWGw_2KdanWcU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportAll() {
  console.log('=== TESTANDO BUSCA DE DADOS NO SUPABASE ===');

  const tables = ['plans', 'system_configs', 'system_reviews', 'broker_profiles', 'properties', 'inspections', 'clients', 'cookie_consents'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Erro ao buscar ${table}:`, error.message);
      } else {
        console.log(`Tabela [${table}]: ${data ? data.length : 0} registros encontrados.`);
        if (data && data.length > 0) {
          console.log(`Exemplo de ${table}:`, JSON.stringify(data[0], null, 2));
        }
      }
    } catch (err) {
      console.error(`Excecao ao buscar ${table}:`, err.message);
    }
  }
}

exportAll();
