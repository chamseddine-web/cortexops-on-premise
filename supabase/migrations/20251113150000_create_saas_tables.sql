/*
  # Create SaaS Application Tables

  1. New Tables
    - `generated_playbooks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `playbook_yaml` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `api_usage_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `endpoint` (text)
      - `success` (boolean)
      - `response_time_ms` (integer)
      - `timestamp` (timestamptz)

    - `user_preferences`
      - `user_id` (uuid, primary key, foreign key to auth.users)
      - `email_notifications` (boolean)
      - `slack_notifications` (boolean)
      - `webhook_notifications` (boolean)
      - `deployment_alerts` (boolean)
      - `security_alerts` (boolean)
      - `billing_alerts` (boolean)
      - `updated_at` (timestamptz)

  2. Modifications
    - Add onboarding fields to `user_profiles` table

  3. Security
    - Enable RLS on all tables
    - Add policies for user data access
*/

-- Create generated_playbooks table
CREATE TABLE IF NOT EXISTS generated_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  playbook_yaml text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_generated_playbooks_user_id ON generated_playbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_playbooks_created_at ON generated_playbooks(created_at);

-- Enable RLS
ALTER TABLE generated_playbooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_playbooks
CREATE POLICY "Users can view own playbooks"
  ON generated_playbooks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playbooks"
  ON generated_playbooks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playbooks"
  ON generated_playbooks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create api_usage_logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  success boolean DEFAULT true,
  response_time_ms integer DEFAULT 0,
  timestamp timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_timestamp ON api_usage_logs(user_id, timestamp);

-- Enable RLS
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage_logs
CREATE POLICY "Users can view own API logs"
  ON api_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert API logs"
  ON api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  slack_notifications boolean DEFAULT false,
  webhook_notifications boolean DEFAULT false,
  deployment_alerts boolean DEFAULT true,
  security_alerts boolean DEFAULT true,
  billing_alerts boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add onboarding fields to user_profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_data'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_data jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'company_size'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN company_size text;
  END IF;
END $$;

-- Function to get API usage stats for dashboard
CREATE OR REPLACE FUNCTION get_user_usage_stats(p_user_id uuid, p_start_date timestamptz DEFAULT NULL)
RETURNS TABLE (
  playbooks_count bigint,
  api_calls_count bigint,
  storage_used_bytes bigint,
  avg_response_time_ms numeric,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH playbook_stats AS (
    SELECT
      COUNT(*) as pb_count,
      COALESCE(SUM(LENGTH(playbook_yaml)), 0) as total_bytes
    FROM generated_playbooks
    WHERE user_id = p_user_id
      AND (p_start_date IS NULL OR created_at >= p_start_date)
  ),
  api_stats AS (
    SELECT
      COUNT(*) as api_count,
      AVG(response_time_ms)::numeric as avg_time,
      (COUNT(*) FILTER (WHERE success = true)::numeric / NULLIF(COUNT(*), 0) * 100)::numeric as success_pct
    FROM api_usage_logs
    WHERE user_id = p_user_id
      AND (p_start_date IS NULL OR timestamp >= p_start_date)
  )
  SELECT
    COALESCE(pb.pb_count, 0)::bigint,
    COALESCE(api.api_count, 0)::bigint,
    COALESCE(pb.total_bytes, 0)::bigint,
    COALESCE(api.avg_time, 0)::numeric,
    COALESCE(api.success_pct, 0)::numeric
  FROM playbook_stats pb
  CROSS JOIN api_stats api;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily usage for charts
CREATE OR REPLACE FUNCTION get_daily_usage(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  date date,
  playbooks_count bigint,
  api_calls_count bigint,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (p_days || ' days')::interval,
      CURRENT_DATE,
      '1 day'::interval
    )::date as date
  ),
  daily_playbooks AS (
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count
    FROM generated_playbooks
    WHERE user_id = p_user_id
      AND created_at >= CURRENT_DATE - (p_days || ' days')::interval
    GROUP BY DATE(created_at)
  ),
  daily_api AS (
    SELECT
      DATE(timestamp) as date,
      COUNT(*) as count,
      (COUNT(*) FILTER (WHERE success = true)::numeric / NULLIF(COUNT(*), 0) * 100)::numeric as success_pct
    FROM api_usage_logs
    WHERE user_id = p_user_id
      AND timestamp >= CURRENT_DATE - (p_days || ' days')::interval
    GROUP BY DATE(timestamp)
  )
  SELECT
    ds.date,
    COALESCE(dp.count, 0)::bigint as playbooks_count,
    COALESCE(da.count, 0)::bigint as api_calls_count,
    COALESCE(da.success_pct, 100)::numeric as success_rate
  FROM date_series ds
  LEFT JOIN daily_playbooks dp ON ds.date = dp.date
  LEFT JOIN daily_api da ON ds.date = da.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_usage TO authenticated;
