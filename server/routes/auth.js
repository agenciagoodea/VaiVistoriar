import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';


const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_vaivistoriar_2026';

// Register (Cadastro)
router.post('/register', async (req, res) => {
  const { email, password, full_name, role = 'BROKER', phone, cpf_cnpj, company_name } = req.body;

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

    // Determinar plano padrão
    const defaultPlanId = role === 'PJ' ? '5c09eeb7-100f-4f84-aaa7-9bcc5df05306' : 'fd4c420f-09b2-40a7-b43f-972e21378368';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.query(
      'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [userId, email, passwordHash, role]
    );

    await pool.query(
      `INSERT INTO broker_profiles 
       (id, user_id, email, full_name, role, status, phone, cpf_cnpj, company_name, subscription_plan_id, subscription_expires_at) 
       VALUES (?, ?, ?, ?, ?, 'Ativo', ?, ?, ?, ?, ?)`,
      [profileId, userId, email, full_name || email, role, phone || null, cpf_cnpj || null, company_name || null, defaultPlanId, expiresAt]
    );

    const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });

    const [profiles] = await pool.query('SELECT * FROM broker_profiles WHERE user_id = ?', [userId]);

    res.json({
      token,
      user: { id: userId, email, role },
      profile: profiles[0]
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// Lookup Email by CPF/CNPJ
router.get('/lookup-email-by-cpf', async (req, res) => {
  const rawCpf = req.query.cpf_cnpj || '';
  const cleanDoc = rawCpf.replace(/\D/g, '');
  if (!cleanDoc) {
    return res.json({ email: null });
  }

  try {
    const [rows] = await pool.query(
      "SELECT email FROM broker_profiles WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '') = ? LIMIT 1",
      [cleanDoc]
    );
    if (rows.length > 0) {
      return res.json({ email: rows[0].email });
    }
    return res.json({ email: null });
  } catch (err) {
    console.error('Erro no lookup-email-by-cpf:', err);
    res.json({ email: null });
  }
});

// Login (Autenticação)
router.post('/login', async (req, res) => {
  const { email: identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'CPF, CNPJ ou E-mail e senha são obrigatórios' });
  }

  try {
    let [users] = await pool.query('SELECT * FROM users WHERE email = ?', [identifier]);

    if (users.length === 0) {
      const cleanDoc = identifier.replace(/\D/g, '');
      if (cleanDoc) {
        const [profiles] = await pool.query(
          "SELECT user_id, email FROM broker_profiles WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '') = ? LIMIT 1",
          [cleanDoc]
        );
        if (profiles.length > 0) {
          [users] = await pool.query('SELECT * FROM users WHERE id = ? OR email = ?', [profiles[0].user_id, profiles[0].email]);
        }
      }
    }

    if (users.length === 0) {
      return res.status(401).json({ error: 'CPF, CNPJ, E-mail ou senha incorretos' });
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'CPF, CNPJ, E-mail ou senha incorretos' });
    }

    const [profiles] = await pool.query('SELECT * FROM broker_profiles WHERE user_id = ?', [user.id]);
    const profile = profiles[0] || null;

    if (profile && profile.status === 'Bloqueado') {
      return res.status(403).json({ error: 'Sua conta está suspensa ou bloqueada. Entre em contato com o suporte.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
      profile
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

// Obter usuário logado (Sessão)
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    user: { id: req.user.id, email: req.user.email, role: req.user.role },
    profile: req.user.profile
  });
});

// Atualizar perfil
router.put('/profile', authenticateToken, async (req, res) => {
  const { full_name, phone, cpf_cnpj, creci, company_name, avatar_url, logo_url } = req.body;

  try {
    await pool.query(
      `UPDATE broker_profiles SET 
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        cpf_cnpj = COALESCE(?, cpf_cnpj),
        creci = COALESCE(?, creci),
        company_name = COALESCE(?, company_name),
        avatar_url = COALESCE(?, avatar_url),
        logo_url = COALESCE(?, logo_url)
       WHERE user_id = ?`,
      [full_name, phone, cpf_cnpj, creci, company_name, avatar_url, logo_url, req.user.id]
    );

    const [profiles] = await pool.query('SELECT * FROM broker_profiles WHERE user_id = ?', [req.user.id]);
    res.json({ profile: profiles[0] });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

export default router;
