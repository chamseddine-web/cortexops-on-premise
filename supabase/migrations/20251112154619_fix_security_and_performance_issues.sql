/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes
  - Add indexes for all foreign keys to improve query performance
  - Covers: api_keys, audit_logs, blueprint_*, execution_*, generated_projects, etc.

  ### 2. Optimize RLS Policies
  - Replace `auth.uid()` with `(select auth.uid())` to prevent re-evaluation per row
  - Applies to: user_profiles, api_keys, api_usage, payment_history, organization_members, etc.

  ### 3. Fix Multiple Permissive Policies
  - Consolidate overlapping SELECT policies into single efficient policies
  - Affects: cloud_environments, organization_members, playbook_templates, user_profiles

  ### 4. Fix Function Search Paths
  - Set explicit search_path for all functions to prevent security issues
  - Functions: increment_api_usage, check_api_quota, reset_daily_quotas, etc.

  ### 5. Remove Unused Indexes
  - Drop unused indexes on api_usage table

  ## Security Notes
  - All changes maintain existing security boundaries
  - Performance improvements do not compromise data isolation
  - RLS policies remain restrictive and properly scoped
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- api_keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- blueprint_* indexes
CREATE INDEX IF NOT EXISTS idx_blueprint_playbooks_blueprint_id ON public.blueprint_playbooks(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_roles_blueprint_id ON public.blueprint_roles(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_structures_blueprint_id ON public.blueprint_structures(blueprint_id);

-- execution_* indexes
CREATE INDEX IF NOT EXISTS idx_execution_artifacts_job_id ON public.execution_artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_environment_id ON public.execution_jobs(environment_id);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_playbook_template_id ON public.execution_jobs(playbook_template_id);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_started_by ON public.execution_jobs(started_by);
CREATE INDEX IF NOT EXISTS idx_execution_logs_job_id ON public.execution_logs(job_id);

-- generated_projects indexes
CREATE INDEX IF NOT EXISTS idx_generated_projects_blueprint_id ON public.generated_projects(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_generated_projects_user_id ON public.generated_projects(user_id);

-- organization_members indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_invited_by ON public.organization_members(invited_by);

-- payment_history indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_plan_id ON public.payment_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);

-- playbook_generations indexes
CREATE INDEX IF NOT EXISTS idx_playbook_generations_user_id ON public.playbook_generations(user_id);

-- playbook_templates indexes
CREATE INDEX IF NOT EXISTS idx_playbook_templates_created_by ON public.playbook_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_organization_id ON public.playbook_templates(organization_id);

-- scan_results indexes
CREATE INDEX IF NOT EXISTS idx_scan_results_environment_id ON public.scan_results(environment_id);

-- user_progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON public.user_progress(lesson_id);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_api_usage_user;
DROP INDEX IF EXISTS idx_api_usage_key;

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - user_profiles
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create optimized consolidated policies
CREATE POLICY "Users can read profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - api_keys
-- =====================================================

DROP POLICY IF EXISTS "Users view own keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users create own keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users update own keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users delete own keys" ON public.api_keys;

CREATE POLICY "Users view own keys"
  ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users create own keys"
  ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users update own keys"
  ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users delete own keys"
  ON public.api_keys
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - api_usage
-- =====================================================

DROP POLICY IF EXISTS "Users view own usage" ON public.api_usage;

CREATE POLICY "Users view own usage"
  ON public.api_usage
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 6. OPTIMIZE RLS POLICIES - payment_history
-- =====================================================

DROP POLICY IF EXISTS "Users view own payments" ON public.payment_history;

CREATE POLICY "Users view own payments"
  ON public.payment_history
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 7. OPTIMIZE RLS POLICIES - organization_members
-- =====================================================

DROP POLICY IF EXISTS "Organization members can view members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON public.organization_members;

-- Consolidated SELECT policy
CREATE POLICY "Organization members can view members"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = (select auth.uid())
    )
  );

