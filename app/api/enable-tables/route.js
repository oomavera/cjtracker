import { NextResponse } from 'next/server';
import pkg from 'pg';
const { Client } = pkg;

export async function POST() {
  let client;

  try {
    const connectionString = `postgresql://postgres:${process.env.DATABASE_PASSWORD}@db.dhipqtfzdmycengszmta.supabase.co:5432/postgres`;

    client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Connected to Supabase');

    // Enable RLS and create policies
    const sql = `
      -- Enable RLS on tables
      ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;
      ALTER TABLE notified_emails ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Service role can do everything on gmail_tokens" ON gmail_tokens;
      DROP POLICY IF EXISTS "Service role can do everything on notified_emails" ON notified_emails;
      DROP POLICY IF EXISTS "Anon can do everything on gmail_tokens" ON gmail_tokens;
      DROP POLICY IF EXISTS "Anon can do everything on notified_emails" ON notified_emails;

      -- Create policies to allow service role access
      CREATE POLICY "Service role can do everything on gmail_tokens"
      ON gmail_tokens
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

      CREATE POLICY "Service role can do everything on notified_emails"
      ON notified_emails
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

      -- Also allow anon role for now
      CREATE POLICY "Anon can do everything on gmail_tokens"
      ON gmail_tokens
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);

      CREATE POLICY "Anon can do everything on notified_emails"
      ON notified_emails
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);

      -- Notify PostgREST to reload schema
      NOTIFY pgrst, 'reload schema';
    `;

    await client.query(sql);
    await client.end();

    return NextResponse.json({
      success: true,
      message: 'RLS policies enabled and schema reloaded!',
      note: 'Tables are now accessible via API'
    });

  } catch (error) {
    if (client) await client.end();
    console.error('Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to enable tables',
    endpoint: '/api/enable-tables',
    method: 'POST'
  });
}
