CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'business', 'enterprise')),
  max_users integer DEFAULT 5,
  max_environments integer DEFAULT 3,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

CREATE TABLE IF NOT EXISTS cloud_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('aws', 'azure', 'gcp', 'kubernetes', 'on-premise')),
  region text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'scanning')),
  credentials_encrypted text,
  metadata jsonb DEFAULT '{}'::jsonb,
  last_scan_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_cloud_env_org ON cloud_environments(organization_id);
CREATE INDEX IF NOT EXISTS idx_cloud_env_provider ON cloud_environments(provider);
CREATE INDEX IF NOT EXISTS idx_cloud_env_status ON cloud_environments(status);

CREATE TABLE IF NOT EXISTS scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid NOT NULL REFERENCES cloud_environments(id) ON DELETE CASCADE,
  scan_type text NOT NULL CHECK (scan_type IN ('security', 'compliance', 'performance', 'cost', 'full')),
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  results jsonb DEFAULT '{}'::jsonb,
  score integer CHECK (score >= 0 AND score <= 100),
  issues_critical integer DEFAULT 0,
  issues_high integer DEFAULT 0,
  issues_medium integer DEFAULT 0,
  issues_low integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_env ON scan_results(environment_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_type ON scan_results(scan_type);
CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status);
CREATE INDEX IF NOT EXISTS idx_scan_results_created ON scan_results(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_organization_member(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_organization_admin(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_organization_member(id));

CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_organization_admin(id))
  WITH CHECK (is_organization_admin(id));

CREATE POLICY "Members can view organization members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (is_organization_member(organization_id));

CREATE POLICY "Admins can manage organization members"
  ON organization_members FOR ALL
  TO authenticated
  USING (is_organization_admin(organization_id))
  WITH CHECK (is_organization_admin(organization_id));

CREATE POLICY "Members can view organization environments"
  ON cloud_environments FOR SELECT
  TO authenticated
  USING (is_organization_member(organization_id));

CREATE POLICY "Admins can manage environments"
  ON cloud_environments FOR ALL
  TO authenticated
  USING (is_organization_admin(organization_id))
  WITH CHECK (is_organization_admin(organization_id));

CREATE POLICY "Members can view scan results"
  ON scan_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cloud_environments ce
      WHERE ce.id = scan_results.environment_id
      AND is_organization_member(ce.organization_id)
    )
  );

CREATE POLICY "Members can view organization audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_organization_member(organization_id));

CREATE OR REPLACE FUNCTION create_organization(
  org_name text,
  org_slug text
)
RETURNS uuid AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, auth.uid(), 'admin');

  INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    new_org_id,
    auth.uid(),
    'organization.created',
    'organization',
    new_org_id,
    jsonb_build_object('name', org_name, 'slug', org_slug)
  );

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cloud_environments_updated_at
  BEFORE UPDATE ON cloud_environments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE VIEW organization_stats AS
SELECT
  o.id as organization_id,
  o.name,
  o.plan,
  COUNT(DISTINCT om.user_id) as total_users,
  COUNT(DISTINCT ce.id) as total_environments,
  COUNT(DISTINCT CASE WHEN ce.status = 'active' THEN ce.id END) as active_environments,
  COUNT(DISTINCT sr.id) FILTER (WHERE sr.created_at > now() - interval '30 days') as scans_last_30_days,
  AVG(sr.score) FILTER (WHERE sr.completed_at > now() - interval '7 days') as avg_score_7_days
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
LEFT JOIN cloud_environments ce ON o.id = ce.organization_id
LEFT JOIN scan_results sr ON ce.id = sr.environment_id AND sr.status = 'completed'
GROUP BY o.id, o.name, o.plan;