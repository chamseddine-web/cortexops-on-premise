/*
  # Système de Paiement Mollie

  ## Changements

  1. **Nouvelle Table: mollie_payments**
     - Stocke toutes les transactions Mollie
     - Tracking des paiements, abonnements, remboursements
     - Historique complet pour analytics

  2. **Nouvelle Table: mollie_subscriptions**
     - Gère les abonnements récurrents Mollie
     - Tracking du statut (active, cancelled, expired)
     - Lien vers user_profiles

  3. **Nouvelle Table: mollie_customers**
     - Stocke les customers Mollie
     - Mapping user_id ↔ mollie_customer_id
     - Metadata pour personnalisation

  4. **Sécurité**
     - RLS activé sur toutes les tables
     - Users peuvent voir leurs propres paiements/abonnements
     - Admins ont accès complet (analytics)

  5. **Indexes**
     - Performance optimale pour queries fréquentes
     - Foreign keys indexées
     - Status fields indexées

  6. **Triggers**
     - Mise à jour automatique des timestamps
     - Synchronisation user_profiles.subscription_plan
*/

-- ════════════════════════════════════════════════════════════════
-- 1. TABLE: mollie_customers
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mollie_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mollie_customer_id text NOT NULL UNIQUE,

  -- Customer info
  name text,
  email text NOT NULL,
  locale text DEFAULT 'fr_FR',

  -- Metadata
  metadata jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure one customer per user
  UNIQUE(user_id)
);

-- ════════════════════════════════════════════════════════════════
-- 2. TABLE: mollie_payments
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mollie_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mollie_customer_id text REFERENCES public.mollie_customers(mollie_customer_id) ON DELETE SET NULL,

  -- Mollie payment info
  mollie_payment_id text NOT NULL UNIQUE,
  mollie_subscription_id text,

  -- Payment details
  amount_value numeric(10, 2) NOT NULL,
  amount_currency text NOT NULL DEFAULT 'EUR',
  description text NOT NULL,

  -- Status tracking
  status text NOT NULL CHECK (status IN (
    'open', 'pending', 'authorized', 'expired',
    'failed', 'canceled', 'paid', 'refunded'
  )),

  -- Payment method
  method text CHECK (method IN (
    'creditcard', 'paypal', 'banktransfer', 'ideal',
    'sofort', 'giropay', 'eps', 'przelewy24'
  )),

  -- URLs
  checkout_url text,
  redirect_url text,
  webhook_url text,

  -- Dates
  paid_at timestamptz,
  expired_at timestamptz,
  failed_at timestamptz,
  canceled_at timestamptz,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ════════════════════════════════════════════════════════════════
-- 3. TABLE: mollie_subscriptions
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mollie_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mollie_customer_id text NOT NULL REFERENCES public.mollie_customers(mollie_customer_id) ON DELETE CASCADE,

  -- Mollie subscription info
  mollie_subscription_id text NOT NULL UNIQUE,

  -- Subscription details
  plan_name text NOT NULL CHECK (plan_name IN ('free', 'pro', 'team', 'enterprise')),
  amount_value numeric(10, 2) NOT NULL,
  amount_currency text NOT NULL DEFAULT 'EUR',
  interval text NOT NULL CHECK (interval IN ('1 month', '3 months', '1 year')),

  -- Status tracking
  status text NOT NULL CHECK (status IN (
    'active', 'pending', 'canceled', 'suspended', 'completed'
  )),

  -- Dates
  start_date timestamptz NOT NULL,
  next_payment_date timestamptz,
  canceled_at timestamptz,

  -- Metadata
  description text,
  metadata jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ════════════════════════════════════════════════════════════════
-- 4. TABLE: mollie_webhooks
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mollie_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook info
  mollie_payment_id text,
  mollie_subscription_id text,
  event_type text NOT NULL,

  -- Raw data
  payload jsonb NOT NULL,

  -- Processing
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error_message text,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ════════════════════════════════════════════════════════════════
-- 5. INDEXES
-- ════════════════════════════════════════════════════════════════

