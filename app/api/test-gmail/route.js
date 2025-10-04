import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '../../lib/telegram';

export async function POST(request) {
  try {
    const { message } = await request.json();
    
    // Send a test message to Telegram
    const success = await sendTelegramMessage(
      `🧪 Gmail Integration Test\\n\\n${message || 'This is a test message from your Gmail integration!'}`
    );
    
    return NextResponse.json({ 
      success,
      message: success ? 'Test message sent successfully' : 'Failed to send test message'
    });
    
  } catch (error) {
    console.error('Error sending test message:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Gmail test endpoint is active',
    usage: 'Send a POST request with a message to test your Gmail → Telegram integration',
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhook/gmail`
  });
}
