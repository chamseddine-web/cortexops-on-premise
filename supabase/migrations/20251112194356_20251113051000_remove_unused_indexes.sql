/*
  # Remove Unused Indexes

  1. Performance Improvements
    - Remove indexes that are never used to reduce storage overhead
    - Reduce write operation overhead (INSERT/UPDATE/DELETE)
    - Simplify index maintenance
    
  2. Indexes Being Removed (6 indexes)
    - idx_api_keys_client_id on api_keys
    - idx_api_usage_api_key_id on api_usage
    - idx_api_usage_user_id on api_usage
    - idx_api_usage_logs_api_key_id on api_usage_logs
    - idx_api_usage_logs_client_id on api_usage_logs
    - idx_professional_profiles_user_id on professional_profiles

  3. Rationale
    - These indexes have not been used according to pg_stat_user_indexes
    - Queries likely use primary keys or other indexes instead
    - Removing unused indexes improves write performance
    
  4. Notes
    - Keep the foreign key indexes we just added
    - These unused indexes are redundant or not in query patterns
*/

-- Remove unused index on api_keys
DROP INDEX IF EXISTS public.idx_api_keys_client_id;

-- Remove unused indexes on api_usage
DROP INDEX IF EXISTS public.idx_api_usage_api_key_id;
DROP INDEX IF EXISTS public.idx_api_usage_user_id;

-- Remove unused indexes on api_usage_logs
DROP INDEX IF EXISTS public.idx_api_usage_logs_api_key_id;
DROP INDEX IF EXISTS public.idx_api_usage_logs_client_id;

-- Remove unused index on professional_profiles (we have unique constraint on user_id already)
DROP INDEX IF EXISTS public.idx_professional_profiles_user_id;