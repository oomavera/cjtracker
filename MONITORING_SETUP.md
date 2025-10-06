# Free 24/7 Monitoring Setup (No Vercel Pro Required)

Since Vercel cron jobs require a paid plan, we'll use a free external service to trigger the monitoring.

## Option 1: Cron-job.org (Recommended)

1. Go to https://cron-job.org/en/
2. Create a free account
3. Click "Create cronjob"
4. Configure:
   - **Title**: Gmail Lead Monitor
   - **URL**: `https://your-app.vercel.app/api/gmail-polling`
   - **Schedule**: Every 1 minute (`* * * * *`)
   - **Method**: GET
5. Save and enable

## Option 2: UptimeRobot

1. Go to https://uptimerobot.com/
2. Create a free account
3. Click "Add New Monitor"
4. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Gmail Monitor
   - **URL**: `https://your-app.vercel.app/api/gmail-polling`
   - **Monitoring Interval**: 5 minutes (free tier limit)
5. Create Monitor

## Option 3: EasyCron

1. Go to https://www.easycron.com/
2. Create a free account (100 executions/day)
3. Add Cron Job:
   - **URL**: `https://your-app.vercel.app/api/gmail-polling`
   - **Cron Expression**: `* * * * *` (every minute)
4. Save

## Option 4: GitHub Actions (Free for public repos)

Create `.github/workflows/monitor.yml`:

```yaml
name: Gmail Monitor
on:
  schedule:
    - cron: '* * * * *'  # Every minute
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Gmail Polling
        run: curl -X GET https://your-app.vercel.app/api/gmail-polling
```

## What Gets Checked

The external service will call `/api/gmail-polling` which:
- ✅ Checks Gmail for new "Direct Lead" emails
- ✅ Sends Telegram notifications
- ✅ Stores tracking info in Supabase
- ✅ Returns status (200 OK if successful)

## Benefits

- 🆓 Completely free
- 🌐 Works from anywhere
- ⚡ Fast and reliable
- 📊 Get monitoring stats from the service

## Testing

Test your endpoint works:
```bash
curl https://your-app.vercel.app/api/gmail-polling
```

You should see: `{"success":true,...}`
