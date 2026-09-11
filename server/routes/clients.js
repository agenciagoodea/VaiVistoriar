import { Router } from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'node:crypto';


const router = Router();

// Listar clientes do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM clients WHERE user_id = ?';
    let params = [req.user.id];

    if (req.user.role === 'PJ') {
      query = `SELECT c.* FROM clients c 
               JOIN broker_profiles bp ON c.user_id = bp.user_id 
               WHERE c.user_id = ? OR bp.parent_pj_id = ?`;
      params = [req.user.id, req.user.id];
    }

    const [rows] = await pool.query(query + ' ORDER BY created_at DESC', params);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar clientes:', err);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// Criar cliente
router.post('/', authenticateToken, async (req, res) => {
  const { name, email, phone, cpf, address, type, notes } = req.body;
  const id = crypto.randomUUID();

  if (!name) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
  }

  try {
    await pool.query(
      `INSERT INTO clients (id, user_id, name, email, phone, cpf, address, type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name, email || null, phone || null, cpf || null, address || null, type || 'Inquilino', notes || null]
    );

    const [newClient] = await pool.query('SELECT * FROM clients WHERE id = ?', [id]);
    res.status(201).json(newClient[0]);
  } catch (err) {
    console.error('Erro ao criar cliente:', err);
    res.status(500).json({ error: 'Erro ao cadastrar cliente' });
  }
});

// Atualizar cliente
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, cpf, address, type, notes } = req.body;

  try {
    await pool.query(
      `UPDATE clients SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        cpf = COALESCE(?, cpf),
        address = COALESCE(?, address),
        type = COALESCE(?, type),
        notes = COALESCE(?, notes)
       WHERE id = ? AND user_id = ?`,
      [name, email, phone, cpf, address, type, notes, id, req.user.id]
    );

    const [updated] = await pool.query('SELECT * FROM clients WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// Excluir cliente
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM clients WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir cliente:', err);
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});

export default router;
