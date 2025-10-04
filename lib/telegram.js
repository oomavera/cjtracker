import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN environment variable is not set');
}

if (!TELEGRAM_CHAT_ID) {
  console.warn('TELEGRAM_CHAT_ID environment variable is not set');
}

/**
 * Send a message to Telegram
 * @param {string} message - The message to send
 * @param {object} options - Additional options
 * @returns {Promise<boolean>} - Success status
 */
export async function sendTelegramMessage(message, options = {}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram bot not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.data.ok) {
      console.log('Telegram message sent successfully');
      return true;
    } else {
      console.error('Telegram API error:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Failed to send Telegram message:', error.message);
    if (error.response) {
      console.error('Telegram API response:', error.response.data);
    }
    return false;
  }
}

/**
 * Get information about the Telegram bot
 * @returns {Promise<object|null>} - Bot information or null if failed
 */
export async function getBotInfo() {
  if (!TELEGRAM_BOT_TOKEN) {
    return null;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data.ok) {
      return response.data.result;
    }
    return null;
  } catch (error) {
    console.error('Failed to get bot info:', error.message);
    return null;
  }
}

/**
 * Get updates from Telegram (useful for getting chat ID)
 * @returns {Promise<array>} - Array of updates
 */
export async function getBotUpdates() {
  if (!TELEGRAM_BOT_TOKEN) {
    return [];
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data.ok) {
      return response.data.result;
    }
    return [];
  } catch (error) {
    console.error('Failed to get bot updates:', error.message);
    return [];
  }
}

/**
 * Send a test message to verify bot configuration
 * @returns {Promise<boolean>} - Success status
 */
export async function sendTestMessage() {
  const testMessage = `🤖 Bot Test Message\n\n` +
    `✅ Telegram bot is working correctly!\n` +
    `⏰ Time: ${new Date().toLocaleString()}\n` +
    `🔗 Webhook endpoint: /api/webhook/thumbtack`;
  
  return await sendTelegramMessage(testMessage);
}
