import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '../../../../lib/telegram.js';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Log the incoming webhook for debugging
    console.log('Gmail webhook received:', JSON.stringify(body, null, 2));
    
    // Handle Gmail push notification
    if (body.message && body.message.data) {
      // Decode the base64 message data
      const messageData = Buffer.from(body.message.data, 'base64').toString('utf-8');
      const parsedData = JSON.parse(messageData);
      
      console.log('Parsed Gmail notification:', parsedData);
      
      const { emailAddress, historyId } = parsedData;
      
      // Get an access token (we'll store this from OAuth)
      const accessToken = await getStoredAccessToken();
      
      if (!accessToken) {
        console.error('No access token available');
        return NextResponse.json({ success: false, error: 'No access token' });
      }
      
      // Fetch recent messages using the historyId
      const emailContent = await fetchRecentEmails(accessToken, historyId);
      
      if (emailContent) {
        await handleNewEmail(emailContent);
      }
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Gmail webhook error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Simple in-memory storage for access token (in production, use a database)
let storedAccessToken = null;

async function getStoredAccessToken() {
  return storedAccessToken;
}

// Not exported - Next.js route handlers can only export GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
async function storeAccessToken(token) {
  storedAccessToken = token;
}

async function fetchRecentEmails(accessToken, historyId) {
  try {
    // Get recent messages
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread newer_than:1h`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.error('Failed to fetch emails:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    const messages = data.messages || [];
    
    // Check the most recent message
    if (messages.length > 0) {
      const messageId = messages[0].id;
      
      // Fetch the message details
      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
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
        
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find(h => h.name === 'Date')?.value || 'Unknown Date';
        
        // Extract body
        let body = '';
        if (messageData.payload.body && messageData.payload.body.data) {
          body = Buffer.from(messageData.payload.body.data, 'base64').toString('utf-8');
        } else if (messageData.payload.parts) {
          const textPart = messageData.payload.parts.find(part => 
            part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          );
          if (textPart && textPart.body && textPart.body.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        }
        
        // Clean up body (remove HTML tags)
        body = body.replace(/<[^>]*>/g, '').substring(0, 200);
        
        return {
          subject,
          from,
          date,
          body,
          messageId
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Error fetching recent emails:', error);
    return null;
  }
}

async function handleNewEmail(data) {
  const { subject, from, body, date, messageId } = data;
  
  // Check if subject contains "New Direct Lead" (more flexible matching)
  if (subject.toLowerCase().includes('new direct lead')) {
    const message = `🎯 NEW DIRECT LEAD EMAIL!

📧 From: ${from}
📋 Subject: ${subject}
📅 Date: ${date}
💬 Preview: ${body}...
🆔 Message ID: ${messageId}
⏰ Time: ${new Date().toLocaleString()}`;
    
    const sent = await sendTelegramMessage(message);
    console.log(`✅ Telegram notification ${sent ? 'sent' : 'failed'} for new direct lead email`);
  } else {
    console.log('📧 Email received but subject does not match criteria:', subject);
  }
}
