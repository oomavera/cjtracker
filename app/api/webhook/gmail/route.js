import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '../../../lib/telegram';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Log the incoming webhook for debugging
    console.log('Gmail webhook received:', JSON.stringify(body, null, 2));
    
    // Extract email information from Gmail webhook
    const { 
      message,
      subscription,
      historyId,
      emailAddress,
      threadId,
      messageId
    } = body;
    
    // Handle Gmail push notification
    if (message && message.data) {
      // Decode the base64 message data
      const messageData = Buffer.from(message.data, 'base64').toString('utf-8');
      const parsedData = JSON.parse(messageData);
      
      const { 
        emailAddress: senderEmail,
        historyId: emailHistoryId,
        threadId: emailThreadId
      } = parsedData;
      
      // Fetch the actual email content using Gmail API
      const emailContent = await fetchEmailContent(emailThreadId);
      
      if (emailContent) {
        await handleNewEmail({
          senderEmail,
          subject: emailContent.subject,
          body: emailContent.body,
          threadId: emailThreadId,
          messageId: emailContent.messageId
        });
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

async function fetchEmailContent(threadId) {
  try {
    const accessToken = process.env.GMAIL_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('Gmail access token not configured');
      return null;
    }
    
    // Fetch the email thread from Gmail API
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.error('Failed to fetch email content:', response.statusText);
      return null;
    }
    
    const threadData = await response.json();
    const message = threadData.messages[threadData.messages.length - 1];
    
    // Extract headers
    const headers = message.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
    const date = headers.find(h => h.name === 'Date')?.value || 'Unknown Date';
    
    // Extract body
    let body = '';
    if (message.payload.body && message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      // Look for text/plain or text/html parts
      const textPart = message.payload.parts.find(part => 
        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart && textPart.body && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }
    
    return {
      subject,
      from,
      date,
      body: body.substring(0, 500), // Limit body length
      messageId: message.id
    };
    
  } catch (error) {
    console.error('Error fetching email content:', error);
    return null;
  }
}

async function handleNewEmail(data) {
  const { subject, from, body, date, messageId } = data;
  
  // Check if subject contains "New direct lead!"
  if (subject.toLowerCase().includes('new direct lead!')) {
    const message = `🎯 NEW DIRECT LEAD EMAIL!\\n\\n` +
      `📧 From: ${from}\\n` +
      `📋 Subject: ${subject}\\n` +
      `📅 Date: ${date}\\n` +
      `💬 Preview: ${body.substring(0, 200)}...\\n` +
      `🆔 Message ID: ${messageId}\\n` +
      `⏰ Time: ${new Date().toLocaleString()}`;
    
    await sendTelegramMessage(message);
    console.log('✅ Telegram notification sent for new direct lead email');
  } else {
    console.log('📧 Email received but subject does not match criteria:', subject);
  }
}
