import { Router } from 'express';
import pool from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import crypto from 'node:crypto';


const router = Router();

// Obter todos os planos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM plans ORDER BY price ASC');
    const plans = rows.map(plan => ({
      ...plan,
      billingCycle: plan.billing_cycle,
      maxInspections: plan.max_inspections,
      maxPhotos: plan.max_photos,
      maxRooms: plan.max_rooms,
      maxBrokers: plan.max_brokers,
      storageGb: parseFloat(plan.storage_gb),
      durationDays: plan.duration_days,
      badgeText: plan.badge_text,
      comparisonPrice: plan.comparison_price ? parseFloat(plan.comparison_price) : null,
      price: parseFloat(plan.price),
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || {})
    }));
    res.json(plans);
  } catch (err) {
    console.error('Erro ao buscar planos:', err);
    res.status(500).json({ error: 'Erro ao buscar planos' });
  }
});

// Criar novo plano (Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name, slug, price, billing_cycle, status, max_inspections, max_photos, max_rooms, max_brokers, storage_gb, type, badge_text, duration_days, comparison_price, features } = req.body;
  const id = crypto.randomUUID();

  try {
    await pool.query(
      `INSERT INTO plans 
       (id, name, slug, price, billing_cycle, status, max_inspections, max_photos, max_rooms, max_brokers, storage_gb, type, badge_text, duration_days, comparison_price, features)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, slug || name.toLowerCase().replace(/\s+/g, '-'), price || 0, billing_cycle || 'Mensal', status || 'Ativo', max_inspections || 10, max_photos || 50, max_rooms || 20, max_brokers || 1, storage_gb || 1.0, type || 'PF', badge_text || null, duration_days || 30, comparison_price || null, JSON.stringify(features || {})]
    );

    const [newPlan] = await pool.query('SELECT * FROM plans WHERE id = ?', [id]);
    res.status(201).json(newPlan[0]);
  } catch (err) {
    console.error('Erro ao criar plano:', err);
    res.status(500).json({ error: 'Erro ao criar plano' });
  }
});

// Atualizar plano (Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, slug, price, billing_cycle, status, max_inspections, max_photos, max_rooms, max_brokers, storage_gb, type, badge_text, duration_days, comparison_price, features } = req.body;

  try {
    await pool.query(
      `UPDATE plans SET
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        price = COALESCE(?, price),
        billing_cycle = COALESCE(?, billing_cycle),
        status = COALESCE(?, status),
        max_inspections = COALESCE(?, max_inspections),
        max_photos = COALESCE(?, max_photos),
        max_rooms = COALESCE(?, max_rooms),
        max_brokers = COALESCE(?, max_brokers),
        storage_gb = COALESCE(?, storage_gb),
        type = COALESCE(?, type),
        badge_text = COALESCE(?, badge_text),
        duration_days = COALESCE(?, duration_days),
        comparison_price = COALESCE(?, comparison_price),
        features = COALESCE(?, features)
       WHERE id = ?`,
      [name, slug, price, billing_cycle, status, max_inspections, max_photos, max_rooms, max_brokers, storage_gb, type, badge_text, duration_days, comparison_price, features ? JSON.stringify(features) : null, id]
    );

    const [updatedPlan] = await pool.query('SELECT * FROM plans WHERE id = ?', [id]);
    res.json(updatedPlan[0]);
  } catch (err) {
    console.error('Erro ao atualizar plano:', err);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

// Excluir plano (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM plans WHERE id = ?', [id]);
    res.json({ message: 'Plano excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir plano:', err);
    res.status(500).json({ error: 'Erro ao excluir plano' });
  }
});

export default router;
