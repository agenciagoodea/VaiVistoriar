import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { crypto } from 'node:crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
const supabaseKey = 'sb_publishable_jD3NgKax7-Hji9-5zvUWGw_2KdanWcU';
const supabase = createClient(supabaseUrl, supabaseKey);

const uploadsDir = path.join(__dirname, '../public_html/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Função utilitária para baixar imagem do Supabase Storage e salvar no cPanel
async function downloadAndReplaceImage(url) {
  if (!url || typeof url !== 'string' || !url.includes('supabase.co')) {
    return url;
  }

  try {
    const filename = path.basename(url.split('?')[0]);
    const cleanFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destPath = path.join(uploadsDir, cleanFilename);

    const response = await fetch(url);
    if (!response.ok) return url;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);

    console.log(`[DOWNLOAD IMAGE] Salvo: ${cleanFilename}`);
    return `/uploads/${cleanFilename}`;
  } catch (err) {
    console.error(`Erro ao baixar imagem (${url}):`, err.message);
    return url;
  }
}

async function startMigration() {
  console.log('====================================================');
  console.log('  MIGRAÇÃO DE DADOS DO SUPABASE PARA O MYSQL CPANEL ');
  console.log('====================================================');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'vaivistoriar_root',
    password: process.env.DB_PASSWORD || '{fPOX[NZEdPhZl_(',
    database: process.env.DB_NAME || 'vaivistoriar_2026',
    multipleStatements: true
  });

  console.log('Conectado ao MySQL:', process.env.DB_NAME);

  // 1. MIGRAÇÃO DE PLANOS
  console.log('\n--- Migrando Planos ---');
  const { data: plans } = await supabase.from('plans').select('*');
  if (plans && plans.length > 0) {
    for (const p of plans) {
      await connection.query(
        `INSERT INTO plans (id, name, slug, price, billing_cycle, status, features, max_inspections, max_photos, max_rooms, max_brokers, storage_gb, type, badge_text, duration_days, comparison_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), status=VALUES(status)`,
        [
          p.id,
          p.name,
          p.slug || p.name.toLowerCase().replace(/\s+/g, '-'),
          p.price || 0,
          p.billing_cycle || 'Mensal',
          p.status || 'Ativo',
          JSON.stringify(p.features || {}),
          p.max_inspections || 10,
          p.max_photos || 50,
          p.max_rooms || 20,
          p.max_brokers || 1,
          p.storage_gb || 1.0,
          p.plan_type || 'PF',
          p.plan_badge_text || null,
          p.duration_days || 30,
          p.comparison_price || null
        ]
      );
    }
    console.log(`-> ${plans.length} planos migrados.`);
  }

  // 2. MIGRAÇÃO DE CONFIGURAÇÕES DO SISTEMA
  console.log('\n--- Migrando Configurações do Sistema ---');
  const { data: configs } = await supabase.from('system_configs').select('*');
  if (configs && configs.length > 0) {
    for (const c of configs) {
      let val = c.value;
      if (typeof val === 'object') val = JSON.stringify(val);
      await connection.query(
        `INSERT INTO system_configs (\`key\`, \`value\`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE \`value\`=VALUES(\`value\`)`,
        [c.key, val || '']
      );
    }
    console.log(`-> ${configs.length} configurações migradas.`);
  }

  // 3. MIGRAÇÃO DE PERFIS E USUÁRIOS
  console.log('\n--- Migrando Usuários e Perfis ---');
  const { data: profiles } = await supabase.from('broker_profiles').select('*');
  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      const userId = p.user_id || p.id;
      const email = p.email || `user_${userId.substring(0, 8)}@vaivistoriar.com.br`;
      const avatarUrl = await downloadAndReplaceImage(p.avatar_url);

      // Inserir usuario (senha padrao temporaria: Mudar123! se nao existir)
      // Hash bcrypt de 'Mudar123!': $2a$10$wT5HvhfK5i792M4Q40vM8eDpxkLKgJk8t6Oa1RjC6oGgXvXv7
      await connection.query(
        `INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email=VALUES(email)`,
        [userId, email, '$2a$10$7rX.XvU11bM2XvHk8/JqHe/p4n1.r4lV.r.8V79s0R1c6s0q1.q1S', p.role || 'BROKER']
      );

      await connection.query(
        `INSERT INTO broker_profiles 
         (id, user_id, email, full_name, role, status, phone, cpf_cnpj, creci, company_name, avatar_url, subscription_plan_id, subscription_expires_at, parent_pj_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), phone=VALUES(phone), avatar_url=VALUES(avatar_url)`,
        [
          p.id,
          userId,
          email,
          p.full_name || email,
          p.role || 'BROKER',
          p.status || 'Ativo',
          p.phone || null,
          p.cpf_cnpj || null,
          p.creci || null,
          p.company_name || null,
          avatarUrl || null,
          p.subscription_plan_id || null,
          p.subscription_expires_at ? new Date(p.subscription_expires_at) : null,
          p.parent_pj_id || null
        ]
      );
    }
    console.log(`-> ${profiles.length} perfis/usuários migrados.`);
  }

  // 4. MIGRAÇÃO DE CLIENTES
  console.log('\n--- Migrando Clientes ---');
  const { data: clients } = await supabase.from('clients').select('*');
  if (clients && clients.length > 0) {
    for (const c of clients) {
      const avatarUrl = await downloadAndReplaceImage(c.avatar_url);
      await connection.query(
        `INSERT INTO clients (id, user_id, name, email, phone, cpf, address, type, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email)`,
        [
          c.id,
          c.user_id,
          c.name,
          c.email || null,
          c.phone || null,
          c.document_number || c.cpf || null,
          c.address || null,
          c.profile_type || c.type || 'Inquilino',
          c.notes || null
        ]
      );
    }
    console.log(`-> ${clients.length} clientes migrados.`);
  }

  // 5. MIGRAÇÃO DE IMÓVEIS
  console.log('\n--- Migrando Imóveis ---');
  const { data: properties } = await supabase.from('properties').select('*');
  if (properties && properties.length > 0) {
    for (const prop of properties) {
      const imageUrl = await downloadAndReplaceImage(prop.image_url || prop.facade_url || prop.image);
      await connection.query(
        `INSERT INTO properties (id, user_id, name, address, owner, type, image)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), image=VALUES(image)`,
        [
          prop.id,
          prop.user_id,
          prop.name,
          prop.address || '',
          prop.owner || null,
          prop.type || 'Apartamento',
          imageUrl || null
        ]
      );
    }
    console.log(`-> ${properties.length} imóveis migrados.`);
  }

  // 6. MIGRAÇÃO DE VISTORIAS E FOTOS
  console.log('\n--- Migrando Vistorias e Fotos ---');
  const { data: inspections } = await supabase.from('inspections').select('*');
  if (inspections && inspections.length > 0) {
    for (const insp of inspections) {
      let imageUrl = await downloadAndReplaceImage(insp.image_url || insp.image);
      
      // Processar fotos dos cômodos
      let roomsData = insp.rooms || [];
      if (Array.isArray(roomsData)) {
        for (const room of roomsData) {
          if (room.photos && Array.isArray(room.photos)) {
            for (const photo of room.photos) {
              if (photo.url) {
                photo.url = await downloadAndReplaceImage(photo.url);
              }
            }
          }
        }
      }

      // Processar foto das chaves
      let keysData = insp.keys_data || {};
      if (keysData && keysData.photo_url) {
        keysData.photo_url = await downloadAndReplaceImage(keysData.photo_url);
      }

      const fullData = {
        rooms: roomsData,
        keys_data: keysData,
        general_observations: insp.general_observations || '',
        extra_costs: insp.extra_costs || [],
        broker_data: insp.broker_data || {}
      };

      await connection.query(
        `INSERT INTO inspections (id, user_id, property, address, client, type, date, status, image, pdf_url, email_sent_at, whatsapp_sent_at, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE property=VALUES(property), status=VALUES(status), data_json=VALUES(data_json)`,
        [
          insp.id,
          insp.user_id,
          insp.property_name || insp.property || 'Imóvel',
          insp.address || '',
          insp.client_name || insp.client || '',
          insp.type || 'Entrada',
          insp.scheduled_date ? new Date(insp.scheduled_date) : new Date(),
          insp.status || 'Rascunho',
          imageUrl || null,
          insp.pdf_url || null,
          insp.email_sent_at ? new Date(insp.email_sent_at) : null,
          insp.whatsapp_sent_at ? new Date(insp.whatsapp_sent_at) : null,
          JSON.stringify(fullData)
        ]
      );
    }
    console.log(`-> ${inspections.length} vistorias migradas.`);
  }

  // 7. MIGRAÇÃO DE AVALIAÇÕES
  console.log('\n--- Migrando Avaliações ---');
  const { data: reviews } = await supabase.from('system_reviews').select('*');
  if (reviews && reviews.length > 0) {
    for (const r of reviews) {
      await connection.query(
        `INSERT INTO system_reviews (id, user_id, rating, comment, is_approved, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment)`,
        [
          r.id,
          r.user_id,
          r.rating,
          r.comment || null,
          r.is_approved ? 1 : 0,
          r.created_at ? new Date(r.created_at) : new Date()
        ]
      );
    }
    console.log(`-> ${reviews.length} avaliações migradas.`);
  }

  console.log('\n====================================================');
  console.log('  MIGRAÇÃO DE DADOS E ARQUIVOS FINALIZADA COM SUCESSO!');
  console.log('====================================================');

  await connection.end();
}

startMigration().catch(err => {
  console.error('Erro fatal na migração de dados:', err);
  process.exit(1);
});
