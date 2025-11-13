/*
  # Create Contact Requests Table

  ## Overview
  Creates a table to store contact form submissions from the landing page.
  Includes proper indexes, RLS policies, and trigger for updated_at.

  ## Tables Created
  
  1. **contact_requests**
     - `id` (uuid, primary key) - Unique identifier
     - `name` (text, required) - Full name of requester
     - `email` (text, required) - Email address
     - `company` (text, optional) - Company name
     - `phone` (text, optional) - Phone number
     - `subject` (text, required) - Subject of request
     - `message` (text, required) - Detailed message
     - `plan_interest` (text, optional) - Which plan they're interested in
     - `status` (text, required) - Request status (new, contacted, resolved)
     - `created_at` (timestamptz) - When request was created
     - `updated_at` (timestamptz) - Last update time

  ## Security
  
  1. **RLS Enabled**
     - Table is protected by Row Level Security
  
  2. **Policies**
     - `Anyone can submit contact request` - Public can INSERT
     - `Admins can view all contact requests` - Admin users can SELECT
     - `Admins can update contact requests` - Admin users can UPDATE

  ## Indexes
  
  - Email for lookups
  - Status for filtering
  - Created_at for sorting

  ## Performance
  
  - Efficient indexes on common query columns
  - Trigger to auto-update updated_at
  - Optimized for read-heavy workload
*/

-- ============================================================================
-- Create contact_requests table
-- ============================================================================

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

-- ============================================================================
-- Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contact_requests_email 
  ON public.contact_requests(email);

CREATE INDEX IF NOT EXISTS idx_contact_requests_status 
  ON public.contact_requests(status);

CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at 
  ON public.contact_requests(created_at DESC);

-- Composite index for admin dashboard (status + created_at)
CREATE INDEX IF NOT EXISTS idx_contact_requests_status_created 
  ON public.contact_requests(status, created_at DESC);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create RLS Policies
-- ============================================================================

-- Policy: Anyone can submit a contact request (INSERT only, no authentication required)
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

-- Policy: Admins can update contact requests (change status, add notes, etc.)
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

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Allow anonymous users to insert (for contact form)
GRANT INSERT ON public.contact_requests TO anon;
GRANT INSERT ON public.contact_requests TO authenticated;

-- Allow authenticated users to select and update (admin check via RLS)
GRANT SELECT, UPDATE ON public.contact_requests TO authenticated;

-- ============================================================================
-- Create trigger function for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contact_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Create trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_contact_requests_updated_at 
  ON public.contact_requests;

CREATE TRIGGER trigger_update_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_requests_updated_at();

-- ============================================================================
-- Update statistics
-- ============================================================================

ANALYZE public.contact_requests;
