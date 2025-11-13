/*
  # Schema d'authentification et abonnements Freemium/SaaS
  
  1. Tables créées
    - `user_profiles`
      - `id` (uuid, FK vers auth.users)
      - `email` (text)
      - `full_name` (text)
      - `subscription_plan` (text: 'free', 'pro', 'enterprise')
      - `subscription_status` (text: 'active', 'cancelled', 'expired')
      - `subscription_start_date` (timestamptz)
      - `subscription_end_date` (timestamptz)
      - `playbooks_generated_this_month` (integer)
      - `last_reset_date` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `subscription_plans`
      - `id` (uuid)
      - `name` (text: 'free', 'pro', 'enterprise')
      - `display_name` (text)
      - `price_monthly` (decimal)
      - `playbooks_per_month` (integer, NULL = unlimited)
      - `features` (jsonb)
      - `created_at` (timestamptz)
    
    - `playbook_generations`
      - `id` (uuid)
      - `user_id` (uuid)
      - `prompt` (text)
      - `generated_content` (text)
      - `generation_type` (text)
      - `created_at` (timestamptz)
  
  2. Sécurité
    - Enable RLS sur toutes les tables
    - Policies pour l'accès utilisateur uniquement à ses propres données
*/

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  subscription_plan text NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
  subscription_start_date timestamptz DEFAULT now(),
  subscription_end_date timestamptz,
  playbooks_generated_this_month integer DEFAULT 0,
  last_reset_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Table des plans d'abonnement
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name IN ('free', 'pro', 'enterprise')),
  display_name text NOT NULL,
  price_monthly numeric(10, 2) NOT NULL,
  playbooks_per_month integer,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (true);

-- Table des générations de playbooks
CREATE TABLE IF NOT EXISTS playbook_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  generated_content text NOT NULL,
  generation_type text NOT NULL CHECK (generation_type IN ('intelligent', 'security', 'roles', 'kubernetes', 'cloud')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE playbook_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own playbook generations"
  ON playbook_generations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playbook generations"
  ON playbook_generations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insérer les plans par défaut
INSERT INTO subscription_plans (name, display_name, price_monthly, playbooks_per_month, features)
VALUES 
  ('free', 'Version Gratuite', 0.00, 3, '[
    "3 playbooks par mois",
    "Générateur intelligent",
    "Templates de base",
    "Support communauté"
  ]'::jsonb),
  ('pro', 'Version Pro', 9.90, NULL, '[
    "Playbooks illimités",
    "Export Git",
    "Historique complet",
    "Personnalisation avancée",
    "Support prioritaire",
    "Tous les générateurs"
  ]'::jsonb),
  ('enterprise', 'Version Entreprise', 49.00, NULL, '[
    "Tout de Pro +",
    "Intégration LDAP",
    "API REST complète",
    "Multi-utilisateurs",
    "SSO (Single Sign-On)",
    "Support dédié 24/7",
    "SLA garanti",
    "Audit et conformité"
  ]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Fonction pour réinitialiser le compteur mensuel
CREATE OR REPLACE FUNCTION reset_monthly_playbook_counter()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles
  SET 
    playbooks_generated_this_month = 0,
    last_reset_date = CURRENT_DATE
  WHERE last_reset_date < DATE_TRUNC('month', CURRENT_DATE);
END;
$$;

-- Fonction pour vérifier si l'utilisateur peut générer un playbook
CREATE OR REPLACE FUNCTION can_generate_playbook(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan text;
  v_count integer;
  v_limit integer;
  v_status text;
BEGIN
  -- Récupérer les infos du profil
  SELECT 
    subscription_plan,
    playbooks_generated_this_month,
    subscription_status
  INTO v_plan, v_count, v_status
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- Vérifier que l'abonnement est actif
  IF v_status != 'active' THEN
    RETURN false;
  END IF;
  
  -- Les plans Pro et Enterprise ont un accès illimité
  IF v_plan IN ('pro', 'enterprise') THEN
    RETURN true;
  END IF;
  
  -- Pour le plan gratuit, vérifier la limite
  IF v_plan = 'free' THEN
    SELECT playbooks_per_month INTO v_limit
    FROM subscription_plans
    WHERE name = 'free';
    
    RETURN v_count < v_limit;
  END IF;
  
  RETURN false;
END;
$$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_playbook_generations_user_id ON playbook_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_playbook_generations_created_at ON playbook_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_plan ON user_profiles(subscription_plan);
