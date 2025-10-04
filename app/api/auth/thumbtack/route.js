import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirect_to') || '/setup';

    // Generate state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store state in session/cookie for validation (simplified for demo)
    const response = NextResponse.redirect(
      `https://api.thumbtack.com/api/v4/oauth/authorize?` +
      `client_id=${process.env.THUMBTACK_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.THUMBTACK_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=read_businesses+read_negotiations+read_messages+read_reviews&` +
      `state=${state}`
    );

    // Store state in cookie for validation
    response.cookies.set('thumbtack_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });

    return response;

  } catch (error) {
    console.error('OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
