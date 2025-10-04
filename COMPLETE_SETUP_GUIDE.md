# Complete Thumbtack → Telegram Integration Setup Guide

This guide will walk you through the complete setup process for connecting your Thumbtack account to Telegram notifications.

## 🎯 Overview

The integration allows you to receive real-time Telegram notifications whenever:
- New customers contact you on Thumbtack (NegotiationCreatedV4)
- Customers send you messages (MessageCreatedV4)
- Customers leave reviews (ReviewCreatedV4)
- Customers use incentives/promo codes (IncentiveUsedV4)

## 📋 Prerequisites

1. **Thumbtack Business Account** - You need an active Thumbtack business profile
2. **Thumbtack API Access** - Must request access from Thumbtack
3. **Telegram Account** - For receiving notifications
4. **Domain/Server** - To host the webhook endpoint (can use ngrok for testing)

## 🚀 Step-by-Step Setup

### Step 1: Request Thumbtack API Access

1. **Visit:** [developers.thumbtack.com/request-access](https://developers.thumbtack.com/request-access)

2. **Fill out the application with:**
   - **Contact Information:** Your name, email, phone, company
   - **Use Case:** "Real-time notifications for customer interactions via Telegram bot"
   - **Technical Details:**
     - Platform: Custom web application
     - Client URI: `http://localhost:3000/api/auth/thumbtack/callback` (for testing)
     - Privacy Policy URI: `http://localhost:3000/privacy`
     - Terms of Service URI: `http://localhost:3000/terms`

3. **Wait for approval** (can take 1-2 weeks)

### Step 2: Get Your Thumbtack API Credentials

Once approved, you'll receive:
- **Client ID** - Your application identifier
- **Client Secret** - Your application secret
- **API Documentation** - Access to the full API

### Step 3: Set Up Your Development Environment

1. **Clone/Download** this project
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp env.example .env.local
   ```

4. **Configure environment variables:**
   ```env
   # Thumbtack API Configuration
   THUMBTACK_CLIENT_ID=your_client_id_from_thumbtack
   THUMBTACK_CLIENT_SECRET=your_client_secret_from_thumbtack
   THUMBTACK_REDIRECT_URI=http://localhost:3000/api/auth/thumbtack/callback
   
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
   - Bot name: "My Thumbtack Notifier"
   - Bot username: "my_thumbtack_notifier_bot"
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
   - Click "Connect Thumbtack Account" to authenticate
   - Enter your Telegram bot credentials
   - Test the configuration
   - Set up webhooks

### Step 6: Test the Integration

1. **Test Telegram bot:**
   - Use the test button in the setup interface
   - You should receive a test message in Telegram

2. **Test webhook:**
   ```bash
   curl -X POST http://localhost:3000/api/test-webhook \
     -H "Content-Type: application/json" \
     -d '{"message": "Test webhook message"}'
   ```

### Step 7: Deploy to Production (Optional)

For production use, you'll need:

1. **A domain/server** to host your application
2. **Update environment variables** with production URLs
3. **Update Thumbtack redirect URI** in your API application
4. **Deploy** using services like Vercel, Netlify, or your own server

## 🔧 Configuration Details

### Thumbtack OAuth Scopes

The integration requests these scopes:
- `read_businesses` - Access your business information
- `read_negotiations` - Read customer negotiations/leads
- `read_messages` - Read customer messages
- `read_reviews` - Read customer reviews

### Webhook Events

The integration sets up webhooks for:
- `NegotiationCreatedV4` - New customer leads
- `MessageCreatedV4` - New customer messages
- `ReviewCreatedV4` - New customer reviews
- `IncentiveUsedV4` - Customer used promo codes

### Message Format

You'll receive formatted messages like:

```
🎯 NEW THUMBTACK NEGOTIATION

👤 Customer: John Doe
📞 Phone: (555) 123-4567
🏢 Business: Your Business Name
🔧 Service: House Cleaning
📍 Location: San Francisco, CA 94103
💬 Description: Hi, I need a cleaning service for my home...
🆔 Negotiation ID: 123456789
🆔 Business ID: 987654321
⏰ Time: 12/25/2024, 2:30:15 PM
```

## 🛠 Troubleshooting

### Common Issues

1. **"Thumbtack connection failed"**
   - Verify your Client ID and Client Secret
   - Make sure you have API access approval
   - Check that redirect URI matches exactly

2. **"Bot not responding"**
   - Make sure you've started a chat with your bot
   - Verify the bot token is correct
   - Check that Chat ID is a number

3. **"Webhooks not working"**
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
   https://abc123.ngrok.io/api/webhook/thumbtack
   ```

## 📚 API Endpoints

### Authentication
- `GET /api/auth/thumbtack` - Initiate OAuth flow
- `GET /api/auth/thumbtack/callback` - Handle OAuth callback

### Webhooks
- `POST /api/webhook/thumbtack` - Receive Thumbtack notifications
- `POST /api/webhook/thumbtack/setup` - Set up webhooks for your business

### Testing
- `GET /api/telegram/test` - Test Telegram bot configuration
- `POST /api/test-webhook` - Test webhook functionality

## 🔒 Security Notes

- Store access tokens securely (use a database in production)
- Validate webhook signatures (implement signature verification)
- Use HTTPS in production
- Regularly rotate API credentials

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the Thumbtack API documentation
3. Check your server logs for error messages
4. Verify all environment variables are set correctly

## 🎉 Success!

Once everything is set up, you'll receive real-time notifications in Telegram whenever customers interact with your Thumbtack profile!
