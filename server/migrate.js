import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('--- MIGRACAO BANCO DE DADOS MYSQL ---');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'vaivistoriar_root',
    password: process.env.DB_PASSWORD || '{fPOX[NZEdPhZl_(',
    database: process.env.DB_NAME || 'vaivistoriar_2026',
    multipleStatements: true
  });

  console.log('Conectado ao MySQL database:', process.env.DB_NAME);

  const sqlPath = path.join(__dirname, '../schema_mysql.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Executar query a query
  const queries = sqlContent
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 0);

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    try {
      await connection.query(q);
      console.log(`Query ${i + 1}/${queries.length} OK`);
    } catch (err) {
      console.error(`Erro na Query ${i + 1}:`, err.message);
    }
  }

  // Verificar quais tabelas existem
  const [tables] = await connection.query('SHOW TABLES');
  console.log('Tabelas criadas com sucesso no banco:');
  console.log(JSON.stringify(tables, null, 2));

  await connection.end();
}

runMigration().catch(err => {
  console.error('Erro geral na migracao:', err);
  process.exit(1);
});
