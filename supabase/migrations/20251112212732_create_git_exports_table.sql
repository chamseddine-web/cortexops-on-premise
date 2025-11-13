/*
  # Git Exports Table

  1. New Tables
    - `git_exports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `provider` (text) - 'github' or 'gitlab'
      - `repository` (text) - full repository path (owner/repo)
      - `branch` (text) - branch name
      - `commit_sha` (text) - commit SHA
      - `playbook_name` (text) - name of the exported playbook
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `git_exports` table
    - Add policy for authenticated users to manage their own exports
*/

CREATE TABLE IF NOT EXISTS git_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL CHECK (provider IN ('github', 'gitlab')),
  repository text NOT NULL,
  branch text NOT NULL DEFAULT 'main',
  commit_sha text NOT NULL,
  playbook_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE git_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own git exports"
  ON git_exports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own git exports"
  ON git_exports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own git exports"
  ON git_exports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_git_exports_user_id ON git_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_git_exports_created_at ON git_exports(created_at DESC);
