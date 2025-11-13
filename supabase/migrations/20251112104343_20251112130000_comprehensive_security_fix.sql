/*
  # Comprehensive Security Fixes

  1. Foreign Key Indexes - Add all missing indexes
  2. RLS Performance - Optimize all policies with (select auth.uid())
  3. Missing Policies - Add policies for tables without them
  4. Consolidate Multiple Policies - Fix overlapping policies
  5. Function Security - Fix all search_path issues
*/

-- ============================================================================
-- PART 1: ADD ALL MISSING FOREIGN KEY INDEXES
-- ============================================================================

DO $$ 
BEGIN
  -- execution_jobs indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'execution_jobs' 
    AND indexname = 'idx_execution_jobs_playbook_template_id'
  ) THEN
    CREATE INDEX idx_execution_jobs_playbook_template_id ON execution_jobs(playbook_template_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'execution_jobs' 
    AND indexname = 'idx_execution_jobs_started_by'
  ) THEN
    CREATE INDEX idx_execution_jobs_started_by ON execution_jobs(started_by);
  END IF;

  -- generated_projects indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'generated_projects' 
    AND indexname = 'idx_generated_projects_blueprint_id'
  ) THEN
    CREATE INDEX idx_generated_projects_blueprint_id ON generated_projects(blueprint_id);
  END IF;

  -- lessons indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'lessons' 
    AND indexname = 'idx_lessons_course_id'
  ) THEN
    CREATE INDEX idx_lessons_course_id ON lessons(course_id);
  END IF;

  -- organization_members indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'organization_members' 
    AND indexname = 'idx_organization_members_invited_by'
  ) THEN
    CREATE INDEX idx_organization_members_invited_by ON organization_members(invited_by);
  END IF;

  -- playbook_templates indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'playbook_templates' 
    AND indexname = 'idx_playbook_templates_created_by'
  ) THEN
    CREATE INDEX idx_playbook_templates_created_by ON playbook_templates(created_by);
  END IF;

  -- user_progress indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_progress' 
    AND indexname = 'idx_user_progress_lesson_id'
  ) THEN
    CREATE INDEX idx_user_progress_lesson_id ON user_progress(lesson_id);
  END IF;
END $$;

-- ============================================================================
-- PART 2: OPTIMIZE ALL RLS POLICIES
-- ============================================================================

-- user_progress
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
  CREATE POLICY "Users can view own progress"
    ON user_progress FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
  CREATE POLICY "Users can insert own progress"
    ON user_progress FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
  CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- generated_playbooks
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own playbooks" ON generated_playbooks;
  CREATE POLICY "Users can view own playbooks"
    ON generated_playbooks FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own playbooks" ON generated_playbooks;
  CREATE POLICY "Users can insert own playbooks"
    ON generated_playbooks FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own playbooks" ON generated_playbooks;
  CREATE POLICY "Users can delete own playbooks"
    ON generated_playbooks FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- generated_projects
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own projects" ON generated_projects;
  CREATE POLICY "Users can view own projects"
    ON generated_projects FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create own projects" ON generated_projects;
  CREATE POLICY "Users can create own projects"
    ON generated_projects FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own projects" ON generated_projects;
  CREATE POLICY "Users can update own projects"
    ON generated_projects FOR UPDATE
    TO authenticated
    USING (user_id = (select auth.uid()))
    WITH CHECK (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own projects" ON generated_projects;
  CREATE POLICY "Users can delete own projects"
    ON generated_projects FOR DELETE
    TO authenticated
    USING (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- user_profiles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
  CREATE POLICY "Users can read own profile"
    ON user_profiles FOR SELECT
    TO authenticated
    USING (id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
  CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (id = (select auth.uid()))
    WITH CHECK (id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- playbook_generations
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own playbook generations" ON playbook_generations;
  CREATE POLICY "Users can read own playbook generations"
    ON playbook_generations FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own playbook generations" ON playbook_generations;
  CREATE POLICY "Users can insert own playbook generations"
    ON playbook_generations FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (select auth.uid()));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- execution_jobs
DO $$ BEGIN
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
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- execution_logs
DO $$ BEGIN
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
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- execution_artifacts
DO $$ BEGIN
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
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================================
-- PART 3: CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ============================================================================

-- playbook_templates - drop old policies and create new consolidated ones
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view org templates" ON playbook_templates;
  DROP POLICY IF EXISTS "Admins can manage org templates" ON playbook_templates;
  DROP POLICY IF EXISTS "Users can view public templates" ON playbook_templates;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- cloud_environments - consolidate
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage environments" ON cloud_environments;
  DROP POLICY IF EXISTS "Members can view organization environments" ON cloud_environments;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- organization_members - consolidate
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
  DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- PART 4: ADD MISSING POLICIES FOR TABLES WITH RLS BUT NO POLICIES
-- ============================================================================

-- blocked_ips
DO $$ BEGIN
  CREATE POLICY "Service role can manage blocked IPs"
    ON blocked_ips FOR ALL
    TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view blocked IPs"
    ON blocked_ips FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- security_events
DO $$ BEGIN
  CREATE POLICY "Service role can manage security events"
    ON security_events FOR ALL
    TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view security events"
    ON security_events FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- security_stats
DO $$ BEGIN
  CREATE POLICY "Service role can manage security stats"
    ON security_stats FOR ALL
    TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view security stats"
    ON security_stats FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- PART 5: FIX ALL FUNCTION SEARCH_PATH ISSUES
-- ============================================================================

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