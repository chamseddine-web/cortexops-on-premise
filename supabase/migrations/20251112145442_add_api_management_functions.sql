/*
  # Fonctions de gestion API

  1. Fonctions
    - increment_api_usage : Incrémenter le compteur d'appels API
    - check_api_quota : Vérifier les quotas disponibles
    - reset_daily_quotas : Réinitialiser les quotas quotidiens

  2. Sécurité
    - SECURITY DEFINER pour accès système
*/

-- Fonction pour incrémenter l'utilisation API
CREATE OR REPLACE FUNCTION increment_api_usage(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET api_calls_today = api_calls_today + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier les quotas
CREATE OR REPLACE FUNCTION check_api_quota(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_profile RECORD;
  v_plan RECORD;
BEGIN
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_profile.subscription_plan;
  
  IF v_plan IS NULL THEN
    RETURN false;
  END IF;
  
  -- Réinitialiser si nécessaire
  IF v_profile.last_reset_date < CURRENT_DATE THEN
    UPDATE user_profiles
    SET 
      api_calls_today = 0, 
      last_reset_date = CURRENT_DATE
    WHERE id = p_user_id;
    RETURN true;
  END IF;
  
  -- Vérifier les quotas (NULL = illimité)
  IF v_plan.api_calls_per_day IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_profile.api_calls_today < v_plan.api_calls_per_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour réinitialiser les quotas quotidiens (à exécuter via cron)
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET 
    playbooks_generated_this_month = CASE 
      WHEN DATE_TRUNC('month', last_reset_date) < DATE_TRUNC('month', CURRENT_DATE) 
      THEN 0 
      ELSE playbooks_generated_this_month 
    END,
    api_calls_today = 0,
    last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les stats d'utilisation
CREATE OR REPLACE FUNCTION get_user_usage_stats(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_profile RECORD;
  v_plan RECORD;
  v_result jsonb;
BEGIN
  SELECT * INTO v_profile FROM user_profiles WHERE id = p_user_id;
  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_profile.subscription_plan;
  
  v_result := jsonb_build_object(
    'playbooks_generated_today', v_profile.playbooks_generated_this_month,
    'api_calls_today', v_profile.api_calls_today,
    'playbook_limit', v_plan.playbooks_per_day,
    'api_limit', v_plan.api_calls_per_day,
    'plan', v_plan.display_name,
    'last_reset', v_profile.last_reset_date
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
