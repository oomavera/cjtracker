import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SECRET_KEY;

console.log('🚀 Creating Supabase tables...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Since we can't execute DDL via the REST API, we'll output instructions
console.log('📋 Please run this SQL in your Supabase SQL Editor:');
console.log('=' . repeat(60));
console.log(`
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

DROP TRIGGER IF EXISTS trigger_cleanup_old_tokens ON gmail_tokens;

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
`);
console.log('=' + '='.repeat(59));
console.log('\n📍 Steps:');
console.log('1. Go to: https://supabase.com/dashboard/project/dhipqtfzdmycengszmta/sql/new');
console.log('2. Copy the SQL above');
console.log('3. Paste and click "Run"');
console.log('4. Come back here and press Enter when done\n');

// Wait for user input
process.stdin.once('data', async () => {
  console.log('\n✅ Verifying tables...');

  try {
    const { data: tokensTest, error: error1 } = await supabase
      .from('gmail_tokens')
      .select('id')
      .limit(1);

    const { data: emailsTest, error: error2 } = await supabase
      .from('notified_emails')
      .select('id')
      .limit(1);

    if (error1 || error2) {
      console.log('❌ Tables not found. Please make sure you ran the SQL.');
      console.log('Error details:');
      if (error1) console.log('  gmail_tokens:', error1.message);
      if (error2) console.log('  notified_emails:', error2.message);
      process.exit(1);
    }

    console.log('✅ gmail_tokens table verified');
    console.log('✅ notified_emails table verified');
    console.log('\n🎉 Setup complete! Your app is ready for production deployment.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
});

console.log('Press Enter after running the SQL...');
