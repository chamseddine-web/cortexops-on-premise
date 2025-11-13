/*
  # Stripe Subscriptions and Payment Management

  1. New Tables
    - `stripe_customers`
      - Links Supabase users to Stripe customers
      - Stores customer ID and email

    - `stripe_subscriptions`
      - Tracks active subscriptions
      - Stores subscription status, plan, billing periods

    - `payment_history`
      - Complete payment history
      - Invoices, amounts, status

  2. Security
    - Enable RLS on all tables
    - Users can only view their own data
    - Service role can manage all data

  3. Functions
    - Helper functions for subscription management
*/

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_customer_id ON stripe_customers(stripe_customer_id);

-- RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customer data"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create stripe_subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id text NOT NULL UNIQUE,
  customer_id text NOT NULL,
  status text NOT NULL,
  price_id text NOT NULL,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_id ON stripe_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_subscription_id ON stripe_subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(status);

-- RLS
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);

-- RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get active subscription
CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id uuid)
RETURNS TABLE (
  subscription_id text,
  status text,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.subscription_id,
    s.status,
    s.price_id,
    s.current_period_end,
    s.cancel_at_period_end
  FROM stripe_subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment history
CREATE OR REPLACE FUNCTION get_payment_history(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE (
  invoice_id text,
  amount numeric,
  currency text,
  status text,
  paid_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.stripe_invoice_id,
    p.amount,
    p.currency,
    p.status,
    p.created_at
  FROM payment_history p
  WHERE p.user_id = p_user_id
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_has_sub boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM stripe_subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
      AND current_period_end > now()
  ) INTO v_has_sub;

  RETURN v_has_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription stats
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS TABLE (
  total_active bigint,
  total_revenue numeric,
  mrr numeric,
  churn_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'active')::bigint as total_active,
    COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0) as total_revenue,
    COALESCE(SUM(amount) FILTER (
      WHERE status = 'succeeded'
      AND created_at >= date_trunc('month', CURRENT_DATE)
    ), 0) as mrr,
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'active') > 0 THEN
        (COUNT(*) FILTER (WHERE status = 'canceled' AND canceled_at >= date_trunc('month', CURRENT_DATE))::numeric /
         COUNT(*) FILTER (WHERE status = 'active')::numeric * 100)
      ELSE 0
    END as churn_rate
  FROM (
    SELECT s.status, s.canceled_at, p.amount, p.status as payment_status, p.created_at
    FROM stripe_subscriptions s
    LEFT JOIN payment_history p ON s.user_id = p.user_id
  ) combined;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_history TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_stats TO authenticated;

-- Update user_profiles to track subscription status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_status text DEFAULT 'none';
  END IF;
END $$;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
