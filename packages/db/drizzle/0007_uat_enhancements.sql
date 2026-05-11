-- Migration 0007: UAT cycle comments and defect tracking
CREATE TABLE IF NOT EXISTS uat_cycle_comments (
  id bigserial PRIMARY KEY,
  uat_cycle_id bigint NOT NULL REFERENCES uat_cycles(id) ON DELETE CASCADE,
  test_case_id bigint REFERENCES uat_test_cases(id) ON DELETE SET NULL,
  created_by_user_id bigint REFERENCES users(id),
  comment_text text NOT NULL,
  comment_type varchar(50) NOT NULL DEFAULT 'comment',
  severity varchar(50),
  status varchar(50) NOT NULL DEFAULT 'open',
  linked_request_id bigint REFERENCES requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
