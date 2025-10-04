"use client";

import { useState, useEffect } from 'react';

export default function TelegramSetup() {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbtackConnected, setThumbtackConnected] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailAccessToken, setGmailAccessToken] = useState('');

  // Check for OAuth success on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const token = urlParams.get('access_token');
    const gmailSuccess = urlParams.get('gmail_success');
    const gmailToken = urlParams.get('gmail_access_token');
    const error = urlParams.get('error');

    if (success === 'true' && token) {
      setAccessToken(token);
      setThumbtackConnected(true);
    }
    
    if (gmailSuccess === 'true' && gmailToken) {
      setGmailAccessToken(gmailToken);
      setGmailConnected(true);
    }
    
    if (error) {
      alert(`Authentication error: ${error}`);
    }
    
    // Clean up URL
    if (success || gmailSuccess || error) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleTestBot = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/telegram/test');
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectThumbtack = () => {
    window.location.href = '/api/auth/thumbtack?redirect_to=/setup';
  };

  const handleConnectGmail = () => {
    window.location.href = '/api/auth/gmail?redirect_to=/setup';
  };

  const handleSetupWebhooks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/webhook/thumbtack/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Webhooks configured successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error setting up webhooks: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupGmailWebhooks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/webhook/gmail/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: gmailAccessToken
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Gmail webhooks configured successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error setting up Gmail webhooks: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Gmail → Telegram Integration Setup</h2>
      
      {/* Step 1: Connect Gmail */}
      <div className="mb-8 p-6 border border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Step 1: Connect Gmail Account</h3>
        <p className="text-gray-600 mb-4">
          Connect your Gmail account to monitor for emails with "New direct lead!" in the subject line.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h4 className="font-medium text-blue-800 mb-2">What this does:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Monitors your Gmail inbox for new emails</li>
            <li>• Filters emails with "New direct lead!" in the subject</li>
            <li>• Sends instant Telegram notifications when found</li>
            <li>• Includes sender, subject, and email preview</li>
          </ul>
        </div>

        <button
          onClick={handleConnectGmail}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔗 Connect Gmail Account
        </button>
        
        {gmailConnected && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-green-800">✅ Gmail account connected successfully!</p>
            <p className="text-sm text-green-700 mt-1">Access token: {gmailAccessToken.substring(0, 20)}...</p>
          </div>
        )}
      </div>

      {/* Step 2: Setup Gmail Webhooks */}
      <div className="mb-8 p-6 border border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Step 2: Configure Gmail Webhooks</h3>
        <p className="text-gray-600 mb-4">
          Set up Gmail push notifications to monitor your inbox for new emails.
        </p>

        <button
          onClick={handleSetupGmailWebhooks}
          disabled={!gmailConnected || isLoading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '⏳ Setting up...' : '⚙️ Setup Gmail Webhooks'}
        </button>
        
        <p className="text-sm text-gray-500 mt-2">
          This will set up Gmail push notifications to monitor your inbox for new emails
        </p>
      </div>

      {/* Step 3: Create Telegram Bot */}
      <div className="mb-8 p-6 border border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Step 3: Create Telegram Bot</h3>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Open Telegram and search for <code className="bg-gray-200 px-1 rounded">@BotFather</code></li>
            <li>Start a chat with BotFather and send <code className="bg-gray-200 px-1 rounded">/newbot</code></li>
            <li>Follow the instructions to create your bot</li>
            <li>Copy the bot token that BotFather gives you</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bot Token:
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chat ID:
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="123456789"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">How to get your Chat ID:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Start a chat with your new bot</li>
            <li>Send any message to the bot</li>
            <li>Visit: <code className="bg-yellow-200 px-1 rounded">https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getUpdates</code></li>
            <li>Find your chat ID in the response (it's a number)</li>
          </ol>
        </div>
      </div>

      {/* Step 4: Test Configuration */}
      <div className="mb-8 p-6 border border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Step 4: Test Your Configuration</h3>
        <p className="text-gray-600 mb-4">
          Test your Telegram bot to make sure it's working correctly.
        </p>
        
        <button
          onClick={handleTestBot}
          disabled={isLoading || !botToken || !chatId}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '⏳ Testing...' : '🧪 Test Bot Configuration'}
        </button>
        
        {testResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            testResult.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
          }`}>
            <h4 className={`font-semibold ${
              testResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult.success ? '✅ Test Successful!' : '❌ Test Failed'}
            </h4>
            {testResult.botInfo && (
              <div className="mt-2 text-sm text-gray-700">
                <p><strong>Bot Name:</strong> {testResult.botInfo.first_name}</p>
                <p><strong>Bot Username:</strong> @{testResult.botInfo.username}</p>
                <p><strong>Bot ID:</strong> {testResult.botInfo.id}</p>
              </div>
            )}
            {testResult.message && (
              <p className="mt-2 text-sm text-gray-700">{testResult.message}</p>
            )}
            {testResult.error && (
              <p className="mt-2 text-sm text-red-600">{testResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Environment Variables */}
      <div className="mb-8 p-6 border border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Environment Variables</h3>
        <p className="text-gray-600 mb-4">
          Add these to your <code className="bg-gray-200 px-1 rounded">.env.local</code> file:
        </p>
        <pre className="bg-gray-800 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${botToken || 'your_bot_token_here'}
TELEGRAM_CHAT_ID=${chatId || 'your_chat_id_here'}

# Gmail API Configuration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
        </pre>
      </div>

      {/* Webhook URL */}
      <div className="mb-8 p-6 border border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Webhook URL</h3>
        <p className="text-gray-600 mb-4">
          Your webhook endpoint for Gmail notifications:
        </p>
        <code className="bg-gray-800 text-green-400 p-3 rounded text-sm block">
          {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/webhook/gmail
        </code>
      </div>

      {/* Troubleshooting */}
      <div className="p-6 border border-gray-300 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Troubleshooting</h3>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li><strong>Thumbtack connection failed:</strong> Make sure you have API access and correct client credentials</li>
            <li><strong>Bot not responding:</strong> Make sure you've started a chat with your bot first</li>
            <li><strong>Invalid token:</strong> Double-check your bot token from BotFather</li>
            <li><strong>Wrong chat ID:</strong> Make sure you're using the correct chat ID (it's a number)</li>
            <li><strong>Environment variables not loading:</strong> Restart your development server after adding .env.local</li>
          </ul>
        </div>
      </div>
    </div>
  );
}