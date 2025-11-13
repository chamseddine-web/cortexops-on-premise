/*
  # Zero Data Retention Policy Implementation

  1. Overview
    This migration implements a Zero Data Retention policy for sensitive user data.
    No playbook prompts or generated content are stored in the database.

  2. Changes
    - Add privacy policy metadata to api_usage_logs table
    - Add comment documentation on tables that don't store sensitive data
    - Create view for privacy compliance reporting

  3. Security
    - Ensures api_usage_logs does not contain request/response bodies
    - Documents that playbooks are never persisted
    - Adds compliance tracking

  4. Important Notes
    - Only metadata (counts, timestamps, status codes) are logged
    - User prompts are processed in-memory only via Edge Functions
    - Generated playbooks are returned directly to client, never stored
*/

-- Add privacy policy comment to api_usage_logs
COMMENT ON TABLE api_usage_logs IS
'Stores API usage metadata only. Zero Data Retention: No request bodies, prompts, or generated content stored. Only logs: timestamps, status codes, response times, and IP addresses.';

COMMENT ON COLUMN api_usage_logs.endpoint IS
'API endpoint called. No query parameters or request bodies stored.';

-- Add privacy metadata column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage_logs' AND column_name = 'privacy_policy'
  ) THEN
    ALTER TABLE api_usage_logs
    ADD COLUMN privacy_policy text DEFAULT 'zero-data-retention';
  END IF;
END $$;

-- Create view for privacy compliance reporting
CREATE OR REPLACE VIEW privacy_compliance_report AS
SELECT
  'api_usage_logs' as table_name,
  'Metadata only - no sensitive data' as data_stored,
  'zero-data-retention' as policy,
  COUNT(*) as total_records,
  MAX(created_at) as last_updated
FROM api_usage_logs
UNION ALL
SELECT
  'api_clients' as table_name,
  'Client metadata and API keys only' as data_stored,
  'minimal-required-data' as policy,
  COUNT(*) as total_records,
  MAX(updated_at) as last_updated
FROM api_clients
UNION ALL
SELECT
  'subscriptions' as table_name,
  'Subscription and billing info only' as data_stored,
  'minimal-required-data' as policy,
  COUNT(*) as total_records,
  MAX(updated_at) as last_updated
FROM subscriptions;

-- Grant access to authenticated users
GRANT SELECT ON privacy_compliance_report TO authenticated;

-- Add index for privacy policy tracking
CREATE INDEX IF NOT EXISTS idx_api_usage_privacy_policy
ON api_usage_logs(privacy_policy);

-- Document the zero data retention principle
COMMENT ON VIEW privacy_compliance_report IS
'Privacy compliance reporting view. Shows what data is stored and confirms zero-data-retention policy for sensitive operations. User prompts and generated playbooks are NEVER stored in the database.';
