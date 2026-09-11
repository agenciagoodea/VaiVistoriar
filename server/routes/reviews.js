import { Router } from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import crypto from 'node:crypto';


const router = Router();

// Obter avaliações (públicas ou administrativas)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, bp.full_name, bp.avatar_url 
       FROM system_reviews r 
       LEFT JOIN broker_profiles bp ON r.user_id = bp.user_id 
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar avaliações:', err);
    res.status(500).json({ error: 'Erro ao buscar avaliações' });
  }
});

// Enviar nova avaliação
router.post('/', authenticateToken, async (req, res) => {
  const { rating, comment } = req.body;
  const id = crypto.randomUUID();

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Nota inválida (deve ser de 1 a 5)' });
  }

  try {
    await pool.query(
      'INSERT INTO system_reviews (id, user_id, rating, comment, is_approved) VALUES (?, ?, ?, ?, 1)',
      [id, req.user.id, rating, comment || null]
    );

    const [newReview] = await pool.query('SELECT * FROM system_reviews WHERE id = ?', [id]);
    res.status(201).json(newReview[0]);
  } catch (err) {
    console.error('Erro ao salvar avaliação:', err);
    res.status(500).json({ error: 'Erro ao salvar avaliação' });
  }
});

// Aprovar/Rejeitar avaliação (Admin)
router.put('/:id/approval', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_approved } = req.body;

  try {
    await pool.query('UPDATE system_reviews SET is_approved = ? WHERE id = ?', [is_approved ? 1 : 0, id]);
    res.json({ message: 'Status da avaliação atualizado' });
  } catch (err) {
    console.error('Erro ao atualizar avaliação:', err);
    res.status(500).json({ error: 'Erro ao atualizar avaliação' });
  }
});

export default router;
