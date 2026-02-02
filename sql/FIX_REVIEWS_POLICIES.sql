-- Ajustar políticas de RLS para a tabela system_reviews
-- Execute este script no Supabase SQL Editor

-- 1. Permitir que QUALQUER UM (mesmo não logado) veja reviews APROVADOS
-- Isso é necessário para a Landing Page funcionar
CREATE POLICY "Anyone can view approved reviews" 
ON system_reviews 
FOR SELECT 
USING (is_approved = true);

-- 2. Permitir que ADMINS vejam e gerenciem todos os reviews
-- Nota: Isso assume que você tem uma lógica de admin. Se não, adicione uma política mais ampla para testes.
CREATE POLICY "Admins can manage all reviews" 
ON system_reviews 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 3. Remover políticas antigas se necessário (opcional, mas recomendado se houver conflito)
-- DROP POLICY IF EXISTS "Users can view their own reviews" ON system_reviews;
-- DROP POLICY IF EXISTS "Users can insert their own reviews" ON system_reviews;

-- 4. Recriar a política básica de inserção para segurança
CREATE POLICY "Users can insert their own reviews" 
ON system_reviews
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
