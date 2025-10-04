import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Supabase not configured',
        environment: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
        }
      });
    }

    // Test connection by fetching customers
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(5);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      customerCount: data ? data.length : 0,
      sampleData: data ? data.slice(0, 2) : [],
      environment: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
