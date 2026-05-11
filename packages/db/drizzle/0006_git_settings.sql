ALTER TABLE mit_items
  ADD COLUMN IF NOT EXISTS github_branch_name varchar(255),
  ADD COLUMN IF NOT EXISTS github_pr_url varchar(500),
  ADD COLUMN IF NOT EXISTS github_pr_number integer;

CREATE TABLE IF NOT EXISTS system_github_account (
  id bigserial PRIMARY KEY,
  label varchar(100) NOT NULL DEFAULT 'default',
  github_username varchar(100),
  access_token text,
  token_scope varchar(255),
  connected_by_user_id bigint REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