-- mollie_customers
CREATE INDEX IF NOT EXISTS idx_mollie_customers_user_id
ON public.mollie_customers(user_id);

CREATE INDEX IF NOT EXISTS idx_mollie_customers_mollie_id
ON public.mollie_customers(mollie_customer_id);

-- mollie_payments
CREATE INDEX IF NOT EXISTS idx_mollie_payments_user_id
ON public.mollie_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_mollie_payments_mollie_id
ON public.mollie_payments(mollie_payment_id);

CREATE INDEX IF NOT EXISTS idx_mollie_payments_status
ON public.mollie_payments(status);

CREATE INDEX IF NOT EXISTS idx_mollie_payments_customer_id
ON public.mollie_payments(mollie_customer_id);

CREATE INDEX IF NOT EXISTS idx_mollie_payments_created_at
ON public.mollie_payments(created_at DESC);

-- mollie_subscriptions
CREATE INDEX IF NOT EXISTS idx_mollie_subscriptions_user_id
ON public.mollie_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_mollie_subscriptions_mollie_id
ON public.mollie_subscriptions(mollie_subscription_id);

CREATE INDEX IF NOT EXISTS idx_mollie_subscriptions_status
ON public.mollie_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_mollie_subscriptions_customer_id
ON public.mollie_subscriptions(mollie_customer_id);

-- mollie_webhooks
CREATE INDEX IF NOT EXISTS idx_mollie_webhooks_payment_id
ON public.mollie_webhooks(mollie_payment_id);

CREATE INDEX IF NOT EXISTS idx_mollie_webhooks_subscription_id
ON public.mollie_webhooks(mollie_subscription_id);

CREATE INDEX IF NOT EXISTS idx_mollie_webhooks_processed
ON public.mollie_webhooks(processed, created_at);

-- ════════════════════════════════════════════════════════════════
-- 6. ENABLE ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.mollie_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mollie_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mollie_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mollie_webhooks ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════
-- 7. RLS POLICIES - mollie_customers
-- ════════════════════════════════════════════════════════════════

-- Users can view their own customer record
CREATE POLICY "Users can view own customer record"
ON public.mollie_customers
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Users can insert their own customer record
CREATE POLICY "Users can create own customer record"
ON public.mollie_customers
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own customer record
CREATE POLICY "Users can update own customer record"
ON public.mollie_customers
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Admins can view all customers
CREATE POLICY "Admins can view all customers"
ON public.mollie_customers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- ════════════════════════════════════════════════════════════════
-- 8. RLS POLICIES - mollie_payments
-- ════════════════════════════════════════════════════════════════

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
ON public.mollie_payments
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Service role can insert payments (from Edge Function)
CREATE POLICY "Service role can create payments"
ON public.mollie_payments
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- Service role can update payments (webhooks)
CREATE POLICY "Service role can update payments"
ON public.mollie_payments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.mollie_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- ════════════════════════════════════════════════════════════════
-- 9. RLS POLICIES - mollie_subscriptions
-- ════════════════════════════════════════════════════════════════

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.mollie_subscriptions
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Service role can insert subscriptions
CREATE POLICY "Service role can create subscriptions"
ON public.mollie_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- Service role can update subscriptions
CREATE POLICY "Service role can update subscriptions"
ON public.mollie_subscriptions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.mollie_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- ════════════════════════════════════════════════════════════════
-- 10. RLS POLICIES - mollie_webhooks
-- ════════════════════════════════════════════════════════════════

-- Service role can insert webhooks
CREATE POLICY "Service role can insert webhooks"
ON public.mollie_webhooks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Service role can update webhooks
CREATE POLICY "Service role can update webhooks"
ON public.mollie_webhooks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Admins can view all webhooks
CREATE POLICY "Admins can view all webhooks"
ON public.mollie_webhooks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- ════════════════════════════════════════════════════════════════
-- 11. TRIGGERS - Updated At
-- ════════════════════════════════════════════════════════════════

