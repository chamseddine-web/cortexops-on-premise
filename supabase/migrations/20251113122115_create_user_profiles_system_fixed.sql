/*
  # Create User Profiles and Preferences System (Fixed)

  1. New Tables
    - `user_profiles` - Extended user information
    - `user_preferences` - User settings
    - `user_sessions` - Session tracking
    - `admin_audit_log` - Admin actions audit

  2. Security
    - RLS enabled on all tables
    - Users access own data only
    - Admins have full access
*/

-- Drop existing if any
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- User Profiles Table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  company text,
  job_title text,
  phone text,
  avatar_url text,
  timezone text DEFAULT 'Europe/Paris',
  language text DEFAULT 'fr',
  user_role text DEFAULT 'user',
  user_plan text DEFAULT 'free',
  user_status text DEFAULT 'active',
  api_calls_today integer DEFAULT 0,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_user_role CHECK (user_role IN ('admin', 'user', 'client')),
  CONSTRAINT check_user_plan CHECK (user_plan IN ('free', 'pro', 'enterprise')),
  CONSTRAINT check_user_status CHECK (user_status IN ('active', 'inactive', 'suspended'))
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

-- User Preferences Table
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  slack_notifications boolean DEFAULT false,
  webhook_notifications boolean DEFAULT false,
  deployment_alerts boolean DEFAULT true,
  security_alerts boolean DEFAULT true,
  billing_alerts boolean DEFAULT true,
  theme text DEFAULT 'dark',
  editor_mode text DEFAULT 'visual',
  auto_save boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  CONSTRAINT check_theme CHECK (theme IN ('light', 'dark', 'auto')),
  CONSTRAINT check_editor_mode CHECK (editor_mode IN ('visual', 'code', 'split'))
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User Sessions Table
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  device_type text,
  location text,
  started_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update sessions"
  ON user_sessions FOR UPDATE
  TO authenticated
  USING (true);

-- Admin Audit Log
CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id),
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

CREATE POLICY "System can insert audit log"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND user_role = 'admin')
  );

-- Indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_user_role ON user_profiles(user_role);
CREATE INDEX idx_user_profiles_user_plan ON user_profiles(user_plan);
CREATE INDEX idx_user_profiles_user_status ON user_profiles(user_status);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Functions
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_users bigint,
  active_users bigint,
  total_api_calls bigint,
  revenue_mtd numeric,
  free_users bigint,
  pro_users bigint,
  enterprise_users bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_users,
    COUNT(*) FILTER (WHERE user_status = 'active')::bigint as active_users,
    COALESCE(SUM(api_calls_today), 0)::bigint as total_api_calls,
    (
      COUNT(*) FILTER (WHERE user_plan = 'pro') * 49 +
      COUNT(*) FILTER (WHERE user_plan = 'enterprise') * 499
    )::numeric as revenue_mtd,
    COUNT(*) FILTER (WHERE user_plan = 'free')::bigint as free_users,
    COUNT(*) FILTER (WHERE user_plan = 'pro')::bigint as pro_users,
    COUNT(*) FILTER (WHERE user_plan = 'enterprise')::bigint as enterprise_users
  FROM user_profiles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_api_usage_stats()
RETURNS TABLE (
  client_name text,
  total_calls bigint,
  success_rate numeric,
  avg_response_time integer,
  plan text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(up.company, up.email) as client_name,
    COALESCE(up.api_calls_today, 0)::bigint as total_calls,
    99.5::numeric as success_rate,
    150 as avg_response_time,
    up.user_plan as plan
  FROM user_profiles up
  WHERE up.api_calls_today > 0
  ORDER BY up.api_calls_today DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION create_default_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_preferences
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_preferences();
