/*
  # CI/CD Integrations System (Jenkins, GitLab CI, GitHub Actions)

  1. Overview
    Enterprise CI/CD integration system supporting multiple providers.
    Webhooks, pipeline triggers, status tracking, and deployment history.

  2. New Tables
    - `ci_connections`: CI/CD provider connections
    - `pipelines`: Pipeline definitions and configurations
    - `pipeline_runs`: Execution history with logs
    - `deployments`: Deployment tracking
    - `webhooks`: Webhook management for CI/CD events
    - `git_repositories`: Git repository connections

  3. Supported Providers
    - Jenkins
    - GitLab CI
    - GitHub Actions
    - CircleCI
    - Travis CI

  4. Features
    - Automatic pipeline triggering
    - Real-time status updates
    - Deployment rollback
    - Environment management
*/

-- ============================================================================
-- Git Repositories
-- ============================================================================

CREATE TABLE IF NOT EXISTS git_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Repository details
  provider text NOT NULL CHECK (
    provider IN ('github', 'gitlab', 'bitbucket', 'azure-devops')
  ),
  repository_url text NOT NULL,
  repository_name text NOT NULL,
  default_branch text DEFAULT 'main',

  -- Authentication (encrypted)
  auth_type text NOT NULL CHECK (
    auth_type IN ('token', 'ssh', 'oauth')
  ),
  credentials_encrypted text, -- Encrypted access token or SSH key

  -- Repository settings
  auto_sync boolean DEFAULT false,
  sync_interval integer DEFAULT 3600, -- seconds

  -- Status
  status text DEFAULT 'connected' CHECK (
    status IN ('connected', 'disconnected', 'error')
  ),
  last_sync_at timestamptz,
  last_error text,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_git_repos_project ON git_repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_git_repos_provider ON git_repositories(provider);

-- ============================================================================
-- CI/CD Connections
-- ============================================================================

CREATE TABLE IF NOT EXISTS ci_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Provider details
  provider text NOT NULL CHECK (
    provider IN ('jenkins', 'gitlab-ci', 'github-actions', 'circleci', 'travis-ci')
  ),
  connection_name text NOT NULL,

  -- Connection config
  base_url text, -- Jenkins URL, GitLab instance URL
  credentials_encrypted text, -- Encrypted API token

  -- Provider-specific config
  config jsonb DEFAULT '{}'::jsonb,
  /* Example Jenkins config:
  {
    "username": "ci-user",
    "job_folder": "/ansible-automation",
    "crumb_issuer": true
  }
  */

  -- Status
  status text DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'error')
  ),
  last_test_at timestamptz,
  test_result text,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ci_connections_project ON ci_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_ci_connections_provider ON ci_connections(provider);

