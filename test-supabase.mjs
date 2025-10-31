import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Testing Supabase connection...\n');

// Test 1: Check if gmail_tokens table exists
console.log('Test 1: Checking gmail_tokens table...');
const { data: tokens, error: tokensError } = await supabase
  .from('gmail_tokens')
  .select('*')
  .limit(1);

if (tokensError) {
  console.log('❌ gmail_tokens error:', tokensError.message);
  console.log('   Code:', tokensError.code);
  console.log('   Details:', tokensError.details);
} else {
  console.log('✅ gmail_tokens table exists');
  console.log('   Current tokens:', tokens.length);
}

// Test 2: Check if notified_emails table exists
console.log('\nTest 2: Checking notified_emails table...');
const { data: emails, error: emailsError } = await supabase
  .from('notified_emails')
  .select('*')
  .limit(1);

if (emailsError) {
  console.log('❌ notified_emails error:', emailsError.message);
  console.log('   Code:', emailsError.code);
} else {
  console.log('✅ notified_emails table exists');
  console.log('   Current emails:', emails.length);
}

// Test 3: Try to insert a test token
console.log('\nTest 3: Trying to insert a test token...');
const { data: insertData, error: insertError } = await supabase
  .from('gmail_tokens')
  .insert([
    {
      access_token: 'test_token_12345',
      refresh_token: 'test_refresh_67890',
      token_time: Date.now()
    }
  ])
  .select();

if (insertError) {
  console.log('❌ Insert error:', insertError.message);
  console.log('   Code:', insertError.code);
  console.log('   Details:', insertError.details);
} else {
  console.log('✅ Successfully inserted test token');
  console.log('   Data:', insertData);

  // Clean up test token
  const { error: deleteError } = await supabase
    .from('gmail_tokens')
    .delete()
    .eq('access_token', 'test_token_12345');

  if (!deleteError) {
    console.log('✅ Test token cleaned up');
  }
}

console.log('\n✨ Test complete!\n');
