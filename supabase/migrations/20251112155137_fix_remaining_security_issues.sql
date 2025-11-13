/*
  # Fix Remaining Security Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes on api_usage
  - Add index for api_usage_api_key_id_fkey
  - Add index for api_usage_user_id_fkey (if user_id has FK constraint)

  ### 2. Fix Function Search Paths
  - Recreate functions with proper immutable search_path
  - Applies to: increment_api_usage, auto_block_suspicious_ip

  ## Notes on "Unused" Indexes
  - The other indexes flagged as "unused" are intentionally kept
  - They are essential for foreign key constraints and future query performance
  - Removing them would cause significant performance degradation when the system scales
  - These indexes support JOIN operations and referential integrity

  ## Security Notes
  - All changes maintain existing security boundaries
  - Performance improvements for API usage tracking
  - Functions now have secure, immutable search paths
*/

-- =====================================================
-- 1. ADD MISSING INDEXES ON api_usage
-- =====================================================

-- Index for api_key_id foreign key
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON public.api_usage(api_key_id);

-- Index for user_id (if it exists as a column)
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON public.api_usage(user_id, created_at DESC);

-- =====================================================
-- 2. FIX FUNCTION SEARCH PATHS (IMMUTABLE)
-- =====================================================

-- Recreate increment_api_usage with proper security
DROP FUNCTION IF EXISTS public.increment_api_usage(uuid, uuid, text);
CREATE FUNCTION public.increment_api_usage(
  p_user_id uuid,
  p_key_id uuid,
  p_endpoint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Insert or update API usage record
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

-- Recreate auto_block_suspicious_ip with proper security
DROP FUNCTION IF EXISTS public.auto_block_suspicious_ip() CASCADE;
CREATE FUNCTION public.auto_block_suspicious_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_request_count integer;
BEGIN
  -- Count failed auth attempts from this IP in the last hour
  SELECT COUNT(*) INTO v_request_count
  FROM public.security_events
  WHERE ip_address = NEW.ip_address
  AND event_type = 'failed_auth'
  AND created_at > now() - interval '1 hour';

  -- Auto-block if threshold exceeded
  IF v_request_count >= 10 THEN
    INSERT INTO public.blocked_ips (ip_address, reason, blocked_until)
    VALUES (NEW.ip_address, 'Auto-blocked: Too many failed auth attempts', now() + interval '24 hours')
    ON CONFLICT (ip_address) DO UPDATE
    SET blocked_until = now() + interval '24 hours',
        reason = 'Auto-blocked: Too many failed auth attempts';
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'security_events'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_auto_block_suspicious_ip ON public.security_events;
    CREATE TRIGGER trigger_auto_block_suspicious_ip
      AFTER INSERT ON public.security_events
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_block_suspicious_ip();
  END IF;
END $$;

-- =====================================================
-- 3. OPTIMIZE OTHER FUNCTIONS WITH IMMUTABLE SEARCH PATH
-- =====================================================

-- Fix check_api_quota
DROP FUNCTION IF EXISTS public.check_api_quota(uuid);
CREATE FUNCTION public.check_api_quota(p_user_id uuid)
RETURNS TABLE(
  has_quota boolean,
  current_usage bigint,
  quota_limit bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_plan text;
  v_usage bigint;
  v_limit bigint;
BEGIN
  -- Get user's subscription plan
  SELECT subscription_plan INTO v_plan
  FROM public.user_profiles
  WHERE id = p_user_id;

  -- Count API usage for current month
  SELECT COUNT(*) INTO v_usage
  FROM public.api_usage
  WHERE user_id = p_user_id
  AND created_at >= date_trunc('month', now());

  -- Determine quota limit based on plan
  v_limit := CASE v_plan
    WHEN 'free' THEN 100
    WHEN 'pro' THEN 10000
    WHEN 'enterprise' THEN 100000
    ELSE 0
  END;

  RETURN QUERY SELECT 
    v_usage < v_limit as has_quota,
    v_usage as current_usage,
    v_limit as quota_limit;
END;
$$;

-- Fix reset_daily_quotas
DROP FUNCTION IF EXISTS public.reset_daily_quotas();
CREATE FUNCTION public.reset_daily_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Clean up old API usage records (keep 90 days)
  DELETE FROM public.api_usage
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- Fix get_user_usage_stats
DROP FUNCTION IF EXISTS public.get_user_usage_stats(uuid);
CREATE FUNCTION public.get_user_usage_stats(p_user_id uuid)
RETURNS TABLE(
  total_requests bigint,
  today_requests bigint,
  month_requests bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_requests,
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())) as month_requests
  FROM public.api_usage
  WHERE user_id = p_user_id;
END;
$$;