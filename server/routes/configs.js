import { Router } from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Obter todas as configurações
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT `key`, `value` FROM system_configs');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Upsert (Inserir ou Atualizar) chave de configuração
router.post('/upsert', authenticateToken, requireAdmin, async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];

  try {
    for (const item of items) {
      if (!item.key) continue;
      const val = typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value ?? '');
      await pool.query(
        'INSERT INTO system_configs (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        [item.key, val]
      );
    }
    res.json({ message: 'Configurações salvas com sucesso' });
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

export default router;