-- ============================================================================
-- Pipelines
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  ci_connection_id uuid REFERENCES ci_connections(id) ON DELETE CASCADE NOT NULL,

  name text NOT NULL,
  description text,

  -- Pipeline configuration
  pipeline_type text NOT NULL CHECK (
    pipeline_type IN ('build', 'test', 'deploy', 'validate', 'custom')
  ),

  -- Trigger settings
  trigger_on_push boolean DEFAULT true,
  trigger_on_pr boolean DEFAULT true,
  trigger_on_schedule boolean DEFAULT false,
  schedule_cron text, -- Cron expression for scheduled runs

  -- Pipeline definition
  pipeline_config jsonb NOT NULL,
  /* Example Jenkins config:
  {
    "job_name": "ansible-deploy-prod",
    "parameters": {
      "ENVIRONMENT": "production",
      "PLAYBOOK_PATH": "site.yml"
    },
    "stages": ["validate", "test", "deploy"]
  }
  */

  -- Environment targeting
  target_environment text CHECK (
    target_environment IN ('development', 'staging', 'production', 'all')
  ),

  -- Status
  enabled boolean DEFAULT true,
  last_run_at timestamptz,
  last_run_status text,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pipelines_project ON pipelines(project_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_ci_connection ON pipelines(ci_connection_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_type ON pipelines(pipeline_type);

-- ============================================================================
-- Pipeline Runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES pipelines(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Run identification
  run_number integer NOT NULL,
  external_id text, -- Jenkins build number, GitLab pipeline ID, etc.

  -- Trigger info
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_type text NOT NULL CHECK (
    trigger_type IN ('manual', 'push', 'pr', 'schedule', 'webhook', 'api')
  ),

  -- Status
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'queued', 'running', 'success', 'failed', 'cancelled', 'timeout')
  ),

  -- Execution details
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds integer,

  -- Logs and output
  logs text,
  artifacts jsonb, -- URLs to build artifacts

  -- Metrics
  tests_total integer,
  tests_passed integer,
  tests_failed integer,
  coverage_percentage numeric(5,2),

  -- Error tracking
  error_message text,
  error_details jsonb,

  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_pipeline ON pipeline_runs(pipeline_id, run_number DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_project ON pipeline_runs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_triggered_by ON pipeline_runs(triggered_by);

-- ============================================================================
-- Deployments
-- ============================================================================

CREATE TABLE IF NOT EXISTS deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  pipeline_run_id uuid REFERENCES pipeline_runs(id) ON DELETE SET NULL,

  -- Deployment details
  environment text NOT NULL CHECK (
    environment IN ('development', 'staging', 'production', 'dr')
  ),
  version text NOT NULL,

  -- Deployment metadata
  playbook_content text, -- The actual playbook deployed
  git_commit text,
  git_branch text,
  git_tag text,

  -- Status
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'deploying', 'success', 'failed', 'rolled_back')
  ),

  -- Timing
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds integer,

  -- Deployment results
  hosts_total integer,
  hosts_success integer,
  hosts_failed integer,

  -- Rollback info
  can_rollback boolean DEFAULT true,
  rolled_back_from uuid REFERENCES deployments(id),

  deployed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_deployed_by ON deployments(deployed_by);

-- ============================================================================
-- Webhooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,

  name text NOT NULL,
  description text,

  -- Webhook config
  url text NOT NULL,
  secret text NOT NULL, -- HMAC secret for signature verification

  -- Events to trigger on
  events text[] DEFAULT ARRAY[
    'playbook.generated',
    'pipeline.started',
    'pipeline.completed',
    'deployment.success',
    'deployment.failed'
  ],

  -- Delivery settings
  method text DEFAULT 'POST' CHECK (method IN ('POST', 'PUT')),
  headers jsonb DEFAULT '{}'::jsonb,
  timeout_seconds integer DEFAULT 30,
  retry_count integer DEFAULT 3,

  -- Status
  enabled boolean DEFAULT true,
  last_triggered_at timestamptz,
  last_status_code integer,
  total_deliveries integer DEFAULT 0,
  failed_deliveries integer DEFAULT 0,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhooks_organization ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_project ON webhooks(project_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled);

