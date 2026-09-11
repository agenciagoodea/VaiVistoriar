import jwt from 'jsonwebtoken';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_vaivistoriar_2026';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar perfil atual do usuário
    const [profiles] = await pool.query(
      'SELECT bp.*, u.email FROM broker_profiles bp JOIN users u ON bp.user_id = u.id WHERE u.id = ?',
      [decoded.userId]
    );

    if (profiles.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: profiles[0].role,
      profile: profiles[0]
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Requer privilégios de Administrador.' });
  }
  next();
};
