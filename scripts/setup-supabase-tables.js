import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTables() {
  console.log('🚀 Setting up Supabase tables...\n');

  try {
    // Create gmail_tokens table
    console.log('📝 Creating gmail_tokens table...');
    const { error: tokensTableError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS gmail_tokens (
          id SERIAL PRIMARY KEY,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_time BIGINT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (tokensTableError) {
      // Try direct table creation via REST API
      console.log('📝 Using alternative method to create tables...');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql: `
            CREATE TABLE IF NOT EXISTS gmail_tokens (
              id SERIAL PRIMARY KEY,
              access_token TEXT NOT NULL,
              refresh_token TEXT,
              token_time BIGINT NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS notified_emails (
              id SERIAL PRIMARY KEY,
              message_id TEXT UNIQUE NOT NULL,
              notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_notified_emails_message_id ON notified_emails(message_id);
            CREATE INDEX IF NOT EXISTS idx_notified_emails_notified_at ON notified_emails(notified_at);

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
          `
        })
      });

      if (!response.ok) {
        console.log('⚠️  RPC method not available. Using direct SQL execution...');

        // Execute SQL statements one by one using the Postgres connection
        const statements = [
          `CREATE TABLE IF NOT EXISTS gmail_tokens (
            id SERIAL PRIMARY KEY,
            access_token TEXT NOT NULL,
            refresh_token TEXT,
            token_time BIGINT NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )`,
          `CREATE TABLE IF NOT EXISTS notified_emails (
            id SERIAL PRIMARY KEY,
            message_id TEXT UNIQUE NOT NULL,
            notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )`,
          `CREATE INDEX IF NOT EXISTS idx_notified_emails_message_id ON notified_emails(message_id)`,
          `CREATE INDEX IF NOT EXISTS idx_notified_emails_notified_at ON notified_emails(notified_at)`,
          `CREATE OR REPLACE FUNCTION cleanup_old_tokens()
          RETURNS TRIGGER AS $$
          BEGIN
            DELETE FROM gmail_tokens WHERE id != NEW.id;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql`,
          `DROP TRIGGER IF EXISTS trigger_cleanup_old_tokens ON gmail_tokens`,
          `CREATE TRIGGER trigger_cleanup_old_tokens
            AFTER INSERT ON gmail_tokens
            FOR EACH ROW
            EXECUTE FUNCTION cleanup_old_tokens()`,
          `CREATE OR REPLACE FUNCTION delete_old_notifications(keep_count INT)
          RETURNS void AS $$
          BEGIN
            DELETE FROM notified_emails
            WHERE id NOT IN (
              SELECT id FROM notified_emails
              ORDER BY notified_at DESC
              LIMIT keep_count
            );
          END;
          $$ LANGUAGE plpgsql`
        ];

        console.log('📝 Executing SQL statements via Supabase Management API...');

        for (const sql of statements) {
          const execResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ query: sql })
          });
        }
      }
    }

    // Test if tables exist by trying to query them
    console.log('\n✅ Verifying tables...');

    const { error: testError1 } = await supabase
      .from('gmail_tokens')
      .select('id')
      .limit(1);

    const { error: testError2 } = await supabase
      .from('notified_emails')
      .select('id')
      .limit(1);

    if (testError1 || testError2) {
      console.log('\n⚠️  Tables may not exist yet. Error details:');
      if (testError1) console.log('gmail_tokens:', testError1);
      if (testError2) console.log('notified_emails:', testError2);
      console.log('\n📋 Please run the SQL manually:');
      console.log('1. Go to your Supabase dashboard → SQL Editor');
      console.log('2. Copy and run the contents of supabase-schema.sql');
      process.exit(1);
    }

    console.log('✅ gmail_tokens table is accessible');
    console.log('✅ notified_emails table is accessible');

    console.log('\n🎉 Supabase setup complete!');
    console.log('\n📊 You can now:');
    console.log('  • Deploy to Vercel - token storage will work');
    console.log('  • Cron jobs will use persistent storage');
    console.log('  • No more local file dependencies');

  } catch (error) {
    console.error('\n❌ Error setting up tables:', error.message);
    console.log('\n📋 Please run the SQL manually in Supabase SQL Editor');
    console.log('   File: supabase-schema.sql');
    process.exit(1);
  }
}

setupTables();
