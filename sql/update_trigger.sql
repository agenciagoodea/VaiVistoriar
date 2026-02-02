
-- Função para lidar com a ativação automática de novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_trial_insert()
RETURNS TRIGGER AS $$
DECLARE
    default_plan_id UUID;
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

    -- Definir uma data de expiração longa (10 anos) para o plano inicial
    IF NEW.subscription_expires_at IS NULL THEN
        NEW.subscription_expires_at := now() + interval '10 years';
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
