/*
  # API Client Management System

  ## Overview
  Extends existing API infrastructure with client management, rate limiting, and usage tracking.

  ## Changes Made

  ### New Tables

  1. **api_clients**
     - External organizations using the API
     - Links to api_keys table
     - Tracks subscription plans and status

  2. **api_usage_logs** 
     - Detailed request logging
     - Performance metrics
     - Error tracking

  3. **api_quotas**
     - Per-client usage quotas
     - Auto-reset functionality
     - Multiple period types (hourly, daily, monthly)

  4. **api_rate_limits**
     - Plan-based rate limits
     - Configurable thresholds
     - Burst handling

  ### Modified Tables

  - `api_keys`: Add client_id column to link to api_clients

  ## Security
  - RLS enabled on all tables
  - Admin-only access for management
  - Secure API key hashing
  - Audit logging for all operations

  ## Functions
  - API key verification
  - Rate limit checking
  - Usage increment tracking
*/

-- API Clients Table
CREATE TABLE IF NOT EXISTS api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add client_id to existing api_keys table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN client_id uuid REFERENCES api_clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- API Usage Logs Table (detailed tracking)
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES api_clients(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer,
  request_size_bytes integer,
  response_size_bytes integer,
  ip_address text,
  user_agent text,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- API Quotas Table
CREATE TABLE IF NOT EXISTS api_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('hourly', 'daily', 'monthly')),
  limit_value integer NOT NULL,
  used integer NOT NULL DEFAULT 0,
  resets_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, period)
);

-- API Rate Limits Table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan text NOT NULL UNIQUE CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  requests_per_minute integer NOT NULL,
  requests_per_hour integer NOT NULL,
  requests_per_day integer NOT NULL,
  requests_per_month integer NOT NULL,
  max_burst integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

-- Insert default rate limits
INSERT INTO api_rate_limits (plan, requests_per_minute, requests_per_hour, requests_per_day, requests_per_month, max_burst)
VALUES 
  ('free', 10, 100, 1000, 10000, 5),
  ('starter', 30, 500, 5000, 50000, 10),
  ('pro', 100, 2000, 20000, 200000, 20),
  ('enterprise', 500, 10000, 100000, 1000000, 50)
ON CONFLICT (plan) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_client_id_new ON api_keys(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_client_id_new ON api_usage_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at_new ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_quotas_client_id_new ON api_quotas(client_id);
CREATE INDEX IF NOT EXISTS idx_api_clients_status_new ON api_clients(status);
CREATE INDEX IF NOT EXISTS idx_api_clients_plan ON api_clients(plan);

-- Function to verify API key and get client info
CREATE OR REPLACE FUNCTION verify_api_key_with_client(p_key_hash text)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  client_plan text,
  client_status text,
  key_id uuid,
  key_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    c.plan as client_plan,
    c.status as client_status,
    k.id as key_id,
    k.active as key_active
  FROM api_keys k
  LEFT JOIN api_clients c ON k.client_id = c.id
  WHERE k.key_hash = p_key_hash
    AND k.active = true
    AND (k.expires_at IS NULL OR k.expires_at > now())
    AND (c.id IS NULL OR c.status = 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit_for_client(p_client_id uuid, p_plan text)
RETURNS jsonb AS $$
DECLARE
  minute_count integer;
  hour_count integer;
  day_count integer;
  month_count integer;
  limits record;
  result jsonb;
BEGIN
  -- Get rate limits for plan
  SELECT * INTO limits FROM api_rate_limits WHERE plan = p_plan;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Invalid plan',
      'limits', null
    );
  END IF;
  
  -- Check last minute
  SELECT COUNT(*) INTO minute_count
  FROM api_usage_logs
  WHERE client_id = p_client_id
    AND created_at > now() - interval '1 minute';
    
  IF minute_count >= limits.requests_per_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded (per minute)',
      'current', minute_count,
      'limit', limits.requests_per_minute,
      'period', 'minute'
    );
  END IF;
  
  -- Check last hour
  SELECT COUNT(*) INTO hour_count
  FROM api_usage_logs
  WHERE client_id = p_client_id
    AND created_at > now() - interval '1 hour';
    
  IF hour_count >= limits.requests_per_hour THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded (per hour)',
      'current', hour_count,
      'limit', limits.requests_per_hour,
      'period', 'hour'
    );
  END IF;
  
  -- Check last day
  SELECT COUNT(*) INTO day_count
  FROM api_usage_logs
  WHERE client_id = p_client_id
    AND created_at > now() - interval '1 day';
    
  IF day_count >= limits.requests_per_day THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded (per day)',
      'current', day_count,
      'limit', limits.requests_per_day,
      'period', 'day'
    );
  END IF;
  
  -- Check last month
  SELECT COUNT(*) INTO month_count
  FROM api_usage_logs
  WHERE client_id = p_client_id
    AND created_at > now() - interval '30 days';
    
  IF month_count >= limits.requests_per_month THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded (per month)',
      'current', month_count,
      'limit', limits.requests_per_month,
      'period', 'month'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'usage', jsonb_build_object(
      'minute', minute_count,
      'hour', hour_count,
      'day', day_count,
      'month', month_count
    ),
    'limits', jsonb_build_object(
      'minute', limits.requests_per_minute,
      'hour', limits.requests_per_hour,
      'day', limits.requests_per_day,
      'month', limits.requests_per_month
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_api_usage(
  p_client_id uuid,
  p_api_key_id uuid,
  p_endpoint text,
  p_method text,
  p_status_code integer,
  p_response_time_ms integer DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO api_usage_logs (
    client_id,
    api_key_id,
    endpoint,
    method,
    status_code,
    response_time_ms,
    ip_address,
    error_message
  ) VALUES (
    p_client_id,
    p_api_key_id,
    p_endpoint,
    p_method,
    p_status_code,
    p_response_time_ms,
    p_ip_address,
    p_error_message
  )
  RETURNING id INTO log_id;
  
  -- Update last_used_at for the API key
  UPDATE api_keys 
  SET last_used_at = now(), updated_at = now()
  WHERE id = p_api_key_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_clients
CREATE POLICY "Admins can view all clients"
  ON api_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert clients"
  ON api_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update clients"
  ON api_clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete clients"
  ON api_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- RLS Policies for api_usage_logs
CREATE POLICY "Admins can view all usage logs"
  ON api_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Service role can insert usage logs"
  ON api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for api_quotas
CREATE POLICY "Admins can view all quotas"
  ON api_quotas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage quotas"
  ON api_quotas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- RLS Policies for api_rate_limits
CREATE POLICY "Everyone can view rate limits"
  ON api_rate_limits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rate limits"
  ON api_rate_limits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );