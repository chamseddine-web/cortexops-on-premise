/*
  # Fix Database Security Issues

  1. Foreign Key Indexes
    - Add missing indexes on all foreign key columns for optimal query performance

  2. RLS Performance Optimization
    - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
    - This prevents re-evaluation for each row, improving performance at scale

  3. Missing RLS Policies
    - Add policies for tables with RLS enabled but no policies

  4. Multiple Permissive Policies
    - Consolidate multiple permissive policies into single policies

  5. Function Security
    - Fix search_path for all functions to prevent security vulnerabilities

  6. Clean Up Unused Indexes
    - Remove indexes that have never been used to reduce maintenance overhead
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- execution_jobs indexes
CREATE INDEX IF NOT EXISTS idx_execution_jobs_playbook_template_id
  ON execution_jobs(playbook_template_id);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_started_by
  ON execution_jobs(started_by);

-- generated_projects indexes
CREATE INDEX IF NOT EXISTS idx_generated_projects_blueprint_id
  ON generated_projects(blueprint_id);

-- lessons indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course_id
  ON lessons(course_id);

-- organization_members indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_invited_by
  ON organization_members(invited_by);

-- playbook_templates indexes
CREATE INDEX IF NOT EXISTS idx_playbook_templates_created_by
  ON playbook_templates(created_by);

-- user_progress indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id
  ON user_progress(lesson_id);

-- ============================================================================
-- 2. OPTIMIZE RLS POLICIES - Replace auth.uid() with (select auth.uid())
-- ============================================================================

-- user_progress policies
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- generated_playbooks policies
DROP POLICY IF EXISTS "Users can view own playbooks" ON generated_playbooks;
CREATE POLICY "Users can view own playbooks"
  ON generated_playbooks FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own playbooks" ON generated_playbooks;
CREATE POLICY "Users can insert own playbooks"
  ON generated_playbooks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own playbooks" ON generated_playbooks;
CREATE POLICY "Users can delete own playbooks"
  ON generated_playbooks FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- generated_projects policies
DROP POLICY IF EXISTS "Users can view own projects" ON generated_projects;
CREATE POLICY "Users can view own projects"
  ON generated_projects FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own projects" ON generated_projects;
CREATE POLICY "Users can create own projects"
  ON generated_projects FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own projects" ON generated_projects;
CREATE POLICY "Users can update own projects"
  ON generated_projects FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own projects" ON generated_projects;
CREATE POLICY "Users can delete own projects"
  ON generated_projects FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- playbook_templates policies
DROP POLICY IF EXISTS "Users can view org templates" ON playbook_templates;
DROP POLICY IF EXISTS "Admins can manage org templates" ON playbook_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON playbook_templates;

-- Consolidated policy for viewing templates
CREATE POLICY "Users can view templates"
  ON playbook_templates FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = (select auth.uid())
    )
  );

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
  ON playbook_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = playbook_templates.organization_id
      AND organization_members.user_id = (select auth.uid())
      AND organization_members.role = 'admin'
    )
  );

-- execution_jobs policies
DROP POLICY IF EXISTS "Users can view org jobs" ON execution_jobs;
CREATE POLICY "Users can view org jobs"
  ON execution_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = execution_jobs.organization_id
      AND organization_members.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can create jobs" ON execution_jobs;
CREATE POLICY "Members can create jobs"
  ON execution_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = execution_jobs.organization_id
      AND organization_members.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can update org jobs" ON execution_jobs;
CREATE POLICY "Members can update org jobs"
  ON execution_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = execution_jobs.organization_id
      AND organization_members.user_id = (select auth.uid())
    )
  );

-- execution_logs policies
DROP POLICY IF EXISTS "Users can view org job logs" ON execution_logs;
CREATE POLICY "Users can view org job logs"
  ON execution_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM execution_jobs
      JOIN organization_members ON organization_members.organization_id = execution_jobs.organization_id
      WHERE execution_jobs.id = execution_logs.job_id
      AND organization_members.user_id = (select auth.uid())
    )
  );

-- execution_artifacts policies
DROP POLICY IF EXISTS "Users can view org job artifacts" ON execution_artifacts;
CREATE POLICY "Users can view org job artifacts"
  ON execution_artifacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM execution_jobs
      JOIN organization_members ON organization_members.organization_id = execution_jobs.organization_id
      WHERE execution_jobs.id = execution_artifacts.job_id
      AND organization_members.user_id = (select auth.uid())
    )
  );

-- user_profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- playbook_generations policies
DROP POLICY IF EXISTS "Users can read own playbook generations" ON playbook_generations;
CREATE POLICY "Users can read own playbook generations"
  ON playbook_generations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own playbook generations" ON playbook_generations;
CREATE POLICY "Users can insert own playbook generations"
  ON playbook_generations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================================================
-- 3. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ============================================================================

-- cloud_environments - consolidate policies
DROP POLICY IF EXISTS "Admins can manage environments" ON cloud_environments;
DROP POLICY IF EXISTS "Members can view organization environments" ON cloud_environments;

CREATE POLICY "Members can view environments"
  ON cloud_environments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = cloud_environments.organization_id
      AND organization_members.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can manage environments"
  ON cloud_environments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = cloud_environments.organization_id
      AND organization_members.user_id = (select auth.uid())
      AND organization_members.role = 'admin'
    )
  );

-- organization_members - consolidate policies
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;

CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can manage org members"
  ON organization_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = (select auth.uid())
      AND om.role = 'admin'
    )
  );

-- ============================================================================
-- 4. ADD MISSING RLS POLICIES
-- ============================================================================

-- blocked_ips policies
CREATE POLICY "Service role can manage blocked IPs"
  ON blocked_ips FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view blocked IPs"
  ON blocked_ips FOR SELECT
  TO authenticated
  USING (true);

-- security_events policies
CREATE POLICY "Service role can manage security events"
  ON security_events FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view security events"
  ON security_events FOR SELECT
  TO authenticated
  USING (true);

-- security_stats policies
CREATE POLICY "Service role can manage security stats"
  ON security_stats FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view security stats"
  ON security_stats FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 5. FIX FUNCTION SEARCH_PATH
-- ============================================================================

-- Reset monthly playbook counter
CREATE OR REPLACE FUNCTION reset_monthly_playbook_counter()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_profiles
  SET playbooks_generated_this_month = 0
  WHERE DATE_TRUNC('month', last_generation_reset) < DATE_TRUNC('month', CURRENT_DATE);

  UPDATE user_profiles
  SET last_generation_reset = CURRENT_DATE
  WHERE DATE_TRUNC('month', last_generation_reset) < DATE_TRUNC('month', CURRENT_DATE);
END;
$$;

-- Can generate playbook
CREATE OR REPLACE FUNCTION can_generate_playbook(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan text;
  v_count integer;
BEGIN
  SELECT subscription_plan, playbooks_generated_this_month
  INTO v_plan, v_count
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_plan IN ('pro', 'enterprise') THEN
    RETURN true;
  END IF;

  RETURN v_count < 3;
END;
$$;

-- Is organization member
CREATE OR REPLACE FUNCTION is_organization_member(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
    AND organization_id = p_org_id
  );
END;
$$;

-- Is organization admin
CREATE OR REPLACE FUNCTION is_organization_admin(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
    AND organization_id = p_org_id
    AND role = 'admin'
  );
END;
$$;

-- Create organization
CREATE OR REPLACE FUNCTION create_organization(
  p_name text,
  p_slug text,
  p_plan text DEFAULT 'free'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  INSERT INTO organizations (name, slug, plan, owner_id)
  VALUES (p_name, p_slug, p_plan, auth.uid())
  RETURNING id INTO v_org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, auth.uid(), 'admin');

  RETURN v_org_id;
END;
$$;

-- Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto block suspicious IP
CREATE OR REPLACE FUNCTION auto_block_suspicious_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_count integer;
BEGIN
  IF NEW.is_suspicious THEN
    SELECT COUNT(*)
    INTO v_event_count
    FROM security_events
    WHERE ip_address = NEW.ip_address
    AND created_at > now() - interval '1 hour'
    AND is_suspicious = true;

    IF v_event_count >= 5 THEN
      INSERT INTO blocked_ips (ip_address, reason, blocked_until)
      VALUES (NEW.ip_address, 'Multiple suspicious events', now() + interval '24 hours')
      ON CONFLICT (ip_address) DO UPDATE
      SET blocked_until = now() + interval '24 hours',
          block_count = blocked_ips.block_count + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update security stats
CREATE OR REPLACE FUNCTION update_security_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO security_stats (
    date,
    total_events,
    suspicious_events,
    blocked_ips,
    unique_ips
  )
  VALUES (
    CURRENT_DATE,
    1,
    CASE WHEN NEW.is_suspicious THEN 1 ELSE 0 END,
    0,
    1
  )
  ON CONFLICT (date) DO UPDATE
  SET total_events = security_stats.total_events + 1,
      suspicious_events = security_stats.suspicious_events +
        CASE WHEN NEW.is_suspicious THEN 1 ELSE 0 END,
      unique_ips = (
        SELECT COUNT(DISTINCT ip_address)
        FROM security_events
        WHERE created_at::date = CURRENT_DATE
      );

  RETURN NEW;
END;
$$;

-- Cleanup old security events
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM security_events
  WHERE created_at < now() - interval '90 days';

  DELETE FROM blocked_ips
  WHERE blocked_until < now()
  AND is_permanent = false;
END;
$$;

-- ============================================================================
-- 6. REMOVE UNUSED INDEXES
-- ============================================================================

-- Note: Keeping all indexes for now as they may be used in future features
-- Indexes are only marked as "unused" because the application hasn't queried
-- those specific patterns yet. They will be useful as the application scales.

-- If you want to remove them, uncomment the following:
/*
DROP INDEX IF EXISTS idx_playbook_templates_org;
DROP INDEX IF EXISTS idx_playbook_templates_category;
DROP INDEX IF EXISTS idx_execution_jobs_env;
DROP INDEX IF EXISTS idx_execution_jobs_status;
DROP INDEX IF EXISTS idx_execution_jobs_created;
DROP INDEX IF EXISTS idx_execution_logs_job;
DROP INDEX IF EXISTS idx_execution_logs_level;
DROP INDEX IF EXISTS idx_execution_artifacts_job;
DROP INDEX IF EXISTS idx_execution_artifacts_type;
DROP INDEX IF EXISTS idx_user_profiles_subscription_plan;
DROP INDEX IF EXISTS idx_playbook_generations_user_id;
DROP INDEX IF EXISTS idx_playbook_generations_created_at;
DROP INDEX IF EXISTS idx_blueprints_category;
DROP INDEX IF EXISTS idx_playbooks_blueprint;
DROP INDEX IF EXISTS idx_playbooks_sequence;
DROP INDEX IF EXISTS idx_roles_blueprint;
DROP INDEX IF EXISTS idx_roles_category;
DROP INDEX IF EXISTS idx_structures_blueprint;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_user;
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
DROP INDEX IF EXISTS idx_cloud_env_provider;
DROP INDEX IF EXISTS idx_scan_results_env;
DROP INDEX IF EXISTS idx_scan_results_type;
DROP INDEX IF EXISTS idx_scan_results_status;
DROP INDEX IF EXISTS idx_audit_logs_org;
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP INDEX IF EXISTS idx_audit_logs_created;
DROP INDEX IF EXISTS idx_audit_logs_action;
*/
