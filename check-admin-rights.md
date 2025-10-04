# Check Your Admin Rights

## Step 1: Go to Organization Policies
Visit: https://console.cloud.google.com/iam-admin/orgpolicies

## Step 2: Look for "Domain Restricted Sharing"
- If you see it and can click "EDIT" → You have admin rights
- If you see "You don't have permission" → Ask your org admin
- If you don't see the page at all → You're not an org admin

## Step 3: If You Can Edit:
1. Click "EDIT" on Domain Restricted Sharing policy
2. Add to allowed domains: `system.gserviceaccount.com`  
3. Save

## Step 4: Test Again
Go back to /gmail-push-setup and try activating push notifications!

---

**Alternative**: If you can't modify the policy, Pingdom (1-minute polling) is still an excellent free solution!