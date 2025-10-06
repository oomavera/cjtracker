import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '../../../lib/telegram.js';
import { storeTokens, getStoredTokens, isEmailAlreadyNotified, markEmailAsNotified } from '../../../lib/token-storage.js';

export async function POST(request) {
  try {
    const { access_token, refresh_token } = await request.json();

    if (access_token) {
      await storeTokens(access_token, refresh_token || null);
    }

    // Check for new emails immediately
    const result = await checkForNewLeadEmails();

    return NextResponse.json(result);

  } catch (error) {
    console.error('Gmail polling error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // This will be called by a cron job or interval
  try {
    const result = await checkForNewLeadEmails();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Gmail polling error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function checkForNewLeadEmails() {
  const tokens = await getStoredTokens();
  if (!tokens || !tokens.accessToken) {
    return { success: false, error: 'No access token available' };
  }

  let accessToken = tokens.accessToken;
  
  // Check if token might be expired (tokens are valid for 1 hour)
  const tokenAge = Date.now() - (tokens.tokenTime || 0);
  const oneHour = 60 * 60 * 1000;
  
  if (tokenAge > oneHour * 0.9 && tokens.refreshToken) { // Refresh at 90% of expiry
    console.log('Token approaching expiry, refreshing...');
    const newToken = await refreshAccessToken(tokens.refreshToken);
    if (newToken) {
      accessToken = newToken;
    }
  }
  
  try {
    // Check ALL unread emails including spam from the last 5 minutes
    const query = `is:unread newer_than:5m in:anywhere`;
    
    // Get recent unread emails with retry logic
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000 // 10 second timeout
          }
        );
        break; // Success, exit retry loop
      } catch (fetchError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Gmail API fetch failed after ${maxRetries} retries: ${fetchError.message}`);
        }
        console.log(`Gmail API fetch attempt ${retryCount} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }
    }
    
    if (!response.ok) {
      // Try to refresh token if unauthorized
      if (response.status === 401 && tokens.refreshToken) {
        console.log('Access token expired, attempting refresh...');
        const newToken = await refreshAccessToken(tokens.refreshToken);
        if (newToken) {
          return await checkForNewLeadEmails(); // Retry with new token
        } else {
          throw new Error('Failed to refresh access token');
        }
      }
      
      // Handle rate limiting
      if (response.status === 429) {
        console.log('Gmail API rate limited, will retry next cycle');
        return { success: false, error: 'Rate limited', retryAfter: 60 };
      }
      
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const messages = data.messages || [];
    
    let leadEmailsFound = 0;
    
    // Check each message for "New Direct Lead" in subject
    for (const message of messages) {
      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (messageResponse.ok) {
        const messageData = await messageResponse.json();
        const headers = messageData.payload.headers;
        
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Check if this is a "New Direct Lead" email
        if (subject.toLowerCase().includes('new direct lead')) {
          leadEmailsFound++;

          // Check if we've already notified about this email
          if (await isEmailAlreadyNotified(message.id)) {
            console.log(`📧 Already notified about email: ${subject} (${message.id})`);
            continue; // Skip this email
          }
          
          // Extract email body preview
          let bodyPreview = '';
          if (messageData.payload.body && messageData.payload.body.data) {
            bodyPreview = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
          } else if (messageData.payload.parts) {
            const textPart = messageData.payload.parts.find(part => 
              part.mimeType === 'text/plain' || part.mimeType === 'text/html'
            );
            if (textPart && textPart.body && textPart.body.data) {
              bodyPreview = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
          }
          
          // Clean up body preview (remove HTML tags and limit length)
          bodyPreview = bodyPreview.replace(/<[^>]*>/g, '').substring(0, 200);
          
          // Send simple Telegram notification
          const telegramMessage = `New Thumbtack Lead - ${new Date().toLocaleString()}`;
          
          try {
            const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: telegramMessage
              }),
            });
            
            const sent = telegramResponse.ok;
            if (sent) {
              // Mark this email as notified
              await markEmailAsNotified(message.id);
              console.log(`📧 Lead email found and notification sent: ${subject}`);
            } else {
              const telegramError = await telegramResponse.text();
              console.log(`📧 Lead email found and notification failed: ${subject}. Error: ${telegramError}`);
            }
          } catch (error) {
            console.error('Failed to send Telegram notification:', error);
          }
        }
      }
    }
    
    // No need to update time for serverless
    
    return { 
      success: true, 
      messagesChecked: messages.length,
      leadEmailsFound: leadEmailsFound,
      lastChecked: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error checking emails:', error);
    
    // Send error notification to Telegram for critical failures
    if (error.message.includes('refresh') || error.message.includes('401')) {
      try {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: `🚨 Gmail Monitor Error: ${error.message} - ${new Date().toLocaleString()}`
          }),
        });
      } catch (telegramError) {
        console.error('Failed to send error notification:', telegramError);
      }
    }
    
    return { 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString(),
      recoverable: error.message.includes('Rate limited') || error.message.includes('timeout')
    };
  }
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    return null;
  }
  
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      // Store the new access token
      await storeTokens(data.access_token, refreshToken);
      console.log('Access token refreshed successfully');
      return data.access_token;
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
  }
  
  return null;
}