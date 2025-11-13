/*
  # Schéma Blueprint Enterprise Multi-Cloud

  1. Tables principales
    - `blueprints` - Templates d'architecture Enterprise
    - `blueprint_playbooks` - Playbooks orchestrés (00-50)
    - `blueprint_roles` - Rôles réutilisables
    - `blueprint_structures` - Arborescence de fichiers
    - `generated_projects` - Projets générés par utilisateur

  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies restrictives par authentification
*/

-- Table des blueprints
CREATE TABLE IF NOT EXISTS blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('enterprise', 'standard', 'starter')),
  structure jsonb NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blueprints are viewable by authenticated users"
  ON blueprints FOR SELECT
  TO authenticated
  USING (true);

-- Table des playbooks
CREATE TABLE IF NOT EXISTS blueprint_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid REFERENCES blueprints(id) ON DELETE CASCADE,
  sequence_number int NOT NULL,
  name text NOT NULL,
  description text,
  content text NOT NULL,
  dependencies text[] DEFAULT '{}',
  roles_used text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blueprint_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Playbooks are viewable by authenticated users"
  ON blueprint_playbooks FOR SELECT
  TO authenticated
  USING (true);

-- Table des rôles
CREATE TABLE IF NOT EXISTS blueprint_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid REFERENCES blueprints(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('terraform', 'network', 'k8s', 'vault', 'observability', 'app_deploy', 'cicd', 'dr_failover')),
  tasks jsonb NOT NULL,
  handlers jsonb DEFAULT '[]',
  templates jsonb DEFAULT '{}',
  vars jsonb DEFAULT '{}',
  defaults jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blueprint_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles are viewable by authenticated users"
  ON blueprint_roles FOR SELECT
  TO authenticated
  USING (true);

-- Table de la structure de fichiers
CREATE TABLE IF NOT EXISTS blueprint_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid REFERENCES blueprints(id) ON DELETE CASCADE,
  path text NOT NULL,
  type text NOT NULL CHECK (type IN ('directory', 'file')),
  content text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blueprint_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Structures are viewable by authenticated users"
  ON blueprint_structures FOR SELECT
  TO authenticated
  USING (true);

-- Table des projets générés
CREATE TABLE IF NOT EXISTS generated_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  blueprint_id uuid REFERENCES blueprints(id),
  name text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('staging', 'production')),
  configuration jsonb NOT NULL,
  files jsonb NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'deployed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE generated_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON generated_projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON generated_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON generated_projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON generated_projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_blueprints_category ON blueprints(category);
CREATE INDEX IF NOT EXISTS idx_playbooks_blueprint ON blueprint_playbooks(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_sequence ON blueprint_playbooks(sequence_number);
CREATE INDEX IF NOT EXISTS idx_roles_blueprint ON blueprint_roles(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_roles_category ON blueprint_roles(category);
CREATE INDEX IF NOT EXISTS idx_structures_blueprint ON blueprint_structures(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON generated_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON generated_projects(status);

-- Insérer le blueprint Enterprise par défaut
INSERT INTO blueprints (name, description, category, structure) VALUES
(
  'Multi-Cloud Orchestration Enterprise',
  'Architecture complète Terraform + Ansible + Kubernetes + Vault + Observabilité + CI/CD + DR',
  'enterprise',
  '{
    "inventories": ["staging", "production"],
    "playbooks": ["00_init_tf", "10_network_tf_apply", "20_k8s_manage", "30_platform_basics", "40_app_delivery", "50_dr_failover"],
    "roles": ["terraform", "network", "k8s", "vault", "observability", "app_deploy", "cicd", "dr_failover"],
    "terraform_modules": ["network_aws", "network_azure", "network_gcp", "eks", "aks", "gke"]
  }'
);
