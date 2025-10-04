import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const telegramMessage = `🎯 DIRECT NOTIFICATION TEST!

📧 From: oomavera1@gmail.com
📋 Subject: New Direct Lead
📅 Date: ${new Date().toLocaleString()}
🔥 Testing notification system!`;

    // Direct API call to Telegram
    const response = await fetch(`https://api.telegram.org/bot7972152298:AAFY-h7OmGuU14dQrEpZbR18dqtO23uDMYI/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: '5467175694',
        text: telegramMessage
      }),
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: response.ok,
      telegramResponse: result,
      message: response.ok ? 'Notification sent successfully!' : 'Failed to send notification'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}