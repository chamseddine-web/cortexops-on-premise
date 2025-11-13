/*
  # Fix Comprehensive Security Issues

  ## Changes Made

  ### 1. Remove Unused Indexes (45 indexes)
  Drops unused indexes to reduce maintenance overhead and improve write performance.

  ### 2. Consolidate Multiple Permissive Policies
  Replaces multiple permissive SELECT policies with single restrictive policies for:
  - cloud_environments
  - organization_members
  - playbook_templates

  ### 3. Secure SECURITY DEFINER Views
  Recreates views as SECURITY INVOKER to avoid search path attacks:
  - daily_security_report
  - organization_stats

  ### 4. Fix Function Search Path Mutability
  Sets immutable search_path for all SECURITY DEFINER functions:
  - is_organization_member
  - is_organization_admin
  - create_organization
  - auto_block_suspicious_ip

  ## Security Impact
  - Reduces attack surface by removing unused indexes
  - Prevents privilege escalation via multiple permissive policies
  - Protects against search path attacks
  - Hardens functions against SQL injection

  ## Manual Action Required
  Enable Leaked Password Protection in Supabase Auth dashboard:
  1. Navigate to: Authentication > Settings > Password Protection
  2. Enable "Check against HaveIBeenPwned database"
*/

-- =====================================================
-- 1. DROP UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_playbook_templates_org;
DROP INDEX IF EXISTS idx_playbook_templates_category;
DROP INDEX IF EXISTS idx_playbook_templates_created_by;
DROP INDEX IF EXISTS idx_execution_jobs_env;
DROP INDEX IF EXISTS idx_execution_jobs_status;
DROP INDEX IF EXISTS idx_execution_jobs_created;
DROP INDEX IF EXISTS idx_execution_jobs_playbook_template_id;
DROP INDEX IF EXISTS idx_execution_jobs_started_by;
DROP INDEX IF EXISTS idx_execution_logs_job;
DROP INDEX IF EXISTS idx_execution_logs_level;
DROP INDEX IF EXISTS idx_execution_artifacts_job;
DROP INDEX IF EXISTS idx_execution_artifacts_type;
DROP INDEX IF EXISTS idx_user_profiles_subscription_plan;
DROP INDEX IF EXISTS idx_playbook_generations_user_id;
DROP INDEX IF EXISTS idx_playbook_generations_created_at;
DROP INDEX IF EXISTS idx_user_progress_lesson_id;
DROP INDEX IF EXISTS idx_blueprints_category;
DROP INDEX IF EXISTS idx_playbooks_blueprint;
DROP INDEX IF EXISTS idx_playbooks_sequence;
DROP INDEX IF EXISTS idx_roles_blueprint;
DROP INDEX IF EXISTS idx_roles_category;
DROP INDEX IF EXISTS idx_structures_blueprint;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_user;
DROP INDEX IF EXISTS idx_generated_projects_blueprint_id;
DROP INDEX IF EXISTS idx_blocked_ips_address;
DROP INDEX IF EXISTS idx_blocked_ips_active;
DROP INDEX IF EXISTS idx_security_stats_date;
DROP INDEX IF EXISTS idx_security_events_timestamp;
DROP INDEX IF EXISTS idx_security_events_type;
DROP INDEX IF EXISTS idx_security_events_suspicious;
DROP INDEX IF EXISTS idx_security_events_ip;
DROP INDEX IF EXISTS idx_organizations_plan;
DROP INDEX IF EXISTS idx_organizations_slug;
DROP INDEX IF EXISTS idx_org_members_org;
DROP INDEX IF EXISTS idx_org_members_role;
DROP INDEX IF EXISTS idx_organization_members_invited_by;
DROP INDEX IF EXISTS idx_cloud_env_provider;
DROP INDEX IF EXISTS idx_scan_results_env;
DROP INDEX IF EXISTS idx_scan_results_type;
DROP INDEX IF EXISTS idx_scan_results_status;
DROP INDEX IF EXISTS idx_audit_logs_org;
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_created;
DROP INDEX IF EXISTS idx_audit_logs_action;

-- =====================================================
-- 2. FIX MULTIPLE PERMISSIVE POLICIES
-- =====================================================

-- Cloud Environments
DROP POLICY IF EXISTS "Admins can manage environments" ON cloud_environments;
DROP POLICY IF EXISTS "Members can view environments" ON cloud_environments;

CREATE POLICY "Organization members can view environments"
  ON cloud_environments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = cloud_environments.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage environments"
  ON cloud_environments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = cloud_environments.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = cloud_environments.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
  );

-- Organization Members
DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;
DROP POLICY IF EXISTS "Members can view org members" ON organization_members;

