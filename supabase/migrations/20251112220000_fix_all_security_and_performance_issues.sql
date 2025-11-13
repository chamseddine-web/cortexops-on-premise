/*
  # Fix All Security and Performance Issues

  ## Changes Made

  1. **Add Missing Indexes on Foreign Keys** (21 indexes)
     - Adds covering indexes for all foreign key columns
     - Improves JOIN performance and query optimization
     - Prevents full table scans on foreign key lookups

  2. **Fix Auth RLS Initialization** (8 policies)
     - Wraps auth functions in SELECT subqueries
     - Prevents re-evaluation for each row
     - Dramatically improves query performance at scale

  3. **Remove Unused Indexes** (10 indexes)
     - Drops indexes that are never used
     - Reduces storage overhead
     - Improves INSERT/UPDATE performance

  4. **Fix Multiple Permissive Policies** (2 tables)
     - Consolidates duplicate policies
     - Simplifies RLS logic
     - Improves policy evaluation performance

  5. **Fix Function Search Path** (5 functions)
     - Sets explicit search_path for all functions
     - Prevents SQL injection via search_path manipulation
     - Follows PostgreSQL security best practices

  6. **Security Notes**
     - Leaked Password Protection must be enabled in Supabase Dashboard
     - Navigate to: Authentication > Settings > Password Protection
     - Enable "Check for breached passwords (HaveIBeenPwned)"
*/

