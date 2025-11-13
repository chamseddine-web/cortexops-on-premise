/*
  # Create professional_profiles Table

  1. New Tables
    - `professional_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `job_title` (text)
      - `phone` (text)
      - `company_name` (text)
      - `company_size` (text)
      - `industry` (text)
      - `country` (text)
      - `use_cases` (text array)
      - `newsletter_subscribed` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `professional_profiles` table
    - Add policies for users to manage their own professional profile
*/

-- Create professional_profiles table
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  job_title text,
  phone text,
  company_name text,
  company_size text,
  industry text,
  country text,
  use_cases text[],
  newsletter_subscribed boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_professional_profiles_user_id ON public.professional_profiles(user_id);

-- Enable RLS
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own professional profile
CREATE POLICY "Users can read own professional profile"
  ON public.professional_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own professional profile
CREATE POLICY "Users can insert own professional profile"
  ON public.professional_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own professional profile
CREATE POLICY "Users can update own professional profile"
  ON public.professional_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own professional profile
CREATE POLICY "Users can delete own professional profile"
  ON public.professional_profiles
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_profiles TO authenticated;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_professional_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_professional_profiles_updated_at
  BEFORE UPDATE ON public.professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_professional_profiles_updated_at();