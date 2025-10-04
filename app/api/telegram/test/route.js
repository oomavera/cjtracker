import { NextResponse } from 'next/server';
import { sendTestMessage, getBotInfo } from '../../../../lib/telegram';

export async function GET(request) {
  try {
    // Get bot information
    const botInfo = await getBotInfo();
    
    if (!botInfo) {
      return NextResponse.json({
        success: false,
        error: 'Bot not configured or invalid token',
        botInfo: null
      }, { status: 400 });
    }

    // Send test message
    const messageSent = await sendTestMessage();
    
    return NextResponse.json({
      success: messageSent,
      botInfo: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name,
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages,
        supports_inline_queries: botInfo.supports_inline_queries
      },
      message: messageSent ? 'Test message sent successfully' : 'Failed to send test message'
    });
    
  } catch (error) {
    console.error('Error testing Telegram bot:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      botInfo: null
    }, { status: 500 });
  }
}