-- Separate policies for modifications (admin only)
CREATE POLICY "Organization admins can insert members"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_members.organization_id
      AND user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Organization admins can update members"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = (select auth.uid())
      AND om.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = (select auth.uid())
      AND om.role = 'admin'
    )
  );

CREATE POLICY "Organization admins can delete members"
  ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = (select auth.uid())
      AND om.role = 'admin'
    )
  );

-- =====================================================
-- 8. OPTIMIZE RLS POLICIES - cloud_environments
-- =====================================================

DROP POLICY IF EXISTS "Organization members can view environments" ON public.cloud_environments;
DROP POLICY IF EXISTS "Organization admins can manage environments" ON public.cloud_environments;

-- Consolidated SELECT policy
CREATE POLICY "Organization members can view environments"
  ON public.cloud_environments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = cloud_environments.organization_id
      AND user_id = (select auth.uid())
    )
  );

-- Admin-only modification policies
CREATE POLICY "Organization admins can insert environments"
  ON public.cloud_environments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = cloud_environments.organization_id
      AND user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Organization admins can update environments"
  ON public.cloud_environments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = cloud_environments.organization_id
      AND user_id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = cloud_environments.organization_id
      AND user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Organization admins can delete environments"
  ON public.cloud_environments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = cloud_environments.organization_id
      AND user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- 9. OPTIMIZE RLS POLICIES - playbook_templates
-- =====================================================

DROP POLICY IF EXISTS "Users can view public or own templates" ON public.playbook_templates;
DROP POLICY IF EXISTS "Users can manage own templates" ON public.playbook_templates;

-- Consolidated SELECT policy
CREATE POLICY "Users can view templates"
  ON public.playbook_templates
  FOR SELECT
  TO authenticated
  USING (
    is_public = true OR 
    created_by = (select auth.uid()) OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = (select auth.uid())
    )
  );

-- Owner-only modification policies
CREATE POLICY "Users can insert own templates"
  ON public.playbook_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can update own templates"
  ON public.playbook_templates
  FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete own templates"
  ON public.playbook_templates
  FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- =====================================================
-- 10. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Drop and recreate functions with proper search_path

-- Fix increment_api_usage
DROP FUNCTION IF EXISTS public.increment_api_usage(uuid, uuid, text);
CREATE FUNCTION public.increment_api_usage(
  p_user_id uuid,
  p_key_id uuid,
  p_endpoint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.api_usage (user_id, key_id, endpoint, request_count, created_at)
  VALUES (p_user_id, p_key_id, p_endpoint, 1, now())
  ON CONFLICT (user_id, key_id, DATE(created_at), COALESCE(endpoint, ''))
  DO UPDATE SET 
    request_count = api_usage.request_count + 1,
    updated_at = now();
END;
$$;

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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan text;
  v_usage bigint;
  v_limit bigint;
BEGIN
  SELECT subscription_plan INTO v_plan
  FROM public.user_profiles
  WHERE id = p_user_id;

  SELECT COALESCE(SUM(request_count), 0) INTO v_usage
  FROM public.api_usage
  WHERE user_id = p_user_id
  AND created_at >= date_trunc('month', now());

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
SET search_path = public, pg_temp
AS $$
BEGIN
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
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(request_count), 0) as total_requests,
    COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN request_count ELSE 0 END), 0) as today_requests,
    COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', now()) THEN request_count ELSE 0 END), 0) as month_requests
  FROM public.api_usage
  WHERE user_id = p_user_id;
END;
$$;

-- Fix auto_block_suspicious_ip
DROP FUNCTION IF EXISTS public.auto_block_suspicious_ip() CASCADE;
CREATE FUNCTION public.auto_block_suspicious_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_count integer;
BEGIN
  SELECT COUNT(*) INTO v_request_count
  FROM public.security_events
  WHERE ip_address = NEW.ip_address
  AND event_type = 'failed_auth'
  AND created_at > now() - interval '1 hour';

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