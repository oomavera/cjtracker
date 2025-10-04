// Simple file-based token storage for development
// In production, this should use a database
import fs from 'fs';
import path from 'path';

const TOKEN_FILE = path.join(process.cwd(), '.gmail-tokens.json');
const NOTIFIED_FILE = path.join(process.cwd(), '.notified-emails.json');

export function storeTokens(accessToken, refreshToken) {
  try {
    const tokens = {
      accessToken,
      refreshToken,
      timestamp: Date.now()
    };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    console.log('✅ Tokens stored successfully');
    return true;
  } catch (error) {
    console.error('Failed to store tokens:', error);
    return false;
  }
}

export function getStoredTokens() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) {
      return null;
    }
    const data = fs.readFileSync(TOKEN_FILE, 'utf8');
    const tokens = JSON.parse(data);
    return tokens;
  } catch (error) {
    console.error('Failed to read tokens:', error);
    return null;
  }
}

export function clearTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
    }
    return true;
  } catch (error) {
    console.error('Failed to clear tokens:', error);
    return false;
  }
}

export function isEmailAlreadyNotified(messageId) {
  try {
    if (!fs.existsSync(NOTIFIED_FILE)) {
      return false;
    }
    const data = fs.readFileSync(NOTIFIED_FILE, 'utf8');
    const notified = JSON.parse(data);
    return notified.includes(messageId);
  } catch (error) {
    console.error('Failed to check notified emails:', error);
    return false;
  }
}

export function markEmailAsNotified(messageId) {
  try {
    let notified = [];
    if (fs.existsSync(NOTIFIED_FILE)) {
      const data = fs.readFileSync(NOTIFIED_FILE, 'utf8');
      notified = JSON.parse(data);
    }
    
    if (!notified.includes(messageId)) {
      notified.push(messageId);
      // Keep only last 100 notifications to prevent file from growing too large
      if (notified.length > 100) {
        notified = notified.slice(-100);
      }
      fs.writeFileSync(NOTIFIED_FILE, JSON.stringify(notified, null, 2));
    }
    return true;
  } catch (error) {
    console.error('Failed to mark email as notified:', error);
    return false;
  }
}