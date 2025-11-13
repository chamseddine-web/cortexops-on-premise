/*
  # Fix User Profiles Infinite Recursion and Add Missing Column

  1. Changes
    - Drop problematic RLS policies causing infinite recursion
    - Add onboarding_completed column
    - Create non-recursive RLS policies using direct auth.uid() checks
    - Add admin role check using auth.jwt() instead of recursive query

  2. Security
    - Users can view and update their own profile
    - Admins identified via JWT claims, not recursive queries
*/

-- Add missing column
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON user_profiles;

-- Create non-recursive policies

-- SELECT policy: Users can view their own profile OR profiles if they're admin
CREATE POLICY "Users can view profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    (auth.jwt() -> 'user_metadata' ->> 'user_role') = 'admin'
  );

-- INSERT policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE policy: Only admins can delete (via JWT)
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'user_role') = 'admin');

-- Fix user_sessions policies to avoid recursion
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
DROP POLICY IF EXISTS "System can manage sessions" ON user_sessions;
DROP POLICY IF EXISTS "System can update sessions" ON user_sessions;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (auth.jwt() -> 'user_metadata' ->> 'user_role') = 'admin'
  );

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update sessions"
  ON user_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix admin_audit_log policies
DROP POLICY IF EXISTS "Admins can view audit log" ON admin_audit_log;
DROP POLICY IF EXISTS "System can insert audit log" ON admin_audit_log;

CREATE POLICY "Admins can view audit log"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'user_role') = 'admin');

CREATE POLICY "Admins can insert audit log"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'user_role') = 'admin');

-- Create function to safely check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'user_role') = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to get current user's profile without recursion
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS SETOF user_profiles AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM user_profiles
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create index on onboarding_completed for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding
ON user_profiles(onboarding_completed)
WHERE NOT onboarding_completed;