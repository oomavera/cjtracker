import { NextResponse } from 'next/server';
import pkg from 'pg';
const { Client } = pkg;

export async function POST() {
  let client;

  try {
    // Use direct connection (not pooler) for DDL operations
    // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
    const connectionString = `postgresql://postgres:${process.env.DATABASE_PASSWORD}@db.dhipqtfzdmycengszmta.supabase.co:5432/postgres`;

    client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      options: '-c search_path=public'
    });

    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    // Execute the SQL schema
    const sql = `
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

      -- Drop trigger if it exists
      DROP TRIGGER IF EXISTS trigger_cleanup_old_tokens ON gmail_tokens;

      -- Create trigger
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
    `;

    await client.query(sql);
    console.log('✅ Tables created successfully');

    // Verify tables exist
    const verifyResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('gmail_tokens', 'notified_emails')
      ORDER BY table_name
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Supabase tables created successfully!',
      tables: verifyResult.rows.map(r => r.table_name),
      details: {
        gmail_tokens: 'Stores OAuth tokens',
        notified_emails: 'Tracks sent notifications'
      }
    });

  } catch (error) {
    if (client) {
      await client.end();
    }

    console.error('❌ Error creating tables:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      hint: 'Check your DATABASE_PASSWORD and connection settings'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method to create tables',
    endpoint: '/api/create-tables',
    method: 'POST'
  });
}
