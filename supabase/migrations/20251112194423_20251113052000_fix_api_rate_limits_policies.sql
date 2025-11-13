/*
  # Fix Multiple Permissive Policies on api_rate_limits

  1. Security Issue
    - Table api_rate_limits has multiple permissive policies for SELECT
    - Policies: "Admins can manage rate limits" and "Everyone can view rate limits"
    - Multiple permissive policies can create unexpected behavior

  2. Solution
    - Keep only "Everyone can view rate limits" for SELECT (rate limits should be visible)
    - Remove or make "Admins can manage rate limits" apply only to UPDATE/DELETE/INSERT
    
  3. Changes
    - Drop existing "Admins can manage rate limits" if it exists
    - Recreate it as separate policies for INSERT, UPDATE, DELETE only
    - Keep "Everyone can view rate limits" for SELECT
*/

-- First, check if the admin policy exists and drop it
DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.api_rate_limits;

-- Recreate admin policies as separate policies for each action (not SELECT)
-- This way we don't have multiple permissive SELECT policies

-- Admin can INSERT rate limits
CREATE POLICY "Admins can insert rate limits"
  ON public.api_rate_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = 'admin'
    )
  );

-- Admin can UPDATE rate limits
CREATE POLICY "Admins can update rate limits"
  ON public.api_rate_limits
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = 'admin'
    )
  );

-- Admin can DELETE rate limits
CREATE POLICY "Admins can delete rate limits"
  ON public.api_rate_limits
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = 'admin'
    )
  );

-- Keep "Everyone can view rate limits" for SELECT (should already exist)
-- This is the only SELECT policy now, so no conflict