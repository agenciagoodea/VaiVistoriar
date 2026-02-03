-- SQL para CORRIGIR o conflito de cadastro de convidados
-- Execute isso no Supabase Dashboard -> SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_profile_id uuid;
BEGIN
  -- Verificar se já existe perfil com este email (convidado)
  SELECT id INTO existing_profile_id FROM public.broker_profiles WHERE email = new.email LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Atualizar o perfil existente em vez de falhar
    UPDATE public.broker_profiles
    SET 
      user_id = new.id,
      full_name = COALESCE(new.raw_user_meta_data->>'full_name', full_name),
      cpf_cnpj = COALESCE(new.raw_user_meta_data->>'cpf_cnpj', cpf_cnpj),
      role = COALESCE(new.raw_user_meta_data->>'role', role),
      status = 'Ativo', -- Ativar o usuário
      updated_at = now()
    WHERE id = existing_profile_id;
  ELSE
    -- Inserir novo perfil normalmente
    INSERT INTO public.broker_profiles (user_id, email, full_name, role, cpf_cnpj, status, company_name)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      COALESCE(new.raw_user_meta_data->>'role', 'BROKER'),
      new.raw_user_meta_data->>'cpf_cnpj',
      'Ativo',
      new.raw_user_meta_data->>'company_name'
    );
  END IF;

  RETURN new;
END;
$function$;
