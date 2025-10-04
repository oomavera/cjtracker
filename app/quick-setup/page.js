"use client";

import { useState, useEffect } from 'react';

export default function QuickSetup() {
  const [step, setStep] = useState(1);
  const [tokens, setTokens] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const gmailSuccess = urlParams.get('gmail_success');
    const accessToken = urlParams.get('gmail_access_token');
    const refreshToken = urlParams.get('gmail_refresh_token');
    
    if (gmailSuccess === 'true' && accessToken) {
      setTokens({ accessToken, refreshToken });
      setStep(2);
      startMonitoring(accessToken, refreshToken);
      // Clean URL
      window.history.replaceState({}, '', '/quick-setup');
    }
  }, []);

  const startMonitoring = async (accessToken, refreshToken) => {
    // Store tokens
    await fetch('/api/gmail-polling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken })
    });
    
    setIsMonitoring(true);
    setStep(3);
    
    // Send success notification
    setTimeout(() => {
      fetch('https://api.telegram.org/bot7972152298:AAFY-h7OmGuU14dQrEpZbR18dqtO23uDMYI/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: '5467175694',
          text: '🎯 SUCCESS! Gmail monitoring is now ACTIVE!\n\n✅ Checking for "New Direct Lead" emails\n✅ Will send instant Telegram notifications\n✅ System is working 24/7'
        })
      });
    }, 1000);
    
    // Start checking immediately and then every 10 seconds
    checkNow();
    setInterval(checkNow, 5000);
  };

  const checkNow = async () => {
    try {
      const response = await fetch('/api/gmail-polling');
      const result = await response.json();
      setLastCheck(result);
      console.log('Check result:', result);
    } catch (error) {
      console.error('Check failed:', error);
    }
  };

  const handleAuth = () => {
    window.location.href = '/api/auth/gmail?redirect_to=/quick-setup';
  };

  const testNotification = () => {
    fetch('https://api.telegram.org/bot7972152298:AAFY-h7OmGuU14dQrEpZbR18dqtO23uDMYI/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: '5467175694',
        text: '🧪 TEST: This is what lead notifications look like!\n\n📧 From: test@example.com\n📋 Subject: New Direct Lead - Test\n⏰ System is working!'
      })
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Quick Gmail → Telegram Setup
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          {step === 1 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Step 1: Connect Gmail</h2>
              <p className="text-gray-600 mb-6">
                One click to connect Gmail and start monitoring for "New Direct Lead" emails.
              </p>
              <button
                onClick={handleAuth}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-xl hover:bg-blue-700"
              >
                🔗 Connect Gmail Now
              </button>
            </div>
          )}
          
          {step === 2 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Setting Up...</h2>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Configuring email monitoring...</p>
            </div>
          )}
          
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-green-600">🎉 MONITORING ACTIVE!</h2>
              
              <div className="bg-green-100 p-6 rounded-lg mb-6">
                <h3 className="font-bold text-green-800 mb-3">✅ What's Working Now:</h3>
                <ul className="text-green-700 space-y-2">
                  <li>• Gmail connected and checking every 10 seconds</li>
                  <li>• Looking for "New Direct Lead" in email subjects</li>
                  <li>• Instant Telegram notifications when found</li>
                  <li>• Running 24/7 while server is active</li>
                </ul>
              </div>
              
              <div className="flex gap-4 mb-6">
                <button
                  onClick={testNotification}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  📱 Send Test Notification
                </button>
                
                <button
                  onClick={checkNow}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  🔍 Check Gmail Now
                </button>
              </div>
              
              {lastCheck && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">Last Check:</h4>
                  <div className="text-sm space-y-1">
                    <p>Status: {lastCheck.success ? '✅ Success' : '❌ Error'}</p>
                    <p>Messages checked: {lastCheck.messagesChecked || 0}</p>
                    <p>Lead emails found: {lastCheck.leadEmailsFound || 0}</p>
                    <p>Time: {lastCheck.lastChecked || 'Never'}</p>
                    {lastCheck.error && <p className="text-red-600">Error: {lastCheck.error}</p>}
                  </div>
                </div>
              )}
              
              <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">🚀 You're All Set!</h4>
                <p className="text-blue-700 text-sm">
                  Your system is now monitoring Gmail for lead emails. When a "New Direct Lead" email arrives, 
                  you'll get an instant Telegram notification with the sender, subject, and preview!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}