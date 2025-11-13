/*
  # Privacy Audit System for Enterprise Compliance

  1. Overview
    Comprehensive audit logging system for GDPR, SOC 2, and ISO 27001 compliance.
    Tracks all data access, modifications, and privacy-related operations.

  2. New Tables
    - `privacy_audit_log`: Immutable audit trail of all privacy events
    - `data_access_log`: Tracks all access to sensitive data
    - `consent_records`: User consent management
    - `data_retention_schedule`: Automated data cleanup tracking

  3. Security
    - Audit logs are immutable (no updates/deletes allowed)
    - RLS policies ensure users can only see their own audit trails
    - Admin access for compliance reporting
    - Automatic retention enforcement

  4. Compliance Features
    - GDPR Article 30: Record of processing activities
    - SOC 2 CC6.1: Logical access security
    - ISO 27001 A.12.4.1: Event logging
*/

-- ============================================================================
-- Privacy Audit Log (Immutable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event classification
  event_type text NOT NULL CHECK (
    event_type IN (
      'account_created',
      'account_deleted',
      'data_exported',
      'data_deletion_requested',
      'data_access',
      'data_modification',
      'consent_given',
      'consent_withdrawn',
      'privacy_settings_changed',
      'api_key_created',
      'api_key_revoked',
      'mfa_enabled',
      'mfa_disabled',
      'password_changed',
      'email_changed',
      'login_success',
      'login_failed',
      'session_expired',
      'suspicious_activity',
      'gdpr_request',
      'security_incident'
    )
  ),

  -- Data classification
  data_category text CHECK (
    data_category IN (
      'PLAYBOOK_CONTENT',
      'USER_PROMPT',
      'INFRASTRUCTURE_CONFIG',
      'CREDENTIALS',
      'USER_PII',
      'BILLING_INFO',
      'API_KEYS',
      'USAGE_METRICS',
      'SYSTEM_LOGS'
    )
  ),

  -- Event details (no PII)
  event_description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Compliance tracking
  compliance_framework text[] DEFAULT ARRAY['GDPR', 'SOC2', 'ISO27001'],

  -- Request context
  ip_address inet,
  user_agent text,
  request_id uuid,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure immutability
  CONSTRAINT audit_immutable CHECK (true)
);

-- Prevent any updates or deletes
CREATE OR REPLACE RULE privacy_audit_no_update AS
  ON UPDATE TO privacy_audit_log
  DO INSTEAD NOTHING;

CREATE OR REPLACE RULE privacy_audit_no_delete AS
  ON DELETE TO privacy_audit_log
  DO INSTEAD NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_privacy_audit_user_id ON privacy_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_event_type ON privacy_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_created_at ON privacy_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_data_category ON privacy_audit_log(data_category);

-- RLS Policies
ALTER TABLE privacy_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON privacy_audit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON privacy_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON privacy_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- Data Access Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- What was accessed
  resource_type text NOT NULL,
  resource_id uuid,
  action text NOT NULL CHECK (
    action IN ('view', 'create', 'update', 'delete', 'export', 'download')
  ),

  -- Access control
  access_granted boolean DEFAULT true,
  denial_reason text,

  -- Context
  ip_address inet,
  user_agent text,

  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_data_access_user_id ON data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_resource ON data_access_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_data_access_created_at ON data_access_log(created_at DESC);

