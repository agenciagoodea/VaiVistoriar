
-- COLE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE PARA CORRIGIR AS AVALIAÇÕES

-- Remove a restrição antiga (que aponta para auth.users)
ALTER TABLE system_reviews DROP CONSTRAINT IF EXISTS system_reviews_user_id_fkey;

-- Adiciona a nova restrição apontando para a tabela de perfis (public)
-- Isso permite que o sistema busque Nome e Foto do corretor automaticamente
ALTER TABLE system_reviews 
  ADD CONSTRAINT system_reviews_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.broker_profiles(user_id) 
  ON DELETE CASCADE;

-- Garante que todos possam ler as avaliações
DROP POLICY IF EXISTS "Enable read access for all users" ON system_reviews;
CREATE POLICY "Enable read access for all users" ON system_reviews
  FOR SELECT USING (true);
