import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import { authenticateToken } from '../middleware/auth.js';


const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoint para upload de arquivos (base64 ou multipart) no cPanel
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { file, fileName, fileType, bucket } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const uploadsDir = path.join(__dirname, '../../public_html/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(fileName || 'file.png') || '.png';
    const uniqueName = `${bucket || 'upload'}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const targetPath = path.join(uploadsDir, uniqueName);

    // Se for data URL (base64)
    if (file.startsWith('data:')) {
      const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(targetPath, buffer);
    } else {
      // Buffer direto
      const buffer = Buffer.from(file, 'base64');
      fs.writeFileSync(targetPath, buffer);
    }

    const publicUrl = `/uploads/${uniqueName}`;
    res.json({ publicUrl, path: uniqueName });
  } catch (err) {
    console.error('Erro no upload de arquivo:', err);
    res.status(500).json({ error: 'Erro ao salvar arquivo no servidor' });
  }
});

export default router;
