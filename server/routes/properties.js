import { Router } from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'node:crypto';


const router = Router();

// Listar imóveis do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM properties WHERE user_id = ?';
    let params = [req.user.id];

    // Se o usuário for PJ, buscar também dos corretores vinculados
    if (req.user.role === 'PJ') {
      query = `SELECT p.* FROM properties p 
               JOIN broker_profiles bp ON p.user_id = bp.user_id 
               WHERE p.user_id = ? OR bp.parent_pj_id = ?`;
      params = [req.user.id, req.user.id];
    }

    const [rows] = await pool.query(query + ' ORDER BY created_at DESC', params);
    const properties = rows.map(r => ({
      ...r,
      lastInspection: r.last_inspection
    }));
    res.json(properties);
  } catch (err) {
    console.error('Erro ao buscar imóveis:', err);
    res.status(500).json({ error: 'Erro ao buscar imóveis' });
  }
});

// Criar imóvel
router.post('/', authenticateToken, async (req, res) => {
  const { name, address, owner, type, image } = req.body;
  const id = crypto.randomUUID();

  if (!name || !address) {
    return res.status(400).json({ error: 'Nome e endereço são obrigatórios' });
  }

  try {
    await pool.query(
      `INSERT INTO properties (id, user_id, name, address, owner, type, image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name, address, owner || null, type || 'Apartamento', image || null]
    );

    const [newProp] = await pool.query('SELECT * FROM properties WHERE id = ?', [id]);
    res.status(201).json(newProp[0]);
  } catch (err) {
    console.error('Erro ao criar imóvel:', err);
    res.status(500).json({ error: 'Erro ao cadastrar imóvel' });
  }
});

// Atualizar imóvel
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, address, owner, type, image } = req.body;

  try {
    await pool.query(
      `UPDATE properties SET
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        owner = COALESCE(?, owner),
        type = COALESCE(?, type),
        image = COALESCE(?, image)
       WHERE id = ? AND user_id = ?`,
      [name, address, owner, type, image, id, req.user.id]
    );

    const [updated] = await pool.query('SELECT * FROM properties WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Erro ao atualizar imóvel:', err);
    res.status(500).json({ error: 'Erro ao atualizar imóvel' });
  }
});

// Excluir imóvel
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM properties WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Imóvel excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir imóvel:', err);
    res.status(500).json({ error: 'Erro ao excluir imóvel' });
  }
});

export default router;
