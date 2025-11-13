/*
  # Create Professional Profiles Table

  ## Changes Made

  1. **New Table: professional_profiles**
     - Stores professional/company information for users
     - Linked to auth.users via user_id foreign key
     - Includes job title, phone, company details, industry, use cases

  2. **Security**
     - Enable RLS on professional_profiles table
     - Users can only view/update their own professional profile
     - Admins can view all professional profiles

  3. **Indexes**
     - Covering index on user_id (foreign key)
     - Index on company_name for search/filtering
     - Index on industry for analytics
*/

-- ════════════════════════════════════════════════════════════════
-- 1. CREATE TABLE
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Professional Information
  job_title text,
  phone text,

  -- Company Information
  company_name text,
  company_size text CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
  industry text CHECK (industry IN (
    'technology', 'finance', 'healthcare', 'ecommerce',
    'manufacturing', 'education', 'media', 'consulting',
    'government', 'other'
  )),
  country text,

  -- Use Cases (stored as array)
  use_cases text[] DEFAULT '{}',

  -- Preferences
  newsletter_subscribed boolean DEFAULT true,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure one profile per user
  UNIQUE(user_id)
);

-- ════════════════════════════════════════════════════════════════
-- 2. CREATE INDEXES
-- ════════════════════════════════════════════════════════════════

-- Foreign key index (performance)
CREATE INDEX IF NOT EXISTS idx_professional_profiles_user_id
ON public.professional_profiles(user_id);

-- Search/Filter indexes
CREATE INDEX IF NOT EXISTS idx_professional_profiles_company_name
ON public.professional_profiles(company_name);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_industry
ON public.professional_profiles(industry);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_company_size
ON public.professional_profiles(company_size);

-- GIN index for array search on use_cases
CREATE INDEX IF NOT EXISTS idx_professional_profiles_use_cases
ON public.professional_profiles USING GIN(use_cases);

-- ════════════════════════════════════════════════════════════════
-- 3. ENABLE ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════
-- 4. CREATE RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can view their own professional profile
CREATE POLICY "Users can view own professional profile"
ON public.professional_profiles
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Users can insert their own professional profile
CREATE POLICY "Users can create own professional profile"
ON public.professional_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own professional profile
CREATE POLICY "Users can update own professional profile"
ON public.professional_profiles
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Admins can view all professional profiles
CREATE POLICY "Admins can view all professional profiles"
ON public.professional_profiles
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
-- 5. CREATE UPDATED_AT TRIGGER
-- ════════════════════════════════════════════════════════════════

-- Reuse existing update_updated_at_column function if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER update_professional_profiles_updated_at
BEFORE UPDATE ON public.professional_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════
-- 6. CREATE HELPER FUNCTION FOR ANALYTICS
-- ════════════════════════════════════════════════════════════════

-- Function to get professional profiles statistics
CREATE OR REPLACE FUNCTION public.get_professional_profiles_stats()
RETURNS TABLE(
  total_profiles bigint,
  by_industry jsonb,
  by_company_size jsonb,
  by_country jsonb,
  top_use_cases jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      jsonb_object_agg(
        COALESCE(industry, 'unknown'),
        COUNT(*)
      ) FILTER (WHERE industry IS NOT NULL) as by_ind,
      jsonb_object_agg(
        COALESCE(company_size, 'unknown'),
        COUNT(*)
      ) FILTER (WHERE company_size IS NOT NULL) as by_size,
      jsonb_object_agg(
        COALESCE(country, 'unknown'),
        COUNT(*)
      ) FILTER (WHERE country IS NOT NULL) as by_ctry
    FROM professional_profiles
  ),
  use_case_stats AS (
    SELECT
      jsonb_object_agg(
        use_case,
        count
      ) as top_cases
    FROM (
      SELECT
        unnest(use_cases) as use_case,
        COUNT(*) as count
      FROM professional_profiles
      WHERE use_cases IS NOT NULL AND array_length(use_cases, 1) > 0
      GROUP BY use_case
      ORDER BY count DESC
      LIMIT 10
    ) uc
  )
  SELECT
    stats.total,
    stats.by_ind,
    stats.by_size,
    stats.by_ctry,
    COALESCE(use_case_stats.top_cases, '{}'::jsonb)
  FROM stats, use_case_stats;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- 7. GRANT PERMISSIONS
-- ════════════════════════════════════════════════════════════════

-- Grant execute on stats function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_professional_profiles_stats() TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- 8. ADD COMMENTS
-- ════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.professional_profiles IS
'Professional and company information for registered users. Used for personalization and analytics.';

COMMENT ON COLUMN public.professional_profiles.use_cases IS
'Array of use case identifiers (e.g., cicd, infrastructure, security, monitoring, deployment, cloud)';

COMMENT ON FUNCTION public.get_professional_profiles_stats() IS
'Returns aggregated statistics about professional profiles for admin analytics dashboard';
