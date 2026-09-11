import { Router } from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Criar preferência de pagamento / assinatura no Mercado Pago
router.post('/create-preference', authenticateToken, async (req, res) => {
  const { plan_id } = req.body;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!plan_id) {
    return res.status(400).json({ error: 'ID do plano é obrigatório' });
  }

  try {
    const [plans] = await pool.query('SELECT * FROM plans WHERE id = ?', [plan_id]);
    if (plans.length === 0) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }
    const plan = plans[0];

    if (!accessToken) {
      return res.status(500).json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado no servidor' });
    }

    const preferenceData = {
      items: [
        {
          id: plan.id,
          title: `Plano ${plan.name} - VaiVistoriar`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(plan.price)
        }
      ],
      payer: {
        email: req.user.email,
        name: req.user.profile?.full_name || req.user.email
      },
      external_reference: JSON.stringify({ userId: req.user.id, planId: plan.id }),
      back_urls: {
        success: `${req.headers.origin || 'http://localhost:3000'}/my-plan?status=success`,
        failure: `${req.headers.origin || 'http://localhost:3000'}/my-plan?status=failure`,
        pending: `${req.headers.origin || 'http://localhost:3000'}/my-plan?status=pending`
      },
      auto_return: 'approved'
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(preferenceData)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Erro no Mercado Pago');
    }

    res.json({ init_point: data.init_point, preferenceId: data.id });
  } catch (err) {
    console.error('Erro Mercado Pago:', err);
    res.status(500).json({ error: 'Erro ao gerar pagamento', details: err.message });
  }
});

// Webhook do Mercado Pago para confirmação automática de pagamento
router.post('/webhook', async (req, res) => {
  const { type, data } = req.body;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (type === 'payment' && data && data.id && accessToken) {
    try {
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const payment = await paymentRes.json();

      if (payment.status === 'approved' && payment.external_reference) {
        const { userId, planId } = JSON.parse(payment.external_reference);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await pool.query(
          `UPDATE broker_profiles 
           SET subscription_plan_id = ?, subscription_expires_at = ?, status = 'Ativo' 
           WHERE user_id = ?`,
          [planId, expiresAt, userId]
        );
        console.log(`Assinatura ativada para usuário ${userId} com plano ${planId}`);
      }
    } catch (err) {
      console.error('Erro ao processar webhook Mercado Pago:', err);
    }
  }

  res.sendStatus(200);
});

export default router;
