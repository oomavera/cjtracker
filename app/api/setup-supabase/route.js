import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient.js';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({
        error: 'Supabase client not initialized. Check your environment variables.'
      }, { status: 500 });
    }

    // Create gmail_tokens table
    const { error: tokensTableError } = await supabase.rpc('exec_sql', {
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

    // Create notified_emails table
    const { error: emailsTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS notified_emails (
          id SERIAL PRIMARY KEY,
          message_id TEXT UNIQUE NOT NULL,
          notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Since we can't use rpc to execute DDL directly via the client,
    // we'll need to use the SQL editor in Supabase dashboard
    // For now, just test if we can access the tables

    const { error: testError } = await supabase
      .from('gmail_tokens')
      .select('id')
      .limit(1);

    if (testError && testError.code === '42P01') {
      // Table doesn't exist
      return NextResponse.json({
        success: false,
        message: 'Tables not found. Please run the SQL schema in Supabase SQL Editor.',
        instructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to SQL Editor',
          '3. Copy the contents of supabase-schema.sql',
          '4. Paste and execute in the SQL Editor',
          '5. Return here and refresh'
        ],
        sqlFile: 'supabase-schema.sql'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase tables are ready!',
      tables: ['gmail_tokens', 'notified_emails']
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      error: error.message,
      hint: 'Please run the SQL schema manually in Supabase SQL Editor'
    }, { status: 500 });
  }
}
