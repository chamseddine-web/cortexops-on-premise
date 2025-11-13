/*
  # Schéma Multi-Tenant pour Entreprises

  1. Nouvelles Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text) - Nom de l'organisation
      - `slug` (text, unique) - Identifiant URL-friendly
      - `plan` (text) - Plan d'abonnement (free, starter, business, enterprise)
      - `max_users` (integer) - Nombre max d'utilisateurs
      - `max_environments` (integer) - Nombre max d'environnements
      - `settings` (jsonb) - Paramètres personnalisés
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `organization_members`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key auth.users)
      - `role` (text) - admin, member, viewer
      - `invited_by` (uuid)
      - `joined_at` (timestamptz)

    - `cloud_environments`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `name` (text) - Nom de l'environnement
      - `provider` (text) - aws, azure, gcp, kubernetes
      - `region` (text) - Région cloud
      - `status` (text) - active, inactive, error
      - `credentials_encrypted` (text) - Credentials chiffrés
      - `metadata` (jsonb) - Infos supplémentaires
      - `last_scan_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `scan_results`
      - `id` (uuid, primary key)
      - `environment_id` (uuid, foreign key)
      - `scan_type` (text) - security, compliance, performance, cost
      - `status` (text) - running, completed, failed
      - `results` (jsonb) - Résultats détaillés
      - `score` (integer) - Score global /100
      - `issues_critical` (integer)
      - `issues_high` (integer)
      - `issues_medium` (integer)
      - `issues_low` (integer)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `audit_logs`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `action` (text) - Action effectuée
      - `resource_type` (text) - Type de ressource
      - `resource_id` (uuid) - ID de la ressource
      - `details` (jsonb) - Détails de l'action
      - `ip_address` (inet)
      - `user_agent` (text)
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques basées sur l'appartenance à l'organisation
    - Isolation complète des données entre organisations
*/

-- Table des organisations
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

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);

-- Table des membres d'organisation
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

-- Table des environnements cloud
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

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_cloud_env_org ON cloud_environments(organization_id);
CREATE INDEX IF NOT EXISTS idx_cloud_env_provider ON cloud_environments(provider);
CREATE INDEX IF NOT EXISTS idx_cloud_env_status ON cloud_environments(status);

-- Table des résultats de scan
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

-- Index pour historique et statistiques
CREATE INDEX IF NOT EXISTS idx_scan_results_env ON scan_results(environment_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_type ON scan_results(scan_type);
CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status);
CREATE INDEX IF NOT EXISTS idx_scan_results_created ON scan_results(created_at DESC);

-- Table des logs d'audit
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

-- Index pour recherche et reporting
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Fonction helper pour vérifier l'appartenance à une organisation
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

-- Fonction helper pour vérifier le rôle admin
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

-- RLS Policies pour organizations
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (is_organization_member(id));

CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_organization_admin(id))
  WITH CHECK (is_organization_admin(id));

-- RLS Policies pour organization_members
CREATE POLICY "Members can view organization members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (is_organization_member(organization_id));

CREATE POLICY "Admins can manage organization members"
  ON organization_members FOR ALL
  TO authenticated
  USING (is_organization_admin(organization_id))
  WITH CHECK (is_organization_admin(organization_id));

-- RLS Policies pour cloud_environments
CREATE POLICY "Members can view organization environments"
  ON cloud_environments FOR SELECT
  TO authenticated
  USING (is_organization_member(organization_id));

CREATE POLICY "Admins can manage environments"
  ON cloud_environments FOR ALL
  TO authenticated
  USING (is_organization_admin(organization_id))
  WITH CHECK (is_organization_admin(organization_id));

-- RLS Policies pour scan_results
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

-- RLS Policies pour audit_logs
CREATE POLICY "Members can view organization audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_organization_member(organization_id));

-- Fonction pour créer une organisation avec l'utilisateur comme admin
CREATE OR REPLACE FUNCTION create_organization(
  org_name text,
  org_slug text
)
RETURNS uuid AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Créer l'organisation
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Ajouter l'utilisateur actuel comme admin
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, auth.uid(), 'admin');

  -- Log l'action
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

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cloud_environments_updated_at
  BEFORE UPDATE ON cloud_environments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Vue pour statistiques d'organisation
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
