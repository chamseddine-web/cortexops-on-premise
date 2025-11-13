/*
  # CORTEXOPS Execution Engine Schema

  ## Description
  This migration creates the infrastructure for CORTEXOPS execution engine,
  enabling playbook execution, job tracking, and real-time logs.

  ## New Tables

  ### `playbook_templates`
  Stores reusable Ansible playbook templates
  - `id` (uuid, primary key)
  - `name` (text) - Template name
  - `description` (text) - Template description
  - `category` (text) - Category (security, deployment, monitoring, etc.)
  - `playbook_yaml` (text) - Complete Ansible playbook YAML
  - `parameters` (jsonb) - Required parameters and their schema
  - `tags` (text[]) - Tags for filtering
  - `created_by` (uuid) - User who created the template
  - `organization_id` (uuid) - Organization owner
  - `is_public` (boolean) - Available to all organizations
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `execution_jobs`
  Tracks playbook execution jobs
  - `id` (uuid, primary key)
  - `organization_id` (uuid) - Organization running the job
  - `environment_id` (uuid) - Target environment (nullable for multi-env)
  - `playbook_template_id` (uuid) - Template being executed (nullable for custom)
  - `playbook_content` (text) - Actual playbook content executed
  - `parameters` (jsonb) - Runtime parameters provided
  - `status` (text) - pending, running, completed, failed, cancelled
  - `priority` (text) - low, normal, high, critical
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `started_by` (uuid) - User who started the job
  - `exit_code` (integer)
  - `execution_time_ms` (integer)
  - `created_at` (timestamptz)

  ### `execution_logs`
  Stores real-time execution logs
  - `id` (uuid, primary key)
  - `job_id` (uuid) - Foreign key to execution_jobs
  - `timestamp` (timestamptz)
  - `level` (text) - debug, info, warning, error
  - `message` (text) - Log message
  - `task_name` (text) - Ansible task name (if applicable)
  - `host` (text) - Target host (if applicable)
  - `metadata` (jsonb) - Additional structured data

  ### `execution_artifacts`
  Stores execution outputs and artifacts
  - `id` (uuid, primary key)
  - `job_id` (uuid) - Foreign key to execution_jobs
  - `artifact_type` (text) - stdout, stderr, report, config, etc.
  - `content` (text) - Artifact content
  - `file_name` (text) - Original filename
  - `size_bytes` (integer)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Policies ensure organization isolation
  - Users can only access their organization's data
  - Admin role required for template management

  ## Important Notes
  - All timestamps use UTC
  - JSONB fields allow flexible parameter schemas
  - Logs are retained for audit purposes
  - Artifacts can be cleaned up based on retention policy
*/

-- Create playbook_templates table
CREATE TABLE IF NOT EXISTS playbook_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  playbook_yaml text NOT NULL,
  parameters jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  created_by uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_templates_org ON playbook_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_category ON playbook_templates(category);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_public ON playbook_templates(is_public) WHERE is_public = true;

-- Create execution_jobs table
CREATE TABLE IF NOT EXISTS execution_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  environment_id uuid REFERENCES cloud_environments(id) ON DELETE SET NULL,
  playbook_template_id uuid REFERENCES playbook_templates(id) ON DELETE SET NULL,
  playbook_content text NOT NULL,
  parameters jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  started_at timestamptz,
  completed_at timestamptz,
  started_by uuid NOT NULL REFERENCES auth.users(id),
  exit_code integer,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execution_jobs_org ON execution_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_env ON execution_jobs(environment_id);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_status ON execution_jobs(status);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_created ON execution_jobs(created_at DESC);

