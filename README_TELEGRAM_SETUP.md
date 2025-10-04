# Thumbtack → Telegram Bot Integration

This integration allows you to receive Telegram notifications whenever clients reach out to you on Thumbtack.

## Features

- ✅ Real-time notifications when clients contact you on Thumbtack
- ✅ Detailed message formatting with client information
- ✅ Support for different types of Thumbtack events (new leads, messages)
- ✅ Easy setup and testing interface
- ✅ Error handling and logging

## Quick Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a chat and send `/newbot`
3. Follow the instructions to create your bot
4. **Save the bot token** - you'll need this later

### 2. Get Your Chat ID

1. Start a chat with your new bot
2. Send any message to the bot
3. Visit: `https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getUpdates`
4. Find your chat ID in the response (it's a number like `123456789`)

### 3. Configure Environment Variables

Create a `.env.local` file in your project root:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Test Your Setup

1. Start your development server: `npm run dev`
2. Visit: `http://localhost:3000/setup`
3. Click "Test Bot Configuration"

### 6. Configure Thumbtack Webhook

**Important:** Thumbtack API access requires approval. You'll need to:

1. Request API access from Thumbtack
2. Once approved, configure the webhook URL in your Thumbtack developer dashboard:
   ```
   https://yourdomain.com/api/webhook/thumbtack
   ```

## API Endpoints

### Webhook Endpoint
- **URL:** `/api/webhook/thumbtack`
- **Method:** POST
- **Purpose:** Receives notifications from Thumbtack

### Test Endpoint
- **URL:** `/api/telegram/test`
- **Method:** GET
- **Purpose:** Tests your Telegram bot configuration

## Message Format

When a client contacts you on Thumbtack, you'll receive formatted messages like:

### New Negotiation (Lead):
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

### New Message:
```
💬 NEW MESSAGE

👤 From: John Doe (Customer)
💬 Message: What time are you available tomorrow?
🆔 Negotiation ID: 123456789
🆔 Message ID: 987654321
⏰ Time: 12/25/2024, 3:15:22 PM
```

### New Review:
```
⭐ NEW REVIEW

👤 Reviewer: John Doe
⭐ Rating: 5/5
💬 Review: Excellent service! Very professional and thorough.
🆔 Review ID: 123456789
⏰ Time: 12/26/2024, 10:30:45 AM
```

## Supported Thumbtack API v4 Events

The integration handles these types of Thumbtack webhook events:

- `NegotiationCreatedV4` - New negotiation (lead) created by a customer
- `MessageCreatedV4` - New message sent in a negotiation thread
- `ReviewCreatedV4` - New review posted by a customer
- `IncentiveUsedV4` - Customer used a discount/promo code

## Troubleshooting

### Bot Not Responding
- Make sure you've started a chat with your bot first
- Verify your bot token is correct
- Check that your chat ID is a number

### Environment Variables Not Loading
- Restart your development server after adding `.env.local`
- Make sure the file is in the project root
- Verify there are no spaces around the `=` sign

### Webhook Not Receiving Data
- Ensure your server is accessible from the internet (use ngrok for local testing)
- Check that Thumbtack has approved your API access
- Verify the webhook URL is correct in your Thumbtack settings

### Testing Locally

For local testing, you can use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# Use the ngrok URL as your webhook endpoint
```

## Security Considerations

- Keep your bot token secure and never commit it to version control
- Use environment variables for all sensitive configuration
- Consider implementing webhook signature verification for production use
- Monitor your bot's usage to prevent abuse

## Production Deployment

When deploying to production:

1. Set up your environment variables in your hosting platform
2. Ensure your domain is accessible and has HTTPS
3. Configure the webhook URL in Thumbtack with your production domain
4. Monitor logs for any issues

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check your server logs
3. Verify your environment variables are set correctly
4. Test your bot configuration using the test endpoint

## File Structure

```
app/
├── api/
│   ├── webhook/
│   │   └── thumbtack/
│   │       └── route.js          # Webhook endpoint
│   └── telegram/
│       └── test/
│           └── route.js          # Test endpoint
├── components/
│   └── TelegramSetup.js          # Setup interface
├── setup/
│   └── page.js                   # Setup page
└── page.js                       # Main app
lib/
└── telegram.js                   # Telegram utilities
```

## Next Steps

1. Set up your Telegram bot and test the configuration
2. Request Thumbtack API access
3. Configure the webhook in Thumbtack
4. Test with real Thumbtack notifications
5. Customize message formatting if needed
