import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Environment variables not set',
        environment: {
          url: supabaseUrl ? 'Set' : 'Not set',
          key: supabaseKey ? 'Set' : 'Not set'
        }
      });
    }

    // Test basic network connectivity to Supabase
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            url: supabaseUrl
          }
        });
      }

      // If we get here, basic connectivity works
      return NextResponse.json({
        success: true,
        message: 'Basic Supabase connectivity successful',
        environment: {
          url: 'Set',
          key: 'Set'
        },
        details: {
          supabaseUrl: supabaseUrl,
          responseStatus: response.status
        }
      });

    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: 'Network connection failed',
        details: {
          message: fetchError.message,
          name: fetchError.name,
          supabaseUrl: supabaseUrl
        }
      });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