-- Create execution_logs table
CREATE TABLE IF NOT EXISTS execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES execution_jobs(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warning', 'error')),
  message text NOT NULL,
  task_name text,
  host text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_job ON execution_logs(job_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_execution_logs_level ON execution_logs(level) WHERE level IN ('error', 'warning');

-- Create execution_artifacts table
CREATE TABLE IF NOT EXISTS execution_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES execution_jobs(id) ON DELETE CASCADE,
  artifact_type text NOT NULL,
  content text NOT NULL,
  file_name text,
  size_bytes integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execution_artifacts_job ON execution_artifacts(job_id);
CREATE INDEX IF NOT EXISTS idx_execution_artifacts_type ON execution_artifacts(artifact_type);

-- Enable RLS
ALTER TABLE playbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playbook_templates
CREATE POLICY "Users can view public templates"
  ON playbook_templates FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can view org templates"
  ON playbook_templates FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage org templates"
  ON playbook_templates FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for execution_jobs
CREATE POLICY "Users can view org jobs"
  ON execution_jobs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create jobs"
  ON execution_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

CREATE POLICY "Members can update org jobs"
  ON execution_jobs FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

-- RLS Policies for execution_logs
CREATE POLICY "Users can view org job logs"
  ON execution_logs FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM execution_jobs
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert logs"
  ON execution_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for execution_artifacts
CREATE POLICY "Users can view org job artifacts"
  ON execution_artifacts FOR SELECT
  TO authenticated
  USING (
    job_id IN (
      SELECT id FROM execution_jobs
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert artifacts"
  ON execution_artifacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert some default public playbook templates
INSERT INTO playbook_templates (name, description, category, playbook_yaml, parameters, is_public, tags) VALUES
(
  'Security Audit Basic',
  'Basic security audit playbook for Linux servers',
  'security',
  '---
- name: Security Audit
  hosts: all
  become: yes
  tasks:
    - name: Check for updates
      apt:
        update_cache: yes
      when: ansible_os_family == "Debian"
    
    - name: Check firewall status
      command: ufw status
      register: firewall_status
      ignore_errors: yes
    
    - name: List open ports
      shell: netstat -tuln
      register: open_ports
    
    - name: Check SSH configuration
      command: sshd -T
      register: ssh_config',
  '[{"name": "target_hosts", "type": "string", "required": true, "description": "Target hosts or groups"}]'::jsonb,
  true,
  ARRAY['security', 'audit', 'linux']
),
(
  'Deploy Application',
  'Deploy application from Git repository',
  'deployment',
  '---
- name: Deploy Application
  hosts: "{{ target_hosts }}"
  become: yes
  vars:
    app_user: "{{ app_user | default(''appuser'') }}"
    app_dir: "{{ app_dir | default(''/var/www/app'') }}"
  tasks:
    - name: Install Git
      apt:
        name: git
        state: present
    
    - name: Clone repository
      git:
        repo: "{{ git_repo }}"
        dest: "{{ app_dir }}"
        version: "{{ git_branch | default(''main'') }}"
    
    - name: Install dependencies
      command: npm install
      args:
        chdir: "{{ app_dir }}"
    
    - name: Restart application service
      systemd:
        name: "{{ service_name }}"
        state: restarted',
  '[
    {"name": "target_hosts", "type": "string", "required": true},
    {"name": "git_repo", "type": "string", "required": true},
    {"name": "git_branch", "type": "string", "required": false, "default": "main"},
    {"name": "service_name", "type": "string", "required": true}
  ]'::jsonb,
  true,
  ARRAY['deployment', 'git', 'application']
),
(
  'System Monitoring Setup',
  'Configure monitoring and alerting',
  'monitoring',
  '---
- name: Setup Monitoring
  hosts: all
  become: yes
  tasks:
    - name: Install monitoring tools
      apt:
        name:
          - prometheus-node-exporter
          - collectd
        state: present
    
    - name: Start node exporter
      systemd:
        name: prometheus-node-exporter
        state: started
        enabled: yes
    
    - name: Configure collectd
      template:
        src: collectd.conf.j2
        dest: /etc/collectd/collectd.conf',
  '[{"name": "target_hosts", "type": "string", "required": true}]'::jsonb,
  true,
  ARRAY['monitoring', 'prometheus', 'metrics']
);