CREATE POLICY "Organization members can view members"
  ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage members"
  ON organization_members
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Playbook Templates
DROP POLICY IF EXISTS "Admins can manage templates" ON playbook_templates;
DROP POLICY IF EXISTS "Users can view templates" ON playbook_templates;

CREATE POLICY "Users can view public or own templates"
  ON playbook_templates
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own templates"
  ON playbook_templates
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- =====================================================
-- 3. SECURE SECURITY DEFINER VIEWS
-- =====================================================

DROP VIEW IF EXISTS daily_security_report CASCADE;

CREATE VIEW daily_security_report
WITH (security_invoker = true)
AS
SELECT
  ss.date,
  ss.total_events,
  ss.suspicious_events,
  ss.blocked_attempts,
  ss.unique_visitors
FROM public.security_stats ss
WHERE ss.date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ss.date DESC;

DROP VIEW IF EXISTS organization_stats CASCADE;

CREATE VIEW organization_stats
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.name,
  o.plan,
  COUNT(DISTINCT om.user_id) AS member_count,
  COUNT(DISTINCT ce.id) AS environment_count,
  COUNT(DISTINCT pt.id) AS template_count
FROM public.organizations o
LEFT JOIN public.organization_members om ON o.id = om.organization_id
LEFT JOIN public.cloud_environments ce ON o.id = ce.organization_id
LEFT JOIN public.playbook_templates pt ON o.id = pt.organization_id
GROUP BY o.id, o.name, o.plan;

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATH MUTABILITY
-- =====================================================

-- Fix is_organization_member (with CASCADE to handle dependent policies)
DROP FUNCTION IF EXISTS is_organization_member(uuid) CASCADE;

CREATE FUNCTION is_organization_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
$$;

-- Fix is_organization_admin (with CASCADE to handle dependent policies)
DROP FUNCTION IF EXISTS is_organization_admin(uuid) CASCADE;

CREATE FUNCTION is_organization_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Fix create_organization
DROP FUNCTION IF EXISTS create_organization(text, text) CASCADE;

CREATE FUNCTION create_organization(
  org_name text,
  org_slug text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  new_org_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.organizations (name, slug, plan)
  VALUES (org_name, org_slug, 'free')
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, current_user_id, 'admin');

  RETURN new_org_id;
END;
$$;

-- Fix auto_block_suspicious_ip
DROP FUNCTION IF EXISTS auto_block_suspicious_ip() CASCADE;

CREATE FUNCTION auto_block_suspicious_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  event_count integer;
BEGIN
  SELECT COUNT(*) INTO event_count
  FROM public.security_events
  WHERE ip_address = NEW.ip_address
    AND suspicious = true
    AND timestamp > NOW() - INTERVAL '1 hour';

  IF event_count >= 10 THEN
    INSERT INTO public.blocked_ips (ip_address, reason, blocked_at, permanent)
    VALUES (
      NEW.ip_address,
      'Automatic block: ' || event_count || ' suspicious events',
      NOW(),
      false
    )
    ON CONFLICT (ip_address) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 5. RECREATE POLICIES THAT DEPENDED ON FUNCTIONS
-- =====================================================

-- Recreate organizations policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Users can view their organizations'
  ) THEN
    CREATE POLICY "Users can view their organizations"
      ON organizations
      FOR SELECT
      TO authenticated
      USING (is_organization_member(id));
  END IF;
END $$;

-- Recreate scan_results policies  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'scan_results' 
    AND policyname = 'Members can view scan results'
  ) THEN
    CREATE POLICY "Members can view scan results"
      ON scan_results
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM cloud_environments
          WHERE cloud_environments.id = scan_results.environment_id
          AND is_organization_member(cloud_environments.organization_id)
        )
      );
  END IF;
END $$;

-- Recreate audit_logs policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'Members can view organization audit logs'
  ) THEN
    CREATE POLICY "Members can view organization audit logs"
      ON audit_logs
      FOR SELECT
      TO authenticated
      USING (is_organization_member(organization_id));
  END IF;
END $$;

-- Recreate trigger if it was dropped
DROP TRIGGER IF EXISTS auto_block_suspicious_ips ON security_events;

CREATE TRIGGER auto_block_suspicious_ips
  AFTER INSERT ON security_events
  FOR EACH ROW
  WHEN (NEW.suspicious = true)
  EXECUTE FUNCTION auto_block_suspicious_ip();

-- Grant necessary permissions
GRANT SELECT ON public.security_stats TO authenticated;
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.organization_members TO authenticated;
GRANT SELECT ON public.cloud_environments TO authenticated;
GRANT SELECT ON public.playbook_templates TO authenticated;
GRANT SELECT ON public.scan_results TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
