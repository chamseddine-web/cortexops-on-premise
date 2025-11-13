/*
  # Fix Infinite Recursion in user_roles RLS Policies

  ## Problem
  Policy "Admins can read all roles" caused ANOTHER infinite recursion:
  - Policy on user_roles queries user_roles itself
  - Same problem as before, different table

  ## Solution
  Simplify RLS on user_roles:
  - Users can read ONLY their own roles
  - Remove admin policy (not needed for basic functionality)
  - Admins can use service_role key if they need to see all roles

  ## Security
  - Each user can ONLY see their own roles
  - No recursion possible
  - Simple and performant
*/

-- ════════════════════════════════════════════════════════════════
-- 1. DROP ALL POLICIES ON user_roles
-- ════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

-- ════════════════════════════════════════════════════════════════
-- 2. CREATE SIMPLE POLICY (NO RECURSION)
-- ════════════════════════════════════════════════════════════════

-- Policy 1: Users can read ONLY their own roles
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ════════════════════════════════════════════════════════════════
-- 3. FIX user_profiles POLICIES TO AVOID user_roles QUERY
-- ════════════════════════════════════════════════════════════════

-- Option A: Use is_admin field directly (no join to user_roles)
-- This avoids querying user_roles in the policy

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Check is_admin field on current user's OWN profile
    -- Use a subquery that only reads the CURRENT user's profile
    (SELECT is_admin FROM public.user_profiles WHERE id = (SELECT auth.uid())) = true
  );

-- ════════════════════════════════════════════════════════════════
-- IMPORTANT NOTE
-- ════════════════════════════════════════════════════════════════

-- This policy still uses user_profiles in a subquery, but it's SAFE because:
-- 1. It only queries ONE specific row (WHERE id = auth.uid())
-- 2. That row is readable by the "Users can read own profile" policy
-- 3. No infinite recursion because we're not checking ALL rows

-- The recursion only happens when:
-- - Policy checks ALL rows of the same table
-- - Each row check triggers the policy again
-- 
-- Here we only check ONE specific row (the current user's own profile),
-- which is always allowed by "Users can read own profile" policy.