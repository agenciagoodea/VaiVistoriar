import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import plansRoutes from './routes/plans.js';
import propertiesRoutes from './routes/properties.js';
import inspectionsRoutes from './routes/inspections.js';
import clientsRoutes from './routes/clients.js';
import configsRoutes from './routes/configs.js';
import reviewsRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import emailRoutes from './routes/email.js';
import mercadopagoRoutes from './routes/mercadopago.js';

import uploadRoutes from './routes/upload.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/configs', configsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/mercadopago', mercadopagoRoutes);
app.use('/api/upload', uploadRoutes);


// Rota de inicialização do Banco MySQL (rodar uma vez no setup)
app.get('/api/init-database-setup-trigger', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const mysql = await import('mysql2/promise');
    
    const conn = await mysql.default.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'vaivistoriar_root',
      password: process.env.DB_PASSWORD || '{fPOX[NZEdPhZl_(',
      database: process.env.DB_NAME || 'vaivistoriar_2026',
      multipleStatements: true
    });

    const sqlPath = path.default.join(__dirname, '../schema_mysql.sql');
    let sql = fs.default.readFileSync(sqlPath, 'utf8');
    await conn.query(sql);
    await conn.end();

    res.json({ success: true, message: 'Banco de Dados vaivistoriar_2026 inicializado com sucesso!' });
  } catch (err) {
    console.error('Erro na inicialização:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', system: 'VaiVistoriar cPanel Backend', timestamp: new Date().toISOString() });
});

// Servir os arquivos estáticos do React em produção (quando hospedado na mesma aplicação)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Servidor cPanel rodando. Build do frontend não encontrado em /dist.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor VaiVistoriar Backend rodando na porta ${PORT}`);
});

export default app;
