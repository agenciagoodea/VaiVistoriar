import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('Iniciando conexão com o MySQL...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'vaivistoriar_root',
    password: process.env.DB_PASSWORD || '{fPOX[NZEdPhZl_(',
    database: process.env.DB_NAME || 'vaivistoriar_2026',
    multipleStatements: true
  });

  console.log('Conectado ao banco de dados:', process.env.DB_NAME);

  const sqlPath = path.join(__dirname, '../schema_mysql.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executando o script SQL...');
  await connection.query(sql);
  console.log('Script SQL executado com sucesso!');

  await connection.end();
}

initDatabase().catch(err => {
  console.error('Erro na inicialização do banco:', err);
  process.exit(1);
});
