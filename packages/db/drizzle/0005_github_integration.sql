ALTER TABLE users
  ADD COLUMN IF NOT EXISTS github_username varchar(100);

CREATE TABLE IF NOT EXISTS project_github_settings (
  id bigserial PRIMARY KEY,
  project_id bigint UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repo_owner varchar(100) NOT NULL,
  repo_name varchar(200) NOT NULL,
  default_branch varchar(100) NOT NULL DEFAULT 'main',
  access_token text,
  connected_by_user_id bigint REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
