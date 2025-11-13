/*
  # Système de monétisation - Tables principales

  1. Nouvelles Tables
    - `subscription_plans` : Plans disponibles
    - `api_keys` : Clés API
    - `api_usage` : Utilisation API
    - `payment_history` : Historique paiements

  2. Sécurité
    - RLS activé sur toutes les tables
    - Policies restrictives
*/

-- Table des plans
CREATE TABLE subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  display_name text NOT NULL,
  description text,
  price_monthly numeric(10,2) DEFAULT 0,
  price_yearly numeric(10,2) DEFAULT 0,
  playbooks_per_month integer,
  playbooks_per_day integer,
  api_calls_per_month integer,
  api_calls_per_day integer,
  features jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy après création de la colonne
CREATE POLICY "Plans visibles pour authentifiés"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (true);

-- Données de base
INSERT INTO subscription_plans (id, name, display_name, description, price_monthly, price_yearly, playbooks_per_month, playbooks_per_day, api_calls_per_month, api_calls_per_day, features)
VALUES
  ('free', 'free', 'Gratuit', 'Pour découvrir CortexOps', 0, 0, 3, 3, 0, 0, 
   '["Génération basique", "3 playbooks/jour", "Templates standards", "Export YAML"]'::jsonb),
  ('pro', 'pro', 'Pro', 'Pour développeurs pro', 15, 150, NULL, NULL, 100, 10, 
   '["Playbooks illimités", "Templates avancés", "Export multi-format", "Support prioritaire", "CLI Access"]'::jsonb),
  ('enterprise', 'enterprise', 'Enterprise', 'Pour équipes', 300, 3000, NULL, NULL, NULL, NULL, 
   '["Tout Pro", "API REST", "Webhooks", "Multi-users", "SLA 99.9%", "Support dédié"]'::jsonb);

-- Table API keys
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_preview text NOT NULL,
  permissions jsonb DEFAULT '["generate_playbook"]'::jsonb,
  active boolean DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own keys"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own keys"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own keys"
  ON api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Table usage API
CREATE TABLE api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  response_time_ms integer,
  tokens_used integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usage"
  ON api_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_api_usage_user ON api_usage(user_id, created_at DESC);
CREATE INDEX idx_api_usage_key ON api_usage(api_key_id, created_at DESC);

-- Table paiements
CREATE TABLE payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id text REFERENCES subscription_plans(id),
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  stripe_payment_id text,
  stripe_invoice_id text,
  status text DEFAULT 'pending',
  payment_method text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments"
  ON payment_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Colonnes additionnelles user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS api_quota_daily integer DEFAULT 3;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS api_calls_today integer DEFAULT 0;
