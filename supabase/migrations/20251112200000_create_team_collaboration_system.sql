/*
  # Team Collaboration & Role Management System

  1. Overview
    Enterprise-grade multi-tenant collaboration system with granular role-based access control.
    Supports organizations, teams, projects, and user role assignments.

  2. New Tables
    - `organizations`: Top-level tenant organizations
    - `teams`: Sub-groups within organizations
    - `projects`: Automation projects with version control
    - `team_members`: User-team associations with roles
    - `project_collaborators`: User-project associations with permissions
    - `activity_feed`: Real-time collaboration activity stream
    - `invitations`: Team invitation management

  3. Roles & Permissions
    - owner: Full control, can delete organization
    - admin: Manage teams, users, billing
    - developer: Create/edit playbooks, manage projects
    - viewer: Read-only access
    - guest: Limited temporary access

  4. Security
    - RLS policies for multi-tenant isolation
    - Audit trail for all actions
    - Invitation token expiration
*/

-- ============================================================================
-- Organizations (Top-level tenants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,

  -- Organization details
  description text,
  logo_url text,
  website text,

  -- Billing & plan
  plan text NOT NULL DEFAULT 'free' CHECK (
    plan IN ('free', 'pro', 'enterprise')
  ),
  seats_limit integer DEFAULT 5,
  seats_used integer DEFAULT 1,

  -- Limits per plan
  playbooks_limit integer DEFAULT 100,
  api_calls_limit integer DEFAULT 1000,

  -- Status
  status text DEFAULT 'active' CHECK (
    status IN ('active', 'suspended', 'deleted')
  ),

  -- Owner
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Settings
  settings jsonb DEFAULT '{
    "require_mfa": false,
    "sso_enabled": false,
    "audit_retention_days": 90,
    "allow_guest_access": true,
    "default_playbook_visibility": "team"
  }'::jsonb,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- ============================================================================
-- Teams (Sub-groups within organizations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name text NOT NULL,
  slug text NOT NULL,
  description text,

  -- Team settings
  visibility text DEFAULT 'private' CHECK (
    visibility IN ('private', 'organization', 'public')
  ),

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- ============================================================================
-- Projects (Automation projects with version control)
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,

  name text NOT NULL,
  slug text NOT NULL,
  description text,

  -- Project type
  project_type text DEFAULT 'ansible' CHECK (
    project_type IN ('ansible', 'terraform', 'kubernetes', 'mixed')
  ),

  -- Git integration
  git_enabled boolean DEFAULT false,
  git_provider text CHECK (git_provider IN ('github', 'gitlab', 'bitbucket')),
  git_repository_url text,
  git_branch text DEFAULT 'main',

  -- CI/CD integration
  ci_enabled boolean DEFAULT false,
  ci_provider text CHECK (ci_provider IN ('jenkins', 'gitlab-ci', 'github-actions', 'circleci')),
  ci_config jsonb,

  -- Project settings
  visibility text DEFAULT 'team' CHECK (
    visibility IN ('private', 'team', 'organization', 'public')
  ),

  -- Version control
  version text DEFAULT '1.0.0',
  last_sync_at timestamptz,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_git ON projects(git_enabled, git_provider);

-- ============================================================================
-- Team Members (User-team associations with roles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Role in team
  role text NOT NULL CHECK (
    role IN ('owner', 'admin', 'developer', 'viewer', 'guest')
  ),

  -- Permissions
  can_create_projects boolean DEFAULT true,
  can_invite_members boolean DEFAULT false,
  can_manage_settings boolean DEFAULT false,

  -- Status
  status text DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'suspended')
  ),

  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- ============================================================================
-- Project Collaborators (User-project associations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Access level
  access_level text NOT NULL CHECK (
    access_level IN ('owner', 'write', 'read', 'comment')
  ),

  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user ON project_collaborators(user_id);

-- ============================================================================
-- Activity Feed (Real-time collaboration stream)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,

  -- Actor
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Activity type
  activity_type text NOT NULL CHECK (
    activity_type IN (
      'project_created', 'project_updated', 'project_deleted',
      'playbook_generated', 'playbook_exported',
      'member_invited', 'member_joined', 'member_removed',
      'role_changed', 'settings_updated',
      'git_push', 'git_pull', 'ci_triggered',
      'comment_added', 'approval_requested', 'approved'
    )
  ),

  -- Activity details
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Related entities
  target_type text,
  target_id uuid,

  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_organization ON activity_feed(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_team ON activity_feed(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_feed(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_feed(activity_type);

-- ============================================================================
-- Invitations (Team invitation management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,

  -- Invitee
  email text NOT NULL,
  role text NOT NULL CHECK (
    role IN ('admin', 'developer', 'viewer', 'guest')
  ),

  -- Invitation details
  token text UNIQUE NOT NULL,
  message text,

  -- Status
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')
  ),

  -- Lifecycle
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,

  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_organization ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE t.organization_id = organizations.id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teams they belong to"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    ) OR
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = teams.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage teams"
  ON teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects they have access to"
  ON projects FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = projects.id
      AND project_collaborators.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = projects.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

CREATE POLICY "Collaborators can update projects with write access"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_collaborators
      WHERE project_collaborators.project_id = projects.id
      AND project_collaborators.user_id = auth.uid()
      AND project_collaborators.access_level IN ('owner', 'write')
    )
  );

-- Team Members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
  );

-- Activity Feed
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity in their organizations"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE t.organization_id = activity_feed.organization_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
    )
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to check if user is team admin
CREATE OR REPLACE FUNCTION is_team_admin(p_team_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_organization_id uuid,
  p_team_id uuid,
  p_project_id uuid,
  p_user_id uuid,
  p_activity_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO activity_feed (
    organization_id,
    team_id,
    project_id,
    user_id,
    activity_type,
    title,
    description,
    metadata
  ) VALUES (
    p_organization_id,
    p_team_id,
    p_project_id,
    p_user_id,
    p_activity_type,
    p_title,
    p_description,
    p_metadata
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invitation
CREATE OR REPLACE FUNCTION create_invitation(
  p_organization_id uuid,
  p_team_id uuid,
  p_email text,
  p_role text,
  p_invited_by uuid,
  p_message text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_invitation_id uuid;
  v_token text;
BEGIN
  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'base64');

  INSERT INTO invitations (
    organization_id,
    team_id,
    email,
    role,
    token,
    message,
    invited_by,
    expires_at
  ) VALUES (
    p_organization_id,
    p_team_id,
    p_email,
    p_role,
    v_token,
    p_message,
    p_invited_by,
    now() + interval '7 days'
  ) RETURNING id INTO v_invitation_id;

  -- Log activity
  PERFORM log_activity(
    p_organization_id,
    p_team_id,
    NULL,
    p_invited_by,
    'member_invited',
    format('Invited %s to join team', p_email),
    p_message,
    jsonb_build_object('role', p_role, 'email', p_email)
  );

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE organizations IS 'Top-level tenant organizations for multi-tenant SaaS';
COMMENT ON TABLE teams IS 'Sub-groups within organizations for team collaboration';
COMMENT ON TABLE projects IS 'Automation projects with Git and CI/CD integration';
COMMENT ON TABLE activity_feed IS 'Real-time activity stream for collaboration transparency';
COMMENT ON TABLE invitations IS 'Team invitation management with expiration';
