import { NextResponse } from 'next/server';
import { getStoredTokens } from '../../../lib/token-storage.js';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Gmail webhook received:', body);
    
    // Decode the Pub/Sub message
    if (body.message && body.message.data) {
      const messageData = Buffer.from(body.message.data, 'base64').toString('utf-8');
      const parsedData = JSON.parse(messageData);
      
      console.log('Gmail notification:', parsedData);
      
      // Check for new emails immediately when notification received
      const tokens = getStoredTokens();
      if (tokens && tokens.accessToken) {
        // Check recent emails (last 2 minutes to catch the new one)
        const query = `is:unread newer_than:2m in:anywhere`;
        
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
          {
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const messages = data.messages || [];
          
          // Check each message for lead emails
          for (const message of messages) {
            const messageResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
              {
                headers: {
                  'Authorization': `Bearer ${tokens.accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            if (messageResponse.ok) {
              const messageData = await messageResponse.json();
              const headers = messageData.payload.headers;
              const subject = headers.find(h => h.name === 'Subject')?.value || '';
              
              if (subject.toLowerCase().includes('new direct lead')) {
                // Send instant notification
                const telegramMessage = `New Thumbtack Lead - ${new Date().toLocaleString()}`;
                
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: process.env.TELEGRAM_CHAT_ID,
                    text: telegramMessage
                  }),
                });
                
                console.log('Instant notification sent for webhook trigger');
                break;
              }
            }
          }
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Handle Gmail webhook verification
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: 'Gmail webhook endpoint ready' });
}