-- Adicionar constraint UNIQUE para cpf_cnpj e email na tabela broker_profiles
-- Execute no Supabase SQL Editor

-- Primeiro, remover duplicatas se existirem (opcional, mas seguro)
-- (Assumindo que o script anterior já limpou, mas só por garantia, não vamos deletar automaticamente aqui para não ser destrutivo sem review. O banco vai dar erro se tiver duplicata, o user terá que corrigir manualmente se falhar).

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'broker_profiles_cpf_cnpj_key') THEN
        ALTER TABLE public.broker_profiles ADD CONSTRAINT broker_profiles_cpf_cnpj_key UNIQUE (cpf_cnpj);
    END IF;
END $$;

-- Email geralmente já é unique se for PK ou tiver constraint, mas vamos garantir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'broker_profiles_email_key') THEN
        ALTER TABLE public.broker_profiles ADD CONSTRAINT broker_profiles_email_key UNIQUE (email);
    END IF;
END $$;
