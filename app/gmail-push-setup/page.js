"use client";

import { useState } from 'react';

export default function GmailPushSetup() {
  const [projectId, setProjectId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const activatePushNotifications = async () => {
    if (!projectId.trim()) {
      alert('Please enter your Google Cloud Project ID');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/setup-gmail-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectId.trim() })
      });

      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        alert('🎉 Gmail Push Notifications Activated! You will now get INSTANT notifications!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to activate push notifications');
    }
    setLoading(false);
  };

  const getProjectId = () => {
    window.open('https://console.cloud.google.com/home/dashboard', '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          ⚡ Activate INSTANT Gmail Notifications
        </h1>

        <div className="bg-gray-900 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Get Your Project ID</h2>
          <button 
            onClick={getProjectId}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          >
            📋 Open Google Cloud Console
          </button>
          <p className="text-sm text-gray-300">
            Copy the "Project ID" from the dashboard and paste it below.
          </p>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Activate Push Notifications</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Google Cloud Project ID:
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="e.g., curated-cleanings-places"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          <button
            onClick={activatePushNotifications}
            disabled={loading || !projectId.trim()}
            className="w-full bg-green-600 text-white px-6 py-3 rounded font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Activating...' : '🚀 Activate INSTANT Notifications'}
          </button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900' : 'bg-red-900'}`}>
            <h3 className="font-semibold mb-2">
              {result.success ? '✅ Success!' : '❌ Error'}
            </h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-yellow-900 p-4 rounded-lg mt-6">
          <h3 className="font-semibold mb-2">⚠️ First Complete Pub/Sub Setup:</h3>
          <ol className="text-sm space-y-1">
            <li>1. <a href="https://console.cloud.google.com/apis/library/pubsub.googleapis.com" target="_blank" className="text-blue-400 underline">Enable Pub/Sub API</a></li>
            <li>2. <a href="https://console.cloud.google.com/cloudpubsub/topic/list" target="_blank" className="text-blue-400 underline">Create Topic</a> called "gmail-notifications"</li>
            <li>3. Create Push Subscription pointing to your webhook URL</li>
            <li>4. Then use this page to activate</li>
          </ol>
        </div>

        <div className="bg-blue-900 p-4 rounded-lg mt-4">
          <h3 className="font-semibold mb-2">🎯 Test After Activation:</h3>
          <p className="text-sm">Send yourself an email with "New Direct Lead" in the subject line - you should get an INSTANT Telegram notification!</p>
        </div>
      </div>
    </div>
  );
}