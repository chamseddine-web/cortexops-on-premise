/*
  # Create Profile Auto-Creation System

  1. Changes
    - Create trigger to auto-create user_profiles on signup
    - Create profiles for existing users
    - Add function to handle profile creation

  2. Security
    - Profiles created automatically for all new users
    - Existing users get profiles created retroactively
*/

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    email,
    user_role,
    user_plan,
    user_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    'free',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Create profiles for existing users who don't have one
INSERT INTO user_profiles (
  id,
  email,
  user_role,
  user_plan,
  user_status,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.email,
  'user',
  'free',
  'active',
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Update admin user if exists
UPDATE user_profiles
SET user_role = 'admin'
WHERE email = 'admin@cortexops.com';