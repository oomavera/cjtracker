import { NextResponse } from 'next/server';
import { getStoredTokens } from '../../../lib/token-storage.js';

export async function POST(request) {
  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    const tokens = getStoredTokens();
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }
    
    // Set up Gmail watch for push notifications
    const watchRequest = {
      topicName: `projects/${projectId}/topics/gmail-notifications`,
      labelIds: ["INBOX", "SPAM"] // Monitor both inbox and spam
    };
    
    console.log('Setting up Gmail watch with:', watchRequest);
    
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(watchRequest),
    });
    
    const responseText = await response.text();
    console.log('Gmail watch setup attempt:', watchRequest);
    console.log('Gmail watch response status:', response.status);
    console.log('Gmail watch response:', responseText);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to set up Gmail watch', 
        details: responseText,
        status: response.status,
        requestSent: watchRequest,
        troubleshooting: {
          step1: "Make sure Pub/Sub API is enabled in Google Cloud Console",
          step2: "Create topic 'gmail-notifications' in Pub/Sub",
          step3: "Create push subscription with correct endpoint URL",
          step4: "Make sure the project ID matches your Google Cloud project"
        }
      }, { status: 400 });
    }
    
    const result = JSON.parse(responseText);
    
    return NextResponse.json({ 
      success: true, 
      watchResponse: result,
      message: 'Gmail push notifications activated! You will now receive instant notifications.'
    });
    
  } catch (error) {
    console.error('Error setting up Gmail watch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get current watch status
export async function GET() {
  try {
    const tokens = getStoredTokens();
    if (!tokens || !tokens.accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }
    
    // Check current Gmail watch status
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get Gmail profile' }, { status: 400 });
    }
    
    const profile = await response.json();
    
    return NextResponse.json({ 
      success: true,
      profile: profile,
      instructions: {
        step1: "Create Pub/Sub topic 'gmail-notifications' in Google Cloud Console",
        step2: "Create push subscription pointing to /api/gmail-webhook",
        step3: "Use POST /api/setup-gmail-watch with your project ID",
        step4: "Test by sending email with 'New Direct Lead' in subject"
      }
    });
    
  } catch (error) {
    console.error('Error getting Gmail status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}