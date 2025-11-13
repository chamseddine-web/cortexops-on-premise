/*
  # Secure Function Search Paths

  1. Security Issue
    - Functions with mutable search_path are vulnerable to search_path attacks
    - Attackers can potentially hijack function behavior by manipulating search_path
    - Affects: increment_api_usage, log_api_usage, update_professional_profiles_updated_at, auto_block_suspicious_ip

  2. Solution
    - Recreate functions with SET search_path = pg_catalog, public
    - This makes the search_path immutable and predictable
    - Prevents privilege escalation via search_path manipulation

  3. Functions Fixed
    - increment_api_usage (3 overloads)
    - log_api_usage (2 overloads)
    - update_professional_profiles_updated_at (1 trigger)
    - auto_block_suspicious_ip (2 overloads)
    
  4. Note
    - Using CASCADE to drop dependent triggers, they will be recreated
*/

-- Drop all versions of these functions with CASCADE to handle triggers
DROP FUNCTION IF EXISTS public.increment_api_usage(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_api_usage(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.increment_api_usage(uuid, uuid, text) CASCADE;

DROP FUNCTION IF EXISTS public.log_api_usage(uuid, uuid, text, text, integer, integer, inet) CASCADE;
DROP FUNCTION IF EXISTS public.log_api_usage(uuid, uuid, text, text, integer, integer, text, text) CASCADE;

DROP FUNCTION IF EXISTS public.auto_block_suspicious_ip() CASCADE;
DROP FUNCTION IF EXISTS public.auto_block_suspicious_ip(inet, integer) CASCADE;

DROP FUNCTION IF EXISTS public.update_professional_profiles_updated_at() CASCADE;

-- Recreate increment_api_usage (p_user_id version)
CREATE OR REPLACE FUNCTION public.increment_api_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.user_profiles
  SET api_calls_today = api_calls_today + 1
  WHERE id = p_user_id;
END;
$$;

-- Recreate increment_api_usage (p_api_key_id, p_endpoint version)
CREATE OR REPLACE FUNCTION public.increment_api_usage(p_api_key_id uuid, p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.api_usage (api_key_id, endpoint, request_count)
  VALUES (p_api_key_id, p_endpoint, 1)
  ON CONFLICT (api_key_id, endpoint, date)
  DO UPDATE SET 
    request_count = public.api_usage.request_count + 1, 
    updated_at = now();
END;
$$;

-- Recreate increment_api_usage (p_user_id, p_key_id, p_endpoint version)
CREATE OR REPLACE FUNCTION public.increment_api_usage(p_user_id uuid, p_key_id uuid, p_endpoint text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.api_usage (
    user_id, 
    api_key_id, 
    endpoint, 
    method,
    status_code,
    created_at
  )
  VALUES (
    p_user_id, 
    p_key_id, 
    p_endpoint,
    'POST',
    200,
    now()
  );
END;
$$;

-- Recreate log_api_usage (6 parameters version)
CREATE OR REPLACE FUNCTION public.log_api_usage(
  p_client_id uuid, 
  p_api_key_id uuid, 
  p_endpoint text, 
  p_method text, 
  p_status_code integer, 
  p_response_time integer, 
  p_ip_address inet DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE 
  v_log_id uuid;
BEGIN
  INSERT INTO public.api_usage_logs (
    client_id, 
    api_key_id, 
    endpoint, 
    method, 
    status_code, 
    response_time, 
    ip_address
  )
  VALUES (
    p_client_id, 
    p_api_key_id, 
    p_endpoint, 
    p_method, 
    p_status_code, 
    p_response_time, 
    p_ip_address
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Recreate log_api_usage (8 parameters version)
CREATE OR REPLACE FUNCTION public.log_api_usage(
  p_client_id uuid, 
  p_api_key_id uuid, 
  p_endpoint text, 
  p_method text, 
  p_status_code integer, 
  p_response_time_ms integer DEFAULT NULL, 
  p_ip_address text DEFAULT NULL, 
  p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.api_usage_logs (
    client_id,
    api_key_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    ip_address,
    error_message
  ) VALUES (
    p_client_id,
    p_api_key_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms,
    p_ip_address,
    p_error_message
  )
  RETURNING id INTO log_id;

  -- Update last_used_at for the API key
  UPDATE public.api_keys 
  SET last_used_at = now(), updated_at = now()
  WHERE id = p_api_key_id;

  RETURN log_id;
END;
$$;

-- Recreate auto_block_suspicious_ip (trigger version)
CREATE OR REPLACE FUNCTION public.auto_block_suspicious_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE 
  v_failed_count integer;
BEGIN
  IF NEW.status_code >= 400 AND NEW.ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_failed_count 
    FROM public.api_usage_logs
    WHERE ip_address = NEW.ip_address 
      AND status_code >= 400 
      AND created_at > now() - interval '5 minutes';
      
    IF v_failed_count > 20 THEN
      INSERT INTO public.blocked_ips (ip_address, reason, blocked_until)
      VALUES (
        NEW.ip_address, 
        'Auto-blocked: excessive failed requests', 
        now() + interval '1 hour'
      )
      ON CONFLICT (ip_address) 
      DO UPDATE SET 
        blocked_until = now() + interval '1 hour', 
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger for security_events
CREATE TRIGGER trigger_auto_block_suspicious_ip
  AFTER INSERT ON public.security_events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_block_suspicious_ip();

-- Recreate auto_block_suspicious_ip (function version)
CREATE OR REPLACE FUNCTION public.auto_block_suspicious_ip(p_ip inet, p_threshold integer DEFAULT 10)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_suspicious_count integer;
  v_already_blocked boolean;
BEGIN
  -- Vérifier si déjà bloqué
  SELECT EXISTS(
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = p_ip
      AND (permanent = true OR expires_at > now())
  ) INTO v_already_blocked;

  IF v_already_blocked THEN
    RETURN false;
  END IF;

  -- Compter les événements suspects des dernières 24h
  SELECT COUNT(*)
  INTO v_suspicious_count
  FROM public.security_events
  WHERE ip_address = p_ip
    AND suspicious = true
    AND timestamp > now() - interval '24 hours';

  -- Bloquer si seuil dépassé
  IF v_suspicious_count >= p_threshold THEN
    INSERT INTO public.blocked_ips (ip_address, reason, expires_at, permanent)
    VALUES (
      p_ip,
      format('Auto-blocked: %s suspicious events in 24h', v_suspicious_count),
      now() + interval '7 days',
      false
    );
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Recreate update_professional_profiles_updated_at
CREATE OR REPLACE FUNCTION public.update_professional_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger for professional_profiles
CREATE TRIGGER trigger_update_professional_profiles_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_professional_profiles_updated_at();