import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import crypto from 'node:crypto';


const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Métricas gerais do Admin Dashboard
router.get('/metrics', async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ newUsers30Days }]] = await pool.query('SELECT COUNT(*) as newUsers30Days FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    const [[{ totalInspections }]] = await pool.query('SELECT COUNT(*) as totalInspections FROM inspections');
    const [[{ activeSubscriptions }]] = await pool.query("SELECT COUNT(*) as activeSubscriptions FROM broker_profiles WHERE status = 'Ativo'");
    
    // Cálculo estimado de MRR (Receita Mensal Recorrente)
    const [subscribers] = await pool.query(
      `SELECT p.price, p.billing_cycle 
       FROM broker_profiles bp 
       JOIN plans p ON bp.subscription_plan_id = p.id 
       WHERE bp.status = 'Ativo'`
    );

    let mrr = 0;
    subscribers.forEach(sub => {
      const price = parseFloat(sub.price || 0);
      mrr += sub.billing_cycle === 'Anual' ? price / 12 : price;
    });

    res.json({
      totalUsers,
      newUsers30Days,
      totalInspections,
      activeSubscriptions,
      mrr: parseFloat(mrr.toFixed(2))
    });
  } catch (err) {
    console.error('Erro ao calcular métricas:', err);
    res.status(500).json({ error: 'Erro ao calcular métricas' });
  }
});

// Listar todos os usuários/perfis
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT bp.*, u.email as user_email, p.name as plan_name 
       FROM broker_profiles bp 
       JOIN users u ON bp.user_id = u.id 
       LEFT JOIN plans p ON bp.subscription_plan_id = p.id 
       ORDER BY bp.created_at DESC`
    );
    res.json(users);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Criar novo usuário pelo admin
router.post('/users', async (req, res) => {
  const { email, password, full_name, role = 'BROKER', subscription_plan_id } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const planId = subscription_plan_id || (role === 'PJ' ? '5c09eeb7-100f-4f84-aaa7-9bcc5df05306' : 'fd4c420f-09b2-40a7-b43f-972e21378368');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.query('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', [userId, email, passwordHash, role]);
    await pool.query(
      `INSERT INTO broker_profiles (id, user_id, email, full_name, role, status, subscription_plan_id, subscription_expires_at)
       VALUES (?, ?, ?, ?, ?, 'Ativo', ?, ?)`,
      [profileId, userId, email, full_name || email, role, planId, expiresAt]
    );

    const [newUser] = await pool.query('SELECT * FROM broker_profiles WHERE id = ?', [profileId]);
    res.status(201).json(newUser[0]);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Atualizar status do usuário (Ativo / Inativo / Bloqueado)
router.put('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await pool.query('UPDATE broker_profiles SET status = ? WHERE user_id = ? OR id = ?', [status, id, id]);
    res.json({ message: 'Status do usuário atualizado' });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Excluir usuário pelo admin
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM users WHERE id = ? OR id IN (SELECT user_id FROM broker_profiles WHERE id = ?)', [id, id]);
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

export default router;
