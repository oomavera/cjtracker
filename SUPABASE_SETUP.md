# Supabase Setup Instructions

To enable persistent token storage for your live website, follow these steps:

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

## Step 2: Run the Schema

1. Copy the entire contents of `supabase-schema.sql` file
2. Paste it into the SQL Editor
3. Click **Run** or press `Ctrl+Enter`

## Step 3: Verify Tables Were Created

After running the SQL, you should see:
- ✅ `gmail_tokens` table created
- ✅ `notified_emails` table created
- ✅ Indexes created
- ✅ Functions and triggers created

You can verify by:
1. Going to **Table Editor** in Supabase dashboard
2. You should see both `gmail_tokens` and `notified_emails` tables listed

## Step 4: Test the Setup

Once the tables are created:
1. Visit http://localhost:3000/setup-supabase (or your live URL)
2. You should see a success message confirming tables are ready

## What This Enables

✅ **Persistent token storage** - OAuth tokens stored in database, not local files
✅ **Works on Vercel** - No reliance on filesystem
✅ **Reliable notifications** - Email tracking persists across deployments
✅ **Production-ready** - Works with cron jobs on live website

## Troubleshooting

If you see errors:
- Make sure you have the correct Supabase URL and API key in `.env.local`
- Check that the SQL ran without errors in the SQL Editor
- Try refreshing the schema cache in Supabase settings
