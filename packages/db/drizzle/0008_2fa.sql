-- Migration 0008: Two-factor authentication support

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "otp_tokens" (
  "id"         bigserial PRIMARY KEY,
  "user_id"    bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "code"       varchar(6) NOT NULL,
  "purpose"    varchar(30) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at"    timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "otp_tokens_user_id_idx" ON "otp_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "otp_tokens_expires_idx" ON "otp_tokens"("expires_at");
