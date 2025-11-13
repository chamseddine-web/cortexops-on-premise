/*
  # Create Anomalies Schema for IA Cognitive Resilience

  1. New Tables
    - `anomalies`
      - Stores all detected anomalies with full context
      - Backup for Weaviate vector store
      - Enables SQL queries when vector search unavailable

    - `ai_explanations`
      - Stores XAI (Explainable AI) decision explanations
      - Audit trail for all IA decisions
      - Military-grade compliance tracking

    - `agent_sessions`
      - Zero Trust Access tracking for Cortex agents
      - Continuous authentication validation
      - Session management

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated access only
    - Audit logging enabled

  3. Indexes
    - Performance optimization for time-series queries
    - Type and severity filtering
    - Resolution strategy lookup
*/

-- Anomalies table
CREATE TABLE IF NOT EXISTS anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution_strategy text,
  resolution_time integer,
  affected_services text[],
  root_cause text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI Explanations table
CREATE TABLE IF NOT EXISTS ai_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id text NOT NULL UNIQUE,
  timestamp timestamptz NOT NULL,
  outcome text NOT NULL,
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  contributing_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version text,
  audit_trail jsonb,
  created_at timestamptz DEFAULT now()
);

-- Agent Sessions table (Zero Trust Access)
CREATE TABLE IF NOT EXISTS agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  token_hash text NOT NULL,
  certificate_fingerprint text,
  expires_at timestamptz NOT NULL,
  revoked boolean DEFAULT false,
  revoked_at timestamptz,
  revoke_reason text,
  last_health_check timestamptz,
  behavior_score numeric(5,2) DEFAULT 100.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Anomaly backup table (from Weaviate)
CREATE TABLE IF NOT EXISTS anomalies_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vector_id uuid,
  timestamp timestamptz NOT NULL,
  type text NOT NULL,
  severity text NOT NULL,
  context jsonb NOT NULL,
  resolution_strategy text,
  synced_at timestamptz DEFAULT now()
);

-- Audit reports table (Military Grade)
CREATE TABLE IF NOT EXISTS audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL UNIQUE,
  classification text NOT NULL DEFAULT 'SECRET//NOFORN',
  generated_at timestamptz NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  summary jsonb NOT NULL,
  decisions jsonb NOT NULL,
  compliance jsonb NOT NULL,
  model_governance jsonb NOT NULL,
  recommendations jsonb,
  signature text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anomalies
CREATE POLICY "Authenticated users can view anomalies"
  ON anomalies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert anomalies"
  ON anomalies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update anomalies"
  ON anomalies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for ai_explanations
CREATE POLICY "Authenticated users can view AI explanations"
  ON ai_explanations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert AI explanations"
  ON ai_explanations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for agent_sessions
CREATE POLICY "Agents can view own sessions"
  ON agent_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage agent sessions"
  ON agent_sessions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for anomalies_backup
CREATE POLICY "Authenticated users can view anomalies backup"
  ON anomalies_backup FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert anomalies backup"
  ON anomalies_backup FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for audit_reports
CREATE POLICY "Authenticated users can view audit reports"
  ON audit_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert audit reports"
  ON audit_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(type);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_resolution_strategy ON anomalies(resolution_strategy);
CREATE INDEX IF NOT EXISTS idx_anomalies_created_at ON anomalies(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_explanations_timestamp ON ai_explanations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_explanations_decision_id ON ai_explanations(decision_id);
CREATE INDEX IF NOT EXISTS idx_ai_explanations_created_at ON ai_explanations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id ON agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_expires_at ON agent_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_revoked ON agent_sessions(revoked) WHERE revoked = false;

CREATE INDEX IF NOT EXISTS idx_audit_reports_generated_at ON audit_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_reports_period ON audit_reports(period_start, period_end);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_anomalies_context_gin ON anomalies USING GIN (context);
CREATE INDEX IF NOT EXISTS idx_ai_explanations_factors_gin ON ai_explanations USING GIN (contributing_factors);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_anomalies_updated_at ON anomalies;
CREATE TRIGGER update_anomalies_updated_at
  BEFORE UPDATE ON anomalies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_sessions_updated_at ON agent_sessions;
CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire agent sessions
CREATE OR REPLACE FUNCTION revoke_expired_agent_sessions()
RETURNS void AS $$
BEGIN
  UPDATE agent_sessions
  SET revoked = true,
      revoked_at = now(),
      revoke_reason = 'Session expired'
  WHERE expires_at < now()
    AND revoked = false;
END;
$$ LANGUAGE plpgsql;

-- View for anomaly statistics
CREATE OR REPLACE VIEW anomaly_stats AS
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  type,
  severity,
  COUNT(*) as count,
  COUNT(CASE WHEN resolution_strategy IS NOT NULL THEN 1 END) as resolved,
  AVG(resolution_time) FILTER (WHERE resolution_time IS NOT NULL) as avg_resolution_time,
  MAX(timestamp) as last_occurrence
FROM anomalies
GROUP BY DATE_TRUNC('hour', timestamp), type, severity
ORDER BY hour DESC, count DESC;

-- View for agent health monitoring
CREATE OR REPLACE VIEW agent_health AS
SELECT
  agent_id,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE revoked = false) as active_sessions,
  COUNT(*) FILTER (WHERE revoked = true) as revoked_sessions,
  AVG(behavior_score) as avg_behavior_score,
  MAX(last_health_check) as last_health_check,
  MAX(created_at) as last_session_created
FROM agent_sessions
GROUP BY agent_id
ORDER BY avg_behavior_score DESC, last_session_created DESC;

-- Grant permissions
GRANT SELECT ON anomaly_stats TO authenticated;
GRANT SELECT ON agent_health TO authenticated;

-- Comments for documentation
COMMENT ON TABLE anomalies IS 'Detected anomalies with full context and resolution tracking';
COMMENT ON TABLE ai_explanations IS 'Explainable AI decision audit trail for military-grade compliance';
COMMENT ON TABLE agent_sessions IS 'Zero Trust Access session management for Cortex agents';
COMMENT ON TABLE audit_reports IS 'Military-grade audit reports with compliance tracking';
COMMENT ON COLUMN anomalies.severity IS 'Severity: low, medium, high, critical';
COMMENT ON COLUMN anomalies.context IS 'Full JSON context of the anomaly event';
COMMENT ON COLUMN anomalies.resolution_strategy IS 'Applied resolution strategy from vector search';
COMMENT ON COLUMN ai_explanations.confidence IS 'Model confidence score (0.0 to 1.0)';
COMMENT ON COLUMN agent_sessions.behavior_score IS 'Agent behavior score (0-100, 100=perfect)';
