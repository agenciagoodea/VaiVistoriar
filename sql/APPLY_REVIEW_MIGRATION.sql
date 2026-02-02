-- Aplicar migration: add_review_approval
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar coluna is_approved
ALTER TABLE system_reviews 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- 2. Atualizar reviews existentes para aprovados (compatibilidade)
UPDATE system_reviews 
SET is_approved = true 
WHERE is_approved IS NULL;

-- 3. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_system_reviews_approved 
ON system_reviews(is_approved);

-- 4. Adicionar comentário
COMMENT ON COLUMN system_reviews.is_approved IS 'Indicates if review has been approved for public display';

-- 5. Verificar resultado
SELECT 
    COUNT(*) as total_reviews,
    COUNT(*) FILTER (WHERE is_approved = true) as approved_reviews,
    COUNT(*) FILTER (WHERE is_approved = false) as pending_reviews
FROM system_reviews;
