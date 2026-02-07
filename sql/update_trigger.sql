
-- Função para lidar com a ativação automática de novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_trial_insert()
RETURNS TRIGGER AS $$
DECLARE
    default_plan_id UUID;
    duration integer;
BEGIN
    -- Determinar o plano padrão baseado na role (PJ ou BROKER/PF)
    IF NEW.role = 'PJ' THEN
        default_plan_id := '5c09eeb7-100f-4f84-aaa7-9bcc5df05306'; -- IMOBILIÁRIA START
    ELSE
        default_plan_id := 'fd4c420f-09b2-40a7-b43f-972e21378368'; -- CORRETOR START
    END IF;

    -- Atribuir o plano se o usuário não tiver um
    IF NEW.subscription_plan_id IS NULL THEN
        NEW.subscription_plan_id := default_plan_id;
    END IF;

    -- Ativar o status se estiver pendente
    IF NEW.status = 'Pendente' OR NEW.status IS NULL THEN
        NEW.status := 'Ativo';
    END IF;

    -- Buscar a duração definida no plano
    SELECT 
        CASE 
            WHEN billing_cycle = 'Anual' THEN 365 
            ELSE COALESCE(duration_days, 30) 
        END INTO duration
    FROM public.plans 
    WHERE id = NEW.subscription_plan_id;

    -- Definir a data de expiração baseada no plano (ou fallback de 30 dias)
    IF NEW.subscription_expires_at IS NULL THEN
        NEW.subscription_expires_at := now() + (COALESCE(duration, 30) || ' days')::interval;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o trigger existe e está vinculado à tabela broker_profiles
-- (Caso já exista um trigger BEFORE INSERT, ele será reutilizado ou substituído se necessário)
-- Abaixo um exemplo de como criá-lo se não existir:
-- DROP TRIGGER IF EXISTS on_broker_profile_created ON public.broker_profiles;
-- CREATE TRIGGER on_broker_profile_created
--   BEFORE INSERT ON public.broker_profiles
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_trial_insert();

-- ==========================================================
-- SCRIPT DE CORREÇÃO PARA USUÁRIOS EXISTENTES (PLANO GRATUITO)
-- ==========================================================
-- Este script corrige as datas de expiração que ficaram fixadas em 2036.
-- Ele recalcula a expiração baseada na data de criação do usuário + duração do plano.

UPDATE public.broker_profiles bp
SET subscription_expires_at = bp.created_at + (COALESCE(p.duration_days, 30) || ' days')::interval
FROM public.plans p
WHERE bp.subscription_plan_id = p.id
AND (p.name ILIKE '%GRATIS%' OR p.name ILIKE '%FREE%')
AND bp.subscription_expires_at > '2030-01-01'; -- Somente os que estão com a data "infinita" antiga

-- Caso algum usuário fique com data vencida mas você queira dar mais 30 dias a partir de hoje:
-- UPDATE public.broker_profiles bp
-- SET subscription_expires_at = now() + (COALESCE(p.duration_days, 30) || ' days')::interval
-- FROM public.plans p
-- WHERE bp.subscription_plan_id = p.id
-- AND (p.name ILIKE '%GRATIS%' OR p.name ILIKE '%FREE%')
-- AND bp.subscription_expires_at > '2030-01-01';
