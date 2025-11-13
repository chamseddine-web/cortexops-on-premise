/*
  # Remove Unused Indexes

  ## Changes Made
  
  This migration removes database indexes that have been flagged as unused by the database monitoring system.
  These indexes consume storage space and slow down write operations without providing query performance benefits.

  ### Indexes Removed:
  1. idx_api_keys_user_id - Not being used for queries
  2. idx_audit_logs_organization_id - Not being used for queries
  3. idx_audit_logs_user_id - Not being used for queries
  4. idx_blueprint_playbooks_blueprint_id - Not being used for queries
  5. idx_blueprint_roles_blueprint_id - Not being used for queries
  6. idx_blueprint_structures_blueprint_id - Not being used for queries
  7. idx_execution_artifacts_job_id - Not being used for queries
  8. idx_execution_jobs_environment_id - Not being used for queries
  9. idx_execution_jobs_playbook_template_id - Not being used for queries
  10. idx_execution_jobs_started_by - Not being used for queries
  11. idx_execution_logs_job_id - Not being used for queries
  12. idx_generated_projects_blueprint_id - Not being used for queries
  13. idx_generated_projects_user_id - Not being used for queries
  14. idx_organization_members_invited_by - Not being used for queries
  15. idx_payment_history_plan_id - Not being used for queries
  16. idx_payment_history_user_id - Not being used for queries
  17. idx_playbook_generations_user_id - Not being used for queries
  18. idx_playbook_templates_created_by - Not being used for queries
  19. idx_playbook_templates_organization_id - Not being used for queries
  20. idx_scan_results_environment_id - Not being used for queries
  21. idx_user_progress_lesson_id - Not being used for queries

  ## Performance Impact
  - Reduces storage overhead
  - Improves INSERT/UPDATE/DELETE performance
  - No impact on current query patterns (indexes are unused)

  ## Note
  If query patterns change in the future and these indexes become necessary,
  they can be recreated using CREATE INDEX statements.
*/

-- Remove all unused indexes
DROP INDEX IF EXISTS public.idx_api_keys_user_id;
DROP INDEX IF EXISTS public.idx_audit_logs_organization_id;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;
DROP INDEX IF EXISTS public.idx_blueprint_playbooks_blueprint_id;
DROP INDEX IF EXISTS public.idx_blueprint_roles_blueprint_id;
DROP INDEX IF EXISTS public.idx_blueprint_structures_blueprint_id;
DROP INDEX IF EXISTS public.idx_execution_artifacts_job_id;
DROP INDEX IF EXISTS public.idx_execution_jobs_environment_id;
DROP INDEX IF EXISTS public.idx_execution_jobs_playbook_template_id;
DROP INDEX IF EXISTS public.idx_execution_jobs_started_by;
DROP INDEX IF EXISTS public.idx_execution_logs_job_id;
DROP INDEX IF EXISTS public.idx_generated_projects_blueprint_id;
DROP INDEX IF EXISTS public.idx_generated_projects_user_id;
DROP INDEX IF EXISTS public.idx_organization_members_invited_by;
DROP INDEX IF EXISTS public.idx_payment_history_plan_id;
DROP INDEX IF EXISTS public.idx_payment_history_user_id;
DROP INDEX IF EXISTS public.idx_playbook_generations_user_id;
DROP INDEX IF EXISTS public.idx_playbook_templates_created_by;
DROP INDEX IF EXISTS public.idx_playbook_templates_organization_id;
DROP INDEX IF EXISTS public.idx_scan_results_environment_id;
DROP INDEX IF EXISTS public.idx_user_progress_lesson_id;