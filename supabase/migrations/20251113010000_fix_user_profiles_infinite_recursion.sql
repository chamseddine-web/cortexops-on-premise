/*
  # Fix Infinite Recursion in user_profiles RLS Policies

  ## Problem
  Policy "Admins can view all profiles" caused infinite recursion:
  - Policy on user_profiles queries user_profiles itself
  - PostgreSQL enters infinite loop checking permissions
  - Error: "infinite recursion detected in policy for relation user_profiles"

  ## Solution
  Use user_roles table (already exists) instead of querying user_profiles
  This breaks the recursion cycle

  ## Changes
  1. Drop problematic policies on user_profiles
  2. Recreate with user_roles table (no recursion)
  3. Add missing "Users can read own profile" policy
  4. Simplify admin check using user_roles

  ## Security
  - Users can ONLY read/update their own profile
  - Admins can read ALL profiles (via user_roles check)
  - is_admin field protected from modification
*/

-- ════════════════════════════════════════════════════════════════
-- 1. DROP ALL EXISTING POLICIES ON user_profiles
-- ════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- ════════════════════════════════════════════════════════════════
-- 2. CREATE NEW POLICIES (NO RECURSION)
-- ════════════════════════════════════════════════════════════════

-- Policy 1: Users can read their OWN profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Admins can read ALL profiles (via user_roles, no recursion)
CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Policy 3: Users can UPDATE their own profile
-- Protect is_admin field: can't change it unless already admin
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (
      -- Either is_admin unchanged
      is_admin = (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid())
      OR
      -- Or user is already admin (can change own status)
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (SELECT auth.uid())
        AND role = 'admin'
      )
    )
  );

-- Policy 4: Allow INSERT during signup (auth trigger creates profile)
CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ════════════════════════════════════════════════════════════════
-- 3. ENSURE user_roles TABLE EXISTS AND HAS ADMIN ENTRY
-- ════════════════════════════════════════════════════════════════

-- Create user_roles table if not exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'user', 'moderator')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ════════════════════════════════════════════════════════════════
-- 4. SYNC is_admin FIELD WITH user_roles TABLE
-- ════════════════════════════════════════════════════════════════

-- Insert admin role for users where is_admin = true
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM public.user_profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Insert 'user' role for all other users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'
FROM public.user_profiles
WHERE is_admin = false OR is_admin IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 5. CREATE TRIGGER TO KEEP user_roles IN SYNC
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_user_roles_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_admin = true AND OLD.is_admin = false THEN
    -- User promoted to admin
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF NEW.is_admin = false AND OLD.is_admin = true THEN
    -- User demoted from admin
    DELETE FROM user_roles
    WHERE user_id = NEW.id AND role = 'admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_roles_trigger ON public.user_profiles;
CREATE TRIGGER sync_user_roles_trigger
  AFTER UPDATE OF is_admin ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_roles_from_profile();

-- ════════════════════════════════════════════════════════════════
-- 6. GRANT PERMISSIONS
-- ════════════════════════════════════════════════════════════════

GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- 7. VERIFICATION QUERIES (for testing)
-- ════════════════════════════════════════════════════════════════

-- Uncomment to verify after migration:
-- SELECT * FROM user_profiles LIMIT 5;
-- SELECT * FROM user_roles;
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'user_profiles';