-- Réutiliser la fonction existante
CREATE TRIGGER update_mollie_customers_updated_at
BEFORE UPDATE ON public.mollie_customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mollie_payments_updated_at
BEFORE UPDATE ON public.mollie_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mollie_subscriptions_updated_at
BEFORE UPDATE ON public.mollie_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════
-- 12. TRIGGER - Sync user_profiles.subscription_plan
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_user_subscription_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Mettre à jour le plan dans user_profiles quand un abonnement devient actif
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    UPDATE user_profiles
    SET
      subscription_plan = NEW.plan_name::text,
      subscription_status = 'active',
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;

  -- Mettre à jour le statut quand l'abonnement est annulé/expiré
  IF NEW.status IN ('canceled', 'completed', 'suspended') AND OLD.status = 'active' THEN
    UPDATE user_profiles
    SET
      subscription_status = NEW.status::text,
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_subscription_plan_on_change
AFTER INSERT OR UPDATE ON public.mollie_subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_user_subscription_plan();

-- ════════════════════════════════════════════════════════════════
-- 13. HELPER FUNCTIONS
-- ════════════════════════════════════════════════════════════════

-- Fonction pour obtenir les stats de paiement
CREATE OR REPLACE FUNCTION get_payment_stats(time_period text DEFAULT '30 days')
RETURNS TABLE(
  total_revenue numeric,
  total_transactions bigint,
  successful_payments bigint,
  failed_payments bigint,
  active_subscriptions bigint,
  new_customers bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH payment_stats AS (
    SELECT
      COALESCE(SUM(amount_value) FILTER (WHERE status = 'paid'), 0) as revenue,
      COUNT(*) as total_txns,
      COUNT(*) FILTER (WHERE status = 'paid') as successful,
      COUNT(*) FILTER (WHERE status IN ('failed', 'expired', 'canceled')) as failed
    FROM mollie_payments
    WHERE created_at > now() - time_period::interval
  ),
  subscription_stats AS (
    SELECT COUNT(*) as active_subs
    FROM mollie_subscriptions
    WHERE status = 'active'
  ),
  customer_stats AS (
    SELECT COUNT(*) as new_custs
    FROM mollie_customers
    WHERE created_at > now() - time_period::interval
  )
  SELECT
    ps.revenue,
    ps.total_txns,
    ps.successful,
    ps.failed,
    ss.active_subs,
    cs.new_custs
  FROM payment_stats ps, subscription_stats ss, customer_stats cs;
END;
$$;

-- Fonction pour obtenir l'abonnement actif d'un user
CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id uuid)
RETURNS TABLE(
  subscription_id uuid,
  plan_name text,
  status text,
  amount_value numeric,
  next_payment_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id,
    ms.plan_name,
    ms.status,
    ms.amount_value,
    ms.next_payment_date
  FROM mollie_subscriptions ms
  WHERE ms.user_id = p_user_id
  AND ms.status = 'active'
  ORDER BY ms.created_at DESC
  LIMIT 1;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 14. GRANT PERMISSIONS
-- ════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION get_payment_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_subscription(uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- 15. COMMENTS
-- ════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.mollie_customers IS
'Stocke les customers Mollie liés aux users CortexOps';

COMMENT ON TABLE public.mollie_payments IS
'Historique complet de tous les paiements Mollie (one-time et subscription)';

COMMENT ON TABLE public.mollie_subscriptions IS
'Gère les abonnements récurrents Mollie avec synchronisation user_profiles';

COMMENT ON TABLE public.mollie_webhooks IS
'Log de tous les webhooks reçus de Mollie pour audit et debugging';

COMMENT ON FUNCTION sync_user_subscription_plan() IS
'Synchronise automatiquement le plan d''abonnement dans user_profiles quand le statut Mollie change';

COMMENT ON FUNCTION get_payment_stats(text) IS
'Retourne les statistiques de paiement pour la période spécifiée (default: 30 jours)';

COMMENT ON FUNCTION get_active_subscription(uuid) IS
'Retourne l''abonnement actif d''un utilisateur (si existant)';