-- ============================================================================
-- Webhook Deliveries (Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES webhooks(id) ON DELETE CASCADE NOT NULL,

  -- Request details
  event_type text NOT NULL,
  payload jsonb NOT NULL,

  -- Response details
  status_code integer,
  response_body text,
  response_time_ms integer,

  -- Retry tracking
  attempt_number integer DEFAULT 1,

  -- Status
  status text DEFAULT 'pending' CHECK (
    status IN ('pending', 'success', 'failed', 'timeout')
  ),

  error_message text,

  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE git_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ci_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- Users can view CI/CD resources in their projects
CREATE POLICY "Users can view project ci_cd resources"
  ON ci_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_collaborators pc ON pc.project_id = p.id
      WHERE p.id = ci_connections.project_id
      AND pc.user_id = auth.uid()
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Users can view project pipelines"
  ON pipelines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_collaborators pc ON pc.project_id = p.id
      WHERE p.id = pipelines.project_id
      AND pc.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Functions
-- ============================================================================

-- Trigger pipeline run
CREATE OR REPLACE FUNCTION trigger_pipeline_run(
  p_pipeline_id uuid,
  p_triggered_by uuid,
  p_trigger_type text DEFAULT 'manual'
) RETURNS uuid AS $$
DECLARE
  v_run_id uuid;
  v_project_id uuid;
  v_run_number integer;
BEGIN
  -- Get project and next run number
  SELECT project_id INTO v_project_id
  FROM pipelines WHERE id = p_pipeline_id;

  SELECT COALESCE(MAX(run_number), 0) + 1 INTO v_run_number
  FROM pipeline_runs WHERE pipeline_id = p_pipeline_id;

  -- Create pipeline run
  INSERT INTO pipeline_runs (
    pipeline_id,
    project_id,
    run_number,
    triggered_by,
    trigger_type,
    status,
    started_at
  ) VALUES (
    p_pipeline_id,
    v_project_id,
    v_run_number,
    p_triggered_by,
    p_trigger_type,
    'queued',
    now()
  ) RETURNING id INTO v_run_id;

  -- Update pipeline last run
  UPDATE pipelines
  SET last_run_at = now(), last_run_status = 'queued'
  WHERE id = p_pipeline_id;

  -- Log activity
  PERFORM log_activity(
    (SELECT organization_id FROM projects WHERE id = v_project_id),
    (SELECT team_id FROM projects WHERE id = v_project_id),
    v_project_id,
    p_triggered_by,
    'ci_triggered',
    format('Pipeline run #%s started', v_run_number),
    NULL,
    jsonb_build_object('pipeline_id', p_pipeline_id, 'run_id', v_run_id)
  );

  RETURN v_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record deployment
CREATE OR REPLACE FUNCTION record_deployment(
  p_project_id uuid,
  p_pipeline_run_id uuid,
  p_environment text,
  p_version text,
  p_deployed_by uuid,
  p_git_commit text DEFAULT NULL,
  p_playbook_content text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_deployment_id uuid;
BEGIN
  INSERT INTO deployments (
    project_id,
    pipeline_run_id,
    environment,
    version,
    git_commit,
    playbook_content,
    status,
    started_at,
    deployed_by
  ) VALUES (
    p_project_id,
    p_pipeline_run_id,
    p_environment,
    p_version,
    p_git_commit,
    p_playbook_content,
    'deploying',
    now(),
    p_deployed_by
  ) RETURNING id INTO v_deployment_id;

  -- Log activity
  PERFORM log_activity(
    (SELECT organization_id FROM projects WHERE id = p_project_id),
    (SELECT team_id FROM projects WHERE id = p_project_id),
    p_project_id,
    p_deployed_by,
    'deployment_started',
    format('Deployment to %s environment started', p_environment),
    format('Version: %s', p_version),
    jsonb_build_object('deployment_id', v_deployment_id, 'environment', p_environment)
  );

  RETURN v_deployment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send webhook
CREATE OR REPLACE FUNCTION send_webhook_notification(
  p_webhook_id uuid,
  p_event_type text,
  p_payload jsonb
) RETURNS uuid AS $$
DECLARE
  v_delivery_id uuid;
BEGIN
  INSERT INTO webhook_deliveries (
    webhook_id,
    event_type,
    payload,
    status
  ) VALUES (
    p_webhook_id,
    p_event_type,
    p_payload,
    'pending'
  ) RETURNING id INTO v_delivery_id;

  -- Update webhook stats
  UPDATE webhooks
  SET
    last_triggered_at = now(),
    total_deliveries = total_deliveries + 1
  WHERE id = p_webhook_id;

  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE ci_connections IS 'CI/CD provider connections (Jenkins, GitLab CI, GitHub Actions)';
COMMENT ON TABLE pipelines IS 'Pipeline definitions with trigger configuration';
COMMENT ON TABLE pipeline_runs IS 'Execution history and logs for pipeline runs';
COMMENT ON TABLE deployments IS 'Deployment tracking with rollback capability';
COMMENT ON TABLE webhooks IS 'Webhook configuration for external integrations';
