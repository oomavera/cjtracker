# Thumbtack API v4 Webhook Setup Guide

This guide will walk you through setting up webhooks with the Thumbtack API v4 to receive real-time notifications when clients contact you.

## Prerequisites

1. **Thumbtack API Access** - You must have approved access to the Thumbtack API
2. **OAuth 2.0 Credentials** - Client ID and Client Secret from Thumbtack
3. **Your Application Running** - This Next.js app with the webhook endpoint

## Step 1: Get Your Business Information

First, you need to get your business ID from Thumbtack:

```bash
# Make an authenticated request to get your businesses
curl -X GET "https://api.thumbtack.com/api/v4/businesses" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

Look for your business ID in the response. You'll need this to create webhooks.

## Step 2: Create Business Webhooks

Create webhooks for your business using the Thumbtack API:

### Webhook URL
Your webhook endpoint URL will be:
```
https://yourdomain.com/api/webhook/thumbtack
```

### Available Event Types
- `NegotiationCreatedV4` - New customer negotiation/lead
- `MessageCreatedV4` - New message in a negotiation
- `ReviewCreatedV4` - New customer review

### Create Webhook Request

```bash
curl -X POST "https://api.thumbtack.com/api/v4/businesses/{businessID}/webhooks" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookURL": "https://yourdomain.com/api/webhook/thumbtack",
    "eventTypes": [
      "NegotiationCreatedV4",
      "MessageCreatedV4",
      "ReviewCreatedV4"
    ],
    "enabled": true
  }'
```

## Step 3: Webhook Authentication (Optional)

For enhanced security, you can add authentication to your webhooks:

### Basic Authentication

```bash
curl -X PUT "https://api.thumbtack.com/api/v4/businesses/{businessID}/webhooks/{webhookID}/auth" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'
```

### Custom Header Authentication

```bash
curl -X PUT "https://api.thumbtack.com/api/v4/businesses/{businessID}/webhooks/{webhookID}/auth" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "header": "X-Webhook-Secret",
    "value": "your_secret_value"
  }'
```

## Step 4: Update Your Webhook Handler (if using auth)

If you set up webhook authentication, update your webhook handler to verify the credentials:

```javascript
// In app/api/webhook/thumbtack/route.js
export async function POST(request) {
  // Verify authentication if configured
  const authHeader = request.headers.get('authorization');
  const customHeader = request.headers.get('x-webhook-secret');
  
  // Add your authentication logic here
  
  // Rest of your webhook processing...
}
```

## Step 5: Test Your Webhooks

### Test Webhook Delivery

1. **Trigger a test event** - Create a test negotiation or send a message
2. **Check your logs** - Look at your server logs for incoming webhook data
3. **Verify Telegram messages** - Confirm you receive notifications

### Webhook Status Check

```bash
# Get all webhooks for your business
curl -X GET "https://api.thumbtack.com/api/v4/businesses/{businessID}/webhooks" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Step 6: Webhook Management

### Update Webhook

```bash
curl -X PUT "https://api.thumbtack.com/api/v4/businesses/{businessID}/webhooks/{webhookID}" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "eventTypes": [
      "NegotiationCreatedV4",
      "MessageCreatedV4",
      "ReviewCreatedV4"
    ]
  }'
```

### Delete Webhook

```bash
curl -X DELETE "https://api.thumbtack.com/api/v4/businesses/{businessID}/webhooks/{webhookID}" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Webhook Event Structure

### NegotiationCreatedV4
```json
{
  "event": {
    "eventType": "NegotiationCreatedV4",
    "description": "New Negotiation created",
    "webhookID": "123456789",
    "triggeredAt": "2024-12-25T20:30:15Z"
  },
  "data": {
    "negotiationID": "987654321",
    "createdAt": "2024-12-25T20:30:15Z",
    "customer": {
      "customerID": "111111111",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "555-555-5555"
    },
    "business": {
      "businessID": "222222222",
      "name": "Your Business Name",
      "imageURL": "https://...",
      "phoneNumber": "+1234567890"
    },
    "request": {
      "requestID": "333333333",
      "description": "I need house cleaning services",
      "category": {
        "categoryID": "444444444",
        "name": "House Cleaning"
      },
      "location": {
        "address1": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94103"
      }
    }
  }
}
```

### MessageCreatedV4
```json
{
  "event": {
    "eventType": "MessageCreatedV4",
    "description": "New Message sent on a Negotiation thread",
    "webhookID": "123456789",
    "triggeredAt": "2024-12-25T21:15:22Z"
  },
  "data": {
    "messageID": "555555555",
    "negotiationID": "987654321",
    "from": "Customer",
    "text": "What time are you available tomorrow?",
    "sentAt": "2024-12-25T21:15:22Z",
    "customer": {
      "customerID": "111111111",
      "displayName": "John D."
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Webhook not receiving data**
   - Check your webhook URL is accessible from the internet
   - Verify HTTPS is enabled (required by Thumbtack)
   - Check your server logs for errors

2. **Authentication failures**
   - Verify your OAuth tokens are valid
   - Check your business ID is correct
   - Ensure you have the right permissions

3. **Telegram not sending messages**
   - Verify your bot token and chat ID
   - Check the `/api/telegram/test` endpoint
   - Look for errors in your webhook handler

### Debug Mode

Enable debug logging by adding this to your webhook handler:

```javascript
console.log('Webhook received:', JSON.stringify(body, null, 2));
console.log('Headers:', Object.fromEntries(request.headers.entries()));
```

## Security Best Practices

1. **Use HTTPS** - Thumbtack requires HTTPS for webhook URLs
2. **Implement Authentication** - Use Basic Auth or custom headers
3. **Validate Signatures** - Consider implementing signature verification
4. **Rate Limiting** - Implement rate limiting to prevent abuse
5. **Logging** - Log all webhook events for debugging

## Next Steps

Once your webhooks are set up:

1. **Test with real events** - Create test negotiations and messages
2. **Monitor performance** - Watch your server logs and Telegram delivery
3. **Customize messages** - Modify the message formatting in the webhook handler
4. **Add more features** - Consider adding message replies or status updates

Your Thumbtack → Telegram integration is now ready to provide real-time notifications whenever clients contact you!
