import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '../../../lib/telegram.js';
import { storeTokens, getStoredTokens, isEmailAlreadyNotified, markEmailAsNotified } from '../../../lib/token-storage.js';

export async function POST(request) {
  try {
    const { access_token, refresh_token } = await request.json();
    
    if (access_token) {
      storeTokens(access_token, refresh_token || null);
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
  const tokens = getStoredTokens();
  if (!tokens || !tokens.accessToken) {
    return { success: false, error: 'No access token available' };
  }
  
  let accessToken = tokens.accessToken;
  
  try {
    // Check ALL unread emails including spam from the last 5 minutes
    const query = `is:unread newer_than:5m in:anywhere`;
    
    // Get recent unread emails
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      // Try to refresh token if unauthorized
      if (response.status === 401 && tokens.refreshToken) {
        const newToken = await refreshAccessToken(tokens.refreshToken);
        if (newToken) {
          return await checkForNewLeadEmails(); // Retry with new token
        }
      }
      throw new Error(`Gmail API error: ${response.status}`);
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
          if (isEmailAlreadyNotified(message.id)) {
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
          
          // Send Telegram notification directly
          const telegramMessage = `🎯 NEW DIRECT LEAD EMAIL!

📧 From: ${from}
📋 Subject: ${subject}
📅 Date: ${date}
💬 Preview: ${bodyPreview}...
🆔 Message ID: ${message.id}
⏰ Time: ${new Date().toLocaleString()}

🔥 CALL NOW while they're hot!`;
          
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
              markEmailAsNotified(message.id);
              console.log(`📧 NEW lead email notification sent: ${subject} (${message.id})`);
            } else {
              console.log(`📧 Failed to send notification for: ${subject}`);
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
    return { success: false, error: error.message };
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
      storeTokens(data.access_token, refreshToken);
      console.log('Access token refreshed successfully');
      return data.access_token;
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
  }
  
  return null;
}