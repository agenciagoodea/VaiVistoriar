import { Router } from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'node:crypto';


const router = Router();

// Listar vistorias
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM inspections WHERE user_id = ?';
    let params = [req.user.id];

    if (req.user.role === 'PJ') {
      query = `SELECT i.* FROM inspections i 
               JOIN broker_profiles bp ON i.user_id = bp.user_id 
               WHERE i.user_id = ? OR bp.parent_pj_id = ?`;
      params = [req.user.id, req.user.id];
    }

    const [rows] = await pool.query(query + ' ORDER BY created_at DESC', params);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar vistorias:', err);
    res.status(500).json({ error: 'Erro ao buscar vistorias' });
  }
});

// Obter vistoria por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM inspections WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Vistoria não encontrada' });
    }
    const inspection = rows[0];
    if (inspection.data_json) {
      try {
        inspection.data = JSON.parse(inspection.data_json);
      } catch (e) {}
    }
    res.json(inspection);
  } catch (err) {
    console.error('Erro ao buscar vistoria:', err);
    res.status(500).json({ error: 'Erro ao buscar vistoria' });
  }
});

// Criar vistoria
router.post('/', authenticateToken, async (req, res) => {
  const { property, address, client, type, date, status, image, pdf_url, data } = req.body;
  const id = crypto.randomUUID();

  try {
    await pool.query(
      `INSERT INTO inspections 
       (id, user_id, property, address, client, type, date, status, image, pdf_url, data_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, property || 'Imóvel', address || '', client || '', type || 'Entrada', date || new Date(), status || 'Rascunho', image || null, pdf_url || null, JSON.stringify(data || {})]
    );

    const [newInsp] = await pool.query('SELECT * FROM inspections WHERE id = ?', [id]);
    res.status(201).json(newInsp[0]);
  } catch (err) {
    console.error('Erro ao criar vistoria:', err);
    res.status(500).json({ error: 'Erro ao criar vistoria' });
  }
});

// Atualizar vistoria
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { property, address, client, type, date, status, image, pdf_url, email_sent_at, whatsapp_sent_at, data } = req.body;

  try {
    await pool.query(
      `UPDATE inspections SET
        property = COALESCE(?, property),
        address = COALESCE(?, address),
        client = COALESCE(?, client),
        type = COALESCE(?, type),
        date = COALESCE(?, date),
        status = COALESCE(?, status),
        image = COALESCE(?, image),
        pdf_url = COALESCE(?, pdf_url),
        email_sent_at = COALESCE(?, email_sent_at),
        whatsapp_sent_at = COALESCE(?, whatsapp_sent_at),
        data_json = COALESCE(?, data_json)
       WHERE id = ? AND user_id = ?`,
      [property, address, client, type, date, status, image, pdf_url, email_sent_at, whatsapp_sent_at, data ? JSON.stringify(data) : null, id, req.user.id]
    );

    const [updated] = await pool.query('SELECT * FROM inspections WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Erro ao atualizar vistoria:', err);
    res.status(500).json({ error: 'Erro ao atualizar vistoria' });
  }
});

// Excluir vistoria
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM inspections WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ message: 'Vistoria excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir vistoria:', err);
    res.status(500).json({ error: 'Erro ao excluir vistoria' });
  }
});

export default router;
