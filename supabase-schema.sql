-- Create table for storing Gmail OAuth tokens
CREATE TABLE IF NOT EXISTS gmail_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_time BIGINT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for tracking notified emails
CREATE TABLE IF NOT EXISTS notified_emails (
  id SERIAL PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on message_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_notified_emails_message_id ON notified_emails(message_id);

-- Create index on notified_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_notified_emails_notified_at ON notified_emails(notified_at);

-- Only keep the most recent token (delete old ones when inserting new)
CREATE OR REPLACE FUNCTION cleanup_old_tokens()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM gmail_tokens WHERE id != NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_old_tokens
  AFTER INSERT ON gmail_tokens
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_tokens();

-- Function to cleanup old notified emails (keep only last N)
CREATE OR REPLACE FUNCTION delete_old_notifications(keep_count INT)
RETURNS void AS $$
BEGIN
  DELETE FROM notified_emails
  WHERE id NOT IN (
    SELECT id FROM notified_emails
    ORDER BY notified_at DESC
    LIMIT keep_count
  );
END;
$$ LANGUAGE plpgsql;
