// Token storage using Supabase
import { supabase } from './supabaseClient.js';

export async function storeTokens(accessToken, refreshToken) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { data, error } = await supabase
      .from('gmail_tokens')
      .insert([
        {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_time: Date.now()
        }
      ])
      .select();

    if (error) {
      console.error('Failed to store tokens:', error);
      return false;
    }

    console.log('✅ Tokens stored successfully');
    return true;
  } catch (error) {
    console.error('Failed to store tokens:', error);
    return false;
  }
}

export async function getStoredTokens() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabase
      .from('gmail_tokens')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Failed to read tokens:', error);
      return null;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenTime: data.token_time,
      timestamp: new Date(data.updated_at).getTime()
    };
  } catch (error) {
    console.error('Failed to read tokens:', error);
    return null;
  }
}

export async function clearTokens() {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabase
      .from('gmail_tokens')
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) {
      console.error('Failed to clear tokens:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to clear tokens:', error);
    return false;
  }
}

export async function isEmailAlreadyNotified(messageId) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { data, error } = await supabase
      .from('notified_emails')
      .select('message_id')
      .eq('message_id', messageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - email not notified yet
        return false;
      }
      console.error('Failed to check notified emails:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Failed to check notified emails:', error);
    return false;
  }
}

export async function markEmailAsNotified(messageId) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    const { error } = await supabase
      .from('notified_emails')
      .insert([
        {
          message_id: messageId
        }
      ]);

    if (error) {
      // Ignore duplicate key errors (email already marked)
      if (error.code === '23505') {
        return true;
      }
      console.error('Failed to mark email as notified:', error);
      return false;
    }

    // Cleanup old notifications (keep only last 100)
    await supabase.rpc('delete_old_notifications', { keep_count: 100 }).catch(err => {
      console.warn('Failed to cleanup old notifications:', err);
    });

    return true;
  } catch (error) {
    console.error('Failed to mark email as notified:', error);
    return false;
  }
}