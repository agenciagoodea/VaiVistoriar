import { Router } from 'express';
import nodemailer from 'nodemailer';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.vaivistoriar.com.br',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
};

// Enviar e-mail genérico (Relatórios de Vistoria, Notificações)
router.post('/send', authenticateToken, async (req, res) => {
  const { to, subject, html, text, attachments } = req.body;

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Parâmetros de e-mail incompletos (to, subject, html/text)' });
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'VaiVistoriar'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      attachments: attachments || []
    });

    res.json({ message: 'E-mail enviado com sucesso', messageId: info.messageId });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    res.status(500).json({ error: 'Falha no envio de e-mail via SMTP', details: err.message });
  }
});

// Enviar convite de usuário
router.post('/send-invite', authenticateToken, async (req, res) => {
  const { email, inviteUrl, role = 'BROKER' } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório para envio do convite' });
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Você foi convidado para o VaiVistoriar!</h2>
      <p>Você recebeu um convite para acessar a plataforma VaiVistoriar na função de <strong>${role}</strong>.</p>
      <p>Clique no botão abaixo para concluir seu cadastro e criar sua senha:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl || '#'}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Aceitar Convite</a>
      </p>
      <p>Se o botão não funcionar, copie e cole o link a seguir no seu navegador:</p>
      <p><a href="${inviteUrl || '#'}">${inviteUrl || '#'}</a></p>
    </div>
  `;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'VaiVistoriar'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Convite para a plataforma VaiVistoriar',
      html: htmlContent
    });

    res.json({ message: 'Convite enviado com sucesso' });
  } catch (err) {
    console.error('Erro ao enviar convite:', err);
    res.status(500).json({ error: 'Erro ao enviar convite via SMTP', details: err.message });
  }
});

export default router;
