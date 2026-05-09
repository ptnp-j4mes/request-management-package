-- google_bot_accounts must come before project_meeting_settings (FK dependency)
CREATE TABLE IF NOT EXISTS google_bot_accounts (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  account_type VARCHAR(50) NOT NULL DEFAULT 'BOT',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  calendar_id VARCHAR(255),
  drive_folder_id VARCHAR(255),
  auth_profile_path TEXT,
  oauth_credential_ref TEXT,
  max_parallel_meetings INTEGER NOT NULL DEFAULT 1,
  current_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  last_login_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  last_error TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS google_bot_account_sessions (
  id BIGSERIAL PRIMARY KEY,
  google_bot_account_id BIGINT NOT NULL REFERENCES google_bot_accounts(id) ON DELETE CASCADE,
  session_status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  profile_path TEXT,
  cookie_expires_at TIMESTAMPTZ,
  requires_relogin BOOLEAN NOT NULL DEFAULT FALSE,
  requires_2fa BOOLEAN NOT NULL DEFAULT FALSE,
  last_checked_at TIMESTAMPTZ,
  last_success_login_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_meeting_settings (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  meeting_bot_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sync_mode VARCHAR(50) NOT NULL DEFAULT 'OFF',
  conflict_policy VARCHAR(50) NOT NULL DEFAULT 'LATEST_UPDATE_WINS',
  multiple_google_accounts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  default_google_bot_account_id BIGINT REFERENCES google_bot_accounts(id) ON DELETE SET NULL,
  account_selection_policy VARCHAR(50) NOT NULL DEFAULT 'LEAST_BUSY',
  fallback_account_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  bot_email VARCHAR(255),
  auto_join_before_minutes INTEGER NOT NULL DEFAULT 3,
  auto_leave_after_minutes INTEGER NOT NULL DEFAULT 10,
  auto_record BOOLEAN NOT NULL DEFAULT TRUE,
  auto_transcribe BOOLEAN NOT NULL DEFAULT TRUE,
  auto_summarize BOOLEAN NOT NULL DEFAULT TRUE,
  summary_provider VARCHAR(50) NOT NULL DEFAULT 'GEMINI',
  summary_pattern VARCHAR(100) NOT NULL DEFAULT 'BA_REQUIREMENT',
  google_calendar_id VARCHAR(255),
  google_calendar_event_id VARCHAR(255),
  google_meet_url TEXT,
  last_project_sync_at TIMESTAMPTZ,
  last_google_sync_at TIMESTAMPTZ,
  sync_status VARCHAR(50) NOT NULL DEFAULT 'IDLE',
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_meetings (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  meeting_url TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  timezone VARCHAR(100) DEFAULT 'Asia/Bangkok',
  google_calendar_id VARCHAR(255),
  google_calendar_event_id VARCHAR(255),
  google_event_etag VARCHAR(255),
  google_updated_at TIMESTAMPTZ,
  source_of_truth VARCHAR(50) DEFAULT 'PROJECT',
  sync_status VARCHAR(50) DEFAULT 'IDLE',
  sync_error TEXT,
  google_bot_account_id BIGINT REFERENCES google_bot_accounts(id) ON DELETE SET NULL,
  selected_bot_email VARCHAR(255),
  account_selection_reason TEXT,
  bot_status VARCHAR(50) DEFAULT 'SCHEDULED',
  recording_status VARCHAR(50) DEFAULT 'PENDING',
  summary_status VARCHAR(50) DEFAULT 'PENDING',
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  recording_drive_file_id VARCHAR(255),
  recording_file_url TEXT,
  transcript_text TEXT,
  summary_markdown TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_bot_logs (
  id BIGSERIAL PRIMARY KEY,
  meeting_id BIGINT NOT NULL REFERENCES project_meetings(id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_action_items (
  id BIGSERIAL PRIMARY KEY,
  meeting_id BIGINT NOT NULL REFERENCES project_meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  owner_name VARCHAR(255),
  owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
