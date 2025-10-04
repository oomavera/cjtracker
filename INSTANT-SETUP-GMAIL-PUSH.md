# ⚡ INSTANT Gmail Push Notifications Setup

## Step 1: Google Cloud Console Setup (2 minutes)

### 1.1 Enable Pub/Sub API
1. Go to: https://console.cloud.google.com/apis/library/pubsub.googleapis.com
2. Select your project (same one with Gmail API)
3. Click "ENABLE"

### 1.2 Create Pub/Sub Topic
1. Go to: https://console.cloud.google.com/cloudpubsub/topic/list
2. Click "CREATE TOPIC"
3. Topic ID: `gmail-notifications`
4. Click "CREATE TOPIC"

### 1.3 Create Subscription
1. Click on your `gmail-notifications` topic
2. Click "CREATE SUBSCRIPTION" 
3. Subscription ID: `gmail-webhook-sub`
4. Delivery Type: **Push**
5. Endpoint URL: `https://your-vercel-domain.vercel.app/api/gmail-webhook`
6. Click "CREATE"

## Step 2: Gmail API Watch Setup (1 minute)

### 2.1 Set Up Watch Request
Run this API call to start Gmail push notifications:

```bash
curl -X POST \
  https://gmail.googleapis.com/gmail/v1/users/me/watch \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topicName": "projects/YOUR_PROJECT_ID/topics/gmail-notifications",
    "labelIds": ["INBOX", "SPAM"]
  }'
```

## Step 3: Get Your Values

### Your Project ID:
1. Go to: https://console.cloud.google.com/home/dashboard
2. Copy the Project ID from the top

### Your Access Token:
- Use the token from your current Gmail setup
- Or get it from: http://localhost:3000/api/debug-gmail

### Replace in curl command:
- `YOUR_ACCESS_TOKEN` = Your Gmail access token
- `YOUR_PROJECT_ID` = Your Google Cloud project ID
- `your-vercel-domain.vercel.app` = Your Vercel deployment URL

## Step 4: Test (30 seconds)
1. Send yourself a test email with "New Direct Lead" in subject
2. Should get INSTANT Telegram notification!

---

## Quick Values for Copy-Paste:

**Pub/Sub Topic**: `gmail-notifications`
**Subscription ID**: `gmail-webhook-sub`
**Webhook Endpoint**: `/api/gmail-webhook` (already created)

---

## If You Get Stuck:
The webhook endpoint is ready at `/api/gmail-webhook` - just need to:
1. Create the Pub/Sub topic
2. Run the curl command to start watching
3. Test with an email!