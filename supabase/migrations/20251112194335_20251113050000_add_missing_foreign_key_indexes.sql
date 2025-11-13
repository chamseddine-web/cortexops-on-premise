/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes on all foreign key columns that lack covering indexes
    - This will dramatically improve JOIN performance and foreign key constraint checks
    
  2. Tables Affected (21 indexes)
    - api_keys: user_id
    - audit_logs: organization_id, user_id
    - blueprint_playbooks: blueprint_id
    - blueprint_roles: blueprint_id
    - blueprint_structures: blueprint_id
    - execution_artifacts: job_id
    - execution_jobs: environment_id, playbook_template_id, started_by
    - execution_logs: job_id
    - generated_projects: blueprint_id, user_id
    - organization_members: invited_by
    - payment_history: plan_id, user_id
    - playbook_generations: user_id
    - playbook_templates: created_by, organization_id
    - scan_results: environment_id
    - user_progress: lesson_id

  3. Expected Impact
    - 5-100x faster JOIN queries on these tables
    - Reduced lock contention on foreign key operations
    - Better query plan optimization
*/

-- api_keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- blueprint_playbooks
CREATE INDEX IF NOT EXISTS idx_blueprint_playbooks_blueprint_id ON public.blueprint_playbooks(blueprint_id);

-- blueprint_roles
CREATE INDEX IF NOT EXISTS idx_blueprint_roles_blueprint_id ON public.blueprint_roles(blueprint_id);

-- blueprint_structures
CREATE INDEX IF NOT EXISTS idx_blueprint_structures_blueprint_id ON public.blueprint_structures(blueprint_id);

-- execution_artifacts
CREATE INDEX IF NOT EXISTS idx_execution_artifacts_job_id ON public.execution_artifacts(job_id);

-- execution_jobs
CREATE INDEX IF NOT EXISTS idx_execution_jobs_environment_id ON public.execution_jobs(environment_id);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_playbook_template_id ON public.execution_jobs(playbook_template_id);
CREATE INDEX IF NOT EXISTS idx_execution_jobs_started_by ON public.execution_jobs(started_by);

-- execution_logs
CREATE INDEX IF NOT EXISTS idx_execution_logs_job_id ON public.execution_logs(job_id);

-- generated_projects
CREATE INDEX IF NOT EXISTS idx_generated_projects_blueprint_id ON public.generated_projects(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_generated_projects_user_id ON public.generated_projects(user_id);

-- organization_members
CREATE INDEX IF NOT EXISTS idx_organization_members_invited_by ON public.organization_members(invited_by);

-- payment_history
CREATE INDEX IF NOT EXISTS idx_payment_history_plan_id ON public.payment_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);

-- playbook_generations
CREATE INDEX IF NOT EXISTS idx_playbook_generations_user_id ON public.playbook_generations(user_id);

-- playbook_templates
CREATE INDEX IF NOT EXISTS idx_playbook_templates_created_by ON public.playbook_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_playbook_templates_organization_id ON public.playbook_templates(organization_id);

-- scan_results
CREATE INDEX IF NOT EXISTS idx_scan_results_environment_id ON public.scan_results(environment_id);

-- user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON public.user_progress(lesson_id);