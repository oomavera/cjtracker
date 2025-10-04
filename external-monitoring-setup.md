# Free 5-Second Email Monitoring Setup

## Option 1: UptimeRobot (Free - 5 minute intervals)
1. Sign up at https://uptimerobot.com (free)
2. Create HTTP monitor for: `https://yourdomain.vercel.app/api/gmail-polling`
3. Set interval to 5 minutes (free tier)
4. Will ping your endpoint every 5 minutes

## Option 2: Cron-Job.org (Free - 1 minute intervals)
1. Sign up at https://cron-job.org (free)
2. Create new cron job:
   - URL: `https://yourdomain.vercel.app/api/gmail-polling`
   - Schedule: `* * * * *` (every minute)
   - Method: GET

## Option 3: Pingdom (Free - 1 minute intervals)
1. Sign up at https://pingdom.com (free tier)
2. Create uptime check for your polling endpoint
3. Set to 1-minute intervals

## Option 4: StatusCake (Free - 30 second intervals)
1. Sign up at https://statuscake.com (free)
2. Create uptime test for your endpoint
3. Set to 30-second intervals (closest to 5 seconds on free tier)

## Option 5: Self-Hosted with GitHub Actions (Free)
Create `.github/workflows/gmail-monitor.yml`:

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
        run: |
          curl -X GET "https://yourdomain.vercel.app/api/gmail-polling"
```

## Best Free Solution: StatusCake (30 seconds)
StatusCake offers the fastest free monitoring at 30-second intervals, which is close to your 5-second requirement.