ALTER TABLE data_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access logs"
  ON data_access_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert access logs"
  ON data_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- Consent Records (GDPR Compliance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Consent type
  consent_type text NOT NULL CHECK (
    consent_type IN (
      'terms_of_service',
      'privacy_policy',
      'marketing_emails',
      'analytics_tracking',
      'third_party_sharing',
      'data_processing'
    )
  ),

  -- Consent status
  consented boolean NOT NULL DEFAULT false,
  consent_version text NOT NULL,

  -- Timestamps
  consented_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Proof of consent
  ip_address inet,
  user_agent text,

  CONSTRAINT valid_consent_dates CHECK (
    (consented = true AND consented_at IS NOT NULL) OR
    (consented = false AND withdrawn_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_consent_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_active ON consent_records(user_id, consent_type) WHERE consented = true;

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consent records"
  ON consent_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own consent records"
  ON consent_records
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert consent records"
  ON consent_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Data Retention Schedule
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_retention_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Data classification
  data_category text NOT NULL,
  table_name text NOT NULL,

  -- Retention policy
  retention_days integer NOT NULL DEFAULT 0,
  auto_delete boolean DEFAULT true,

  -- Cleanup tracking
  last_cleanup_at timestamptz,
  next_cleanup_at timestamptz,
  records_deleted integer DEFAULT 0,

  -- Policy metadata
  policy_description text,
  compliance_requirement text,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_retention_next_cleanup ON data_retention_schedule(next_cleanup_at)
  WHERE auto_delete = true;

-- Insert default retention policies
INSERT INTO data_retention_schedule (data_category, table_name, retention_days, auto_delete, policy_description, compliance_requirement)
VALUES
  ('USAGE_METRICS', 'api_usage_logs', 90, true, 'Usage metrics retained for 90 days', 'SOC2'),
  ('SYSTEM_LOGS', 'data_access_log', 30, true, 'Access logs retained for 30 days', 'ISO27001'),
  ('AUDIT_LOGS', 'privacy_audit_log', 2555, false, 'Audit logs retained for 7 years', 'Legal requirement'),
  ('USER_SESSIONS', 'auth.sessions', 30, true, 'Sessions cleaned up after 30 days', 'Security best practice')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Audit Functions
-- ============================================================================

-- Function to log privacy events
CREATE OR REPLACE FUNCTION log_privacy_event(
  p_user_id uuid,
  p_event_type text,
  p_data_category text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  INSERT INTO privacy_audit_log (
    user_id,
    event_type,
    data_category,
    event_description,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_event_type,
    p_data_category,
    p_description,
    p_metadata,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log data access
CREATE OR REPLACE FUNCTION log_data_access(
  p_user_id uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_action text,
  p_access_granted boolean DEFAULT true,
  p_denial_reason text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_access_log_id uuid;
BEGIN
  INSERT INTO data_access_log (
    user_id,
    resource_type,
    resource_id,
    action,
    access_granted,
    denial_reason,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_resource_type,
    p_resource_id,
    p_action,
    p_access_granted,
    p_denial_reason,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO v_access_log_id;

  RETURN v_access_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record consent
CREATE OR REPLACE FUNCTION record_consent(
  p_user_id uuid,
  p_consent_type text,
  p_consented boolean,
  p_consent_version text
) RETURNS uuid AS $$
DECLARE
  v_consent_id uuid;
BEGIN
  INSERT INTO consent_records (
    user_id,
    consent_type,
    consented,
    consent_version,
    consented_at,
    withdrawn_at,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_consent_type,
    p_consented,
    p_consent_version,
    CASE WHEN p_consented THEN now() ELSE NULL END,
    CASE WHEN NOT p_consented THEN now() ELSE NULL END,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO v_consent_id;

  -- Log the consent event
  PERFORM log_privacy_event(
    p_user_id,
    CASE WHEN p_consented THEN 'consent_given' ELSE 'consent_withdrawn' END,
    'USER_PII',
    format('User %s consent for %s',
      CASE WHEN p_consented THEN 'gave' ELSE 'withdrew' END,
      p_consent_type
    ),
    jsonb_build_object(
      'consent_type', p_consent_type,
      'consent_version', p_consent_version
    )
  );

  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Automated Cleanup Functions
-- ============================================================================

-- Function to cleanup old data based on retention policy
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE(
  category text,
  table_name text,
  records_deleted bigint
) AS $$
DECLARE
  v_schedule RECORD;
  v_deleted bigint;
BEGIN
  FOR v_schedule IN
    SELECT * FROM data_retention_schedule
    WHERE auto_delete = true
    AND retention_days > 0
    AND (next_cleanup_at IS NULL OR next_cleanup_at <= now())
  LOOP
    -- Execute cleanup based on table
    IF v_schedule.table_name = 'api_usage_logs' THEN
      DELETE FROM api_usage_logs
      WHERE created_at < now() - (v_schedule.retention_days || ' days')::interval;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    ELSIF v_schedule.table_name = 'data_access_log' THEN
      DELETE FROM data_access_log
      WHERE created_at < now() - (v_schedule.retention_days || ' days')::interval;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
    END IF;

    -- Update schedule
    UPDATE data_retention_schedule
    SET
      last_cleanup_at = now(),
      next_cleanup_at = now() + interval '1 day',
      records_deleted = records_deleted + v_deleted,
      updated_at = now()
    WHERE id = v_schedule.id;

    RETURN QUERY SELECT v_schedule.data_category, v_schedule.table_name, v_deleted;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Compliance Reporting Views
-- ============================================================================

-- GDPR Compliance Report
CREATE OR REPLACE VIEW gdpr_compliance_report AS
SELECT
  'Article 30' as article,
  'Records of Processing Activities' as requirement,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(*) as total_events,
  MAX(created_at) as last_event,
  jsonb_object_agg(event_type, event_count) as event_breakdown
FROM (
  SELECT
    user_id,
    event_type,
    created_at,
    COUNT(*) OVER (PARTITION BY event_type) as event_count
  FROM privacy_audit_log
  WHERE 'GDPR' = ANY(compliance_framework)
  AND created_at > now() - interval '30 days'
) sub
GROUP BY article, requirement;

-- SOC 2 Access Control Report
CREATE OR REPLACE VIEW soc2_access_report AS
SELECT
  user_id,
  resource_type,
  COUNT(*) as total_accesses,
  COUNT(*) FILTER (WHERE access_granted = true) as granted,
  COUNT(*) FILTER (WHERE access_granted = false) as denied,
  MAX(created_at) as last_access,
  array_agg(DISTINCT action) as actions_performed
FROM data_access_log
WHERE created_at > now() - interval '90 days'
GROUP BY user_id, resource_type;

-- Data Retention Compliance
CREATE OR REPLACE VIEW data_retention_compliance AS
SELECT
  drs.data_category,
  drs.table_name,
  drs.retention_days,
  drs.last_cleanup_at,
  drs.records_deleted,
  CASE
    WHEN drs.auto_delete AND drs.next_cleanup_at < now() THEN 'OVERDUE'
    WHEN drs.auto_delete THEN 'SCHEDULED'
    ELSE 'MANUAL'
  END as cleanup_status,
  drs.compliance_requirement
FROM data_retention_schedule drs;

GRANT SELECT ON gdpr_compliance_report TO authenticated;
GRANT SELECT ON soc2_access_report TO authenticated;
GRANT SELECT ON data_retention_compliance TO authenticated;

-- Comments
COMMENT ON TABLE privacy_audit_log IS 'Immutable audit trail for all privacy-related events. Cannot be updated or deleted.';
COMMENT ON TABLE data_access_log IS 'Log of all data access attempts for security monitoring and compliance.';
COMMENT ON TABLE consent_records IS 'GDPR-compliant consent management system with versioning and audit trail.';
COMMENT ON TABLE data_retention_schedule IS 'Automated data retention and cleanup schedule for compliance.';