-- ════════════════════════════════════════════════════════════════
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ════════════════════════════════════════════════════════════════

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
ON public.api_keys(user_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id
ON public.audit_logs(organization_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
ON public.audit_logs(user_id);

-- blueprint_playbooks
CREATE INDEX IF NOT EXISTS idx_blueprint_playbooks_blueprint_id
ON public.blueprint_playbooks(blueprint_id);

-- blueprint_roles
CREATE INDEX IF NOT EXISTS idx_blueprint_roles_blueprint_id
ON public.blueprint_roles(blueprint_id);

-- blueprint_structures
CREATE INDEX IF NOT EXISTS idx_blueprint_structures_blueprint_id
ON public.blueprint_structures(blueprint_id);

-- execution_artifacts
CREATE INDEX IF NOT EXISTS idx_execution_artifacts_job_id
ON public.execution_artifacts(job_id);

-- execution_jobs
CREATE INDEX IF NOT EXISTS idx_execution_jobs_environment_id
ON public.execution_jobs(environment_id);

CREATE INDEX IF NOT EXISTS idx_execution_jobs_playbook_template_id
ON public.execution_jobs(playbook_template_id);

CREATE INDEX IF NOT EXISTS idx_execution_jobs_started_by
ON public.execution_jobs(started_by);

-- execution_logs
CREATE INDEX IF NOT EXISTS idx_execution_logs_job_id
ON public.execution_logs(job_id);

-- generated_projects
CREATE INDEX IF NOT EXISTS idx_generated_projects_blueprint_id
ON public.generated_projects(blueprint_id);

CREATE INDEX IF NOT EXISTS idx_generated_projects_user_id
ON public.generated_projects(user_id);

-- organization_members
CREATE INDEX IF NOT EXISTS idx_organization_members_invited_by
ON public.organization_members(invited_by);

-- payment_history
CREATE INDEX IF NOT EXISTS idx_payment_history_plan_id
ON public.payment_history(plan_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id
ON public.payment_history(user_id);

-- playbook_generations
CREATE INDEX IF NOT EXISTS idx_playbook_generations_user_id
ON public.playbook_generations(user_id);

-- playbook_templates
CREATE INDEX IF NOT EXISTS idx_playbook_templates_created_by
ON public.playbook_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_playbook_templates_organization_id
ON public.playbook_templates(organization_id);

-- scan_results
CREATE INDEX IF NOT EXISTS idx_scan_results_environment_id
ON public.scan_results(environment_id);

-- user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id
ON public.user_progress(lesson_id);

-- ════════════════════════════════════════════════════════════════
-- 2. FIX AUTH RLS INITIALIZATION (Wrap auth functions in SELECT)
-- ════════════════════════════════════════════════════════════════

-- Drop existing policies and recreate with optimized auth function calls

-- api_usage_logs
DROP POLICY IF EXISTS "Admins can view all usage logs" ON public.api_usage_logs;
CREATE POLICY "Admins can view all usage logs"
ON public.api_usage_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- api_clients (4 policies)
DROP POLICY IF EXISTS "Admins can view all clients" ON public.api_clients;
CREATE POLICY "Admins can view all clients"
ON public.api_clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can insert clients" ON public.api_clients;
CREATE POLICY "Admins can insert clients"
ON public.api_clients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update clients" ON public.api_clients;
CREATE POLICY "Admins can update clients"
ON public.api_clients
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete clients" ON public.api_clients;
CREATE POLICY "Admins can delete clients"
ON public.api_clients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- api_quotas
DROP POLICY IF EXISTS "Admins can view all quotas" ON public.api_quotas;
DROP POLICY IF EXISTS "Admins can manage quotas" ON public.api_quotas;

-- Consolidated policy for api_quotas (fixes multiple permissive policies issue)
CREATE POLICY "Admins can manage all quotas"
ON public.api_quotas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- api_rate_limits
DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.api_rate_limits;
DROP POLICY IF EXISTS "Everyone can view rate limits" ON public.api_rate_limits;

-- Consolidated policies for api_rate_limits (fixes multiple permissive policies issue)
CREATE POLICY "Users can view rate limits"
ON public.api_rate_limits
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage rate limits"
ON public.api_rate_limits
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- ════════════════════════════════════════════════════════════════
-- 3. REMOVE UNUSED INDEXES
-- ════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS public.idx_api_usage_api_key_id;
DROP INDEX IF EXISTS public.idx_api_usage_user_id;
DROP INDEX IF EXISTS public.idx_api_usage_user_date;
DROP INDEX IF EXISTS public.idx_api_keys_client_id_new;
DROP INDEX IF EXISTS public.idx_api_usage_logs_client_id_new;
DROP INDEX IF EXISTS public.idx_api_usage_logs_created_at_new;
DROP INDEX IF EXISTS public.idx_api_usage_logs_api_key_id;
DROP INDEX IF EXISTS public.idx_api_quotas_client_id_new;
DROP INDEX IF EXISTS public.idx_api_clients_status_new;
DROP INDEX IF EXISTS public.idx_api_clients_plan;

-- ════════════════════════════════════════════════════════════════
-- 4. FIX FUNCTION SEARCH PATH (Security)
-- ════════════════════════════════════════════════════════════════

-- Recreate functions with explicit search_path

-- Function: increment_api_usage
CREATE OR REPLACE FUNCTION public.increment_api_usage(
  p_user_id uuid,
  p_api_key_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.api_usage (user_id, api_key_id, request_count, last_request_at)
  VALUES (p_user_id, p_api_key_id, 1, now())
  ON CONFLICT (user_id, api_key_id, date_trunc('day', last_request_at))
  DO UPDATE SET
    request_count = public.api_usage.request_count + 1,
    last_request_at = now();
END;
$$;

-- Function: verify_api_key_with_client
CREATE OR REPLACE FUNCTION public.verify_api_key_with_client(
  p_api_key text
)
RETURNS TABLE(
  key_id uuid,
  user_id uuid,
  client_id uuid,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ak.id as key_id,
    ak.user_id,
    ak.client_id,
    (ak.is_active AND ac.status = 'active' AND (ak.expires_at IS NULL OR ak.expires_at > now())) as is_valid
  FROM public.api_keys ak
  JOIN public.api_clients ac ON ak.client_id = ac.id
  WHERE ak.key_hash = crypt(p_api_key, ak.key_hash)
  LIMIT 1;
END;
$$;

-- Function: check_rate_limit_for_client
CREATE OR REPLACE FUNCTION public.check_rate_limit_for_client(
  p_client_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit integer;
  v_window_seconds integer;
  v_request_count integer;
BEGIN
  -- Get rate limit settings for client
  SELECT requests_per_window, window_seconds
  INTO v_limit, v_window_seconds
  FROM public.api_rate_limits
  WHERE client_id = p_client_id
  LIMIT 1;

  -- If no rate limit configured, allow
  IF v_limit IS NULL THEN
    RETURN true;
  END IF;

  -- Count requests in current window
  SELECT COUNT(*)
  INTO v_request_count
  FROM public.api_usage_logs
  WHERE client_id = p_client_id
  AND created_at > (now() - (v_window_seconds || ' seconds')::interval);

  -- Return true if under limit
  RETURN v_request_count < v_limit;
END;
$$;

-- Function: log_api_usage
CREATE OR REPLACE FUNCTION public.log_api_usage(
  p_client_id uuid,
  p_api_key_id uuid,
  p_endpoint text,
  p_method text,
  p_status_code integer,
  p_response_time_ms integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.api_usage_logs (
    client_id,
    api_key_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    created_at
  ) VALUES (
    p_client_id,
    p_api_key_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms,
    now()
  );
END;
$$;

-- Function: auto_block_suspicious_ip
CREATE OR REPLACE FUNCTION public.auto_block_suspicious_ip(
  p_ip_address text,
  p_threshold integer DEFAULT 100
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_count integer;
BEGIN
  -- Count requests from this IP in the last hour
  SELECT COUNT(*)
  INTO v_request_count
  FROM public.api_usage_logs
  WHERE ip_address = p_ip_address
  AND created_at > (now() - interval '1 hour');

  -- If over threshold, block the IP
  IF v_request_count > p_threshold THEN
    INSERT INTO public.blocked_ips (ip_address, reason, blocked_at)
    VALUES (p_ip_address, 'Automatic block: excessive requests', now())
    ON CONFLICT (ip_address) DO NOTHING;
  END IF;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 5. ADD COMMENT ABOUT PASSWORD PROTECTION
-- ════════════════════════════════════════════════════════════════

COMMENT ON DATABASE postgres IS
'SECURITY NOTE: Enable Leaked Password Protection in Supabase Dashboard
Navigate to: Authentication > Settings > Password Protection
Enable: "Check for breached passwords (HaveIBeenPwned)"
This prevents users from using compromised passwords found in data breaches.';

-- ════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ════════════════════════════════════════════════════════════════

-- You can run these queries to verify the fixes:

-- 1. Check all foreign keys have indexes:
-- SELECT
--   tc.table_name,
--   kcu.column_name,
--   tc.constraint_name,
--   EXISTS (
--     SELECT 1 FROM pg_indexes
--     WHERE tablename = tc.table_name
--     AND indexdef LIKE '%' || kcu.column_name || '%'
--   ) as has_index
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu
--   ON tc.constraint_name = kcu.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
-- AND tc.table_schema = 'public'
-- ORDER BY tc.table_name, kcu.column_name;

-- 2. Check for policies using auth functions without SELECT:
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   definition
-- FROM pg_policies
-- WHERE definition LIKE '%auth.%'
-- AND definition NOT LIKE '%(SELECT auth.%'
-- AND schemaname = 'public';

-- 3. Check for functions with mutable search_path:
-- SELECT
--   n.nspname as schema,
--   p.proname as function_name,
--   pg_get_function_identity_arguments(p.oid) as arguments,
--   COALESCE(p.proconfig::text, 'default') as search_path_config
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname IN (
--   'increment_api_usage',
--   'verify_api_key_with_client',
--   'check_rate_limit_for_client',
--   'log_api_usage',
--   'auto_block_suspicious_ip'
-- );
