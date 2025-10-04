import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhook/gmail`;
    
    // Set up Gmail push notifications
    const watchResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/gmail-notifications`,
        labelIds: ['INBOX'],
        labelFilterBehavior: 'include'
      }),
    });

    if (!watchResponse.ok) {
      const errorText = await watchResponse.text();
      console.error('Failed to set up Gmail watch:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to set up Gmail push notifications' },
        { status: 400 }
      );
    }

    const watchData = await watchResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Gmail push notifications configured successfully',
      watchData: {
        historyId: watchData.historyId,
        expiration: watchData.expiration
      },
      webhookUrl,
      note: 'Gmail will send notifications to your webhook when new emails arrive in your inbox'
    });

  } catch (error) {
    console.error('Gmail webhook setup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
