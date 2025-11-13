/*
  # Create Contact Requests Table

  1. New Tables
    - `contact_requests`
      - `id` (uuid, primary key)
      - `name` (text, required) - Name of the person contacting
      - `email` (text, required) - Email address
      - `company` (text, optional) - Company name
      - `phone` (text, optional) - Phone number
      - `subject` (text, required) - Subject of the inquiry
      - `message` (text, required) - Detailed message
      - `plan_interest` (text, optional) - Which plan they're interested in
      - `status` (text, default: 'new') - Status: new, contacted, resolved
      - `created_at` (timestamptz, default: now())
      - `updated_at` (timestamptz, default: now())

  2. Security
    - Enable RLS on `contact_requests` table
    - Users can insert their own contact requests
    - Only admins can view/update all contact requests

  3. Performance
    - Index on email for quick lookups
    - Index on status for filtering
    - Index on created_at for sorting
*/

-- Create contact_requests table
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  plan_interest text,
  status text DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'contacted', 'resolved')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON public.contact_requests(email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON public.contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (authenticated or not) can submit a contact request
CREATE POLICY "Anyone can submit contact request"
  ON public.contact_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Admins can view all contact requests
CREATE POLICY "Admins can view all contact requests"
  ON public.contact_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role = 'admin'
    )
  );

-- Policy: Admins can update contact requests
CREATE POLICY "Admins can update contact requests"
  ON public.contact_requests
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

-- Grant permissions
GRANT INSERT ON public.contact_requests TO anon;
GRANT INSERT ON public.contact_requests TO authenticated;
GRANT SELECT, UPDATE ON public.contact_requests TO authenticated;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_contact_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_requests_updated_at();
