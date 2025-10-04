# Gmail → Telegram Integration Setup Guide

This guide will walk you through setting up a Gmail → Telegram integration that sends notifications when you receive emails with "New direct lead!" in the subject line.

## 🎯 Overview

The integration monitors your Gmail inbox and sends Telegram notifications when:
- New emails arrive in your inbox
- The email subject contains "New direct lead!" (case-insensitive)
- Includes sender information, subject, and email preview

## 📋 Prerequisites

1. **Gmail Account** - Your Gmail account that receives the lead emails
2. **Google Cloud Project** - To access Gmail API
3. **Telegram Account** - For receiving notifications
4. **Domain/Server** - To host the webhook endpoint (can use ngrok for testing)

## 🚀 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. **Go to:** [console.cloud.google.com](https://console.cloud.google.com)
2. **Create a new project** or select an existing one
3. **Enable Gmail API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. **Go to:** "APIs & Services" → "Credentials"
2. **Click "Create Credentials"** → "OAuth 2.0 Client IDs"
3. **Configure the consent screen** (if not done already):
   - Choose "External" user type
   - Fill in required fields (App name, User support email, Developer email)
   - Add your email to test users

4. **Create OAuth 2.0 Client ID:**
   - Application type: "Web application"
   - Name: "Gmail Telegram Integration"
   - Authorized redirect URIs: `http://localhost:3000/api/auth/gmail/callback`

5. **Download the credentials** (JSON file) and note:
   - Client ID
   - Client Secret

### Step 3: Set Up Your Development Environment

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp env.example .env.local
   ```

3. **Configure environment variables:**
   ```env
   # Gmail API Configuration
   GMAIL_CLIENT_ID=your_client_id_from_google_cloud
   GMAIL_CLIENT_SECRET=your_client_secret_from_google_cloud
   GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # Telegram Configuration (Step 4)
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ```

### Step 4: Create Your Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. **Start a chat** with BotFather
3. **Send `/newbot`** and follow instructions:
   - Bot name: "My Gmail Lead Notifier"
   - Bot username: "my_gmail_lead_notifier_bot"
4. **Copy the bot token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. **Start a chat** with your new bot
6. **Send any message** to the bot
7. **Get your Chat ID:**
   - Visit: `https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getUpdates`
   - Find your chat ID in the response (it's a number like `123456789`)

### Step 5: Run the Setup Interface

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Visit the setup page:**
   ```
   http://localhost:3000/setup
   ```

3. **Follow the on-screen instructions:**
   - Click "Connect Gmail Account" to authenticate
   - Enter your Telegram bot credentials
   - Test the configuration
   - Set up Gmail webhooks

### Step 6: Test the Integration

1. **Test Telegram bot:**
   - Use the test button in the setup interface
   - You should receive a test message in Telegram

2. **Test Gmail webhook:**
   ```bash
   curl -X POST http://localhost:3000/api/test-webhook \
     -H "Content-Type: application/json" \
     -d '{"message": "Test Gmail webhook message"}'
   ```

3. **Test with real email:**
   - Send yourself an email with "New direct lead!" in the subject
   - You should receive a Telegram notification

## 🔧 Configuration Details

### Gmail OAuth Scopes

The integration requests these scopes:
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail messages
- `https://www.googleapis.com/auth/gmail.push` - Receive push notifications

### Email Filtering

The integration filters emails based on:
- **Subject line contains:** "New direct lead!" (case-insensitive)
- **Location:** Your Gmail inbox
- **Type:** All new incoming emails

### Message Format

You'll receive formatted messages like:

```
🎯 NEW DIRECT LEAD EMAIL!

📧 From: john.doe@example.com
📋 Subject: New direct lead! - House Cleaning Service
📅 Date: Mon, 25 Dec 2024 14:30:15 -0800
💬 Preview: Hi, I'm interested in your house cleaning services. I have a 3-bedroom house that needs...
🆔 Message ID: 18c2f4a5b6c7d8e9
⏰ Time: 12/25/2024, 2:30:15 PM
```

## 🛠 Troubleshooting

### Common Issues

1. **"Gmail connection failed"**
   - Verify your Client ID and Client Secret
   - Make sure Gmail API is enabled in Google Cloud Console
   - Check that redirect URI matches exactly

2. **"Bot not responding"**
   - Make sure you've started a chat with your bot
   - Verify the bot token is correct
   - Check that Chat ID is a number

3. **"Gmail webhooks not working"**
   - Verify your server is accessible from the internet
   - Check webhook URL is correct
   - Make sure access token is valid

4. **"Environment variables not loading"**
   - Restart your development server
   - Check .env.local file is in the project root
   - Verify variable names match exactly

### Testing Webhooks Locally

For local development, use ngrok to expose your local server:

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Use the ngrok URL** in your webhook configuration:
   ```
   https://abc123.ngrok.io/api/webhook/gmail
   ```

## 📚 API Endpoints

### Authentication
- `GET /api/auth/gmail` - Initiate Gmail OAuth flow
- `GET /api/auth/gmail/callback` - Handle Gmail OAuth callback

### Webhooks
- `POST /api/webhook/gmail` - Receive Gmail push notifications
- `POST /api/webhook/gmail/setup` - Set up Gmail push notifications

### Testing
- `GET /api/telegram/test` - Test Telegram bot configuration
- `POST /api/test-webhook` - Test webhook functionality

## 🔒 Security Notes

- Store access tokens securely (use a database in production)
- Use HTTPS in production
- Regularly rotate API credentials
- Consider implementing webhook signature verification

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the Gmail API documentation
3. Check your server logs for error messages
4. Verify all environment variables are set correctly

## 🎉 Success!

Once everything is set up, you'll receive real-time notifications in Telegram whenever you receive emails with "New direct lead!" in the subject line!
