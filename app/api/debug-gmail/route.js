import { NextResponse } from 'next/server';
import { getStoredTokens } from '../../../lib/token-storage.js';
import { sendTelegramMessage } from '../../../lib/telegram.js';

export async function GET() {
  try {
    console.log('=== DEBUG GMAIL CHECK ===');
    
    // Check if tokens are stored
    const tokens = getStoredTokens();
    console.log('Tokens available:', !!tokens);
    
    if (!tokens) {
      return NextResponse.json({
        error: 'No tokens stored',
        instructions: 'Go to /simple-setup and authorize Gmail first'
      });
    }
    
    // Test Gmail API call - check ALL folders including spam
    const query = `is:unread newer_than:1h in:anywhere`;
    console.log('Gmail query:', query);
    
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('Gmail API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Gmail API error:', errorText);
      return NextResponse.json({
        error: `Gmail API error: ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    const messages = data.messages || [];
    console.log('Found messages:', messages.length);
    
    let debugInfo = {
      tokensStored: true,
      messagesFound: messages.length,
      emails: []
    };
    
    // Check each message
    for (const message of messages.slice(0, 5)) { // Check first 5
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
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        const isLeadEmail = subject.toLowerCase().includes('new direct lead');
        
        console.log('Email subject:', subject);
        console.log('Is lead email:', isLeadEmail);
        
        debugInfo.emails.push({
          subject,
          from,
          date,
          isLeadEmail,
          messageId: message.id
        });
        
        // If this is a lead email, send notification
        if (isLeadEmail) {
          const telegramMessage = `🎯 FOUND LEAD EMAIL!

📧 From: ${from}
📋 Subject: ${subject}
📅 Date: ${date}
🆔 Message ID: ${message.id}
⏰ Debug check: ${new Date().toLocaleString()}

🔥 This email should have triggered a notification!`;
          
          // Send direct Telegram notification
          const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: telegramMessage
            }),
          });
          
          const sent = telegramResponse.ok;
          console.log('Telegram notification sent:', sent);
          
          debugInfo.notificationSent = sent;
        }
      }
    }
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}