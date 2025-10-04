import { supabase } from './supabaseClient';

export function isSupabaseConfigured() {
  try {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  } catch {
    return false;
  }
}

export async function fetchAllCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function upsertCustomers(rows) {
  if (!rows || rows.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from('customers')
    .upsert(rows, { onConflict: 'id' });
  return { data, error };
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  return { error };
}

// Touchpoint Notes API (shared templates)
export async function getTouchpointNote(key) {
  const { data, error } = await supabase.from('touchpoint_notes').select('content').eq('key', key).maybeSingle();
  if (error) return { content: '', error };
  return { content: data?.content || '', error: null };
}

export async function setTouchpointNote(key, content) {
  const { error } = await supabase.from('touchpoint_notes').upsert({ key, content }, { onConflict: 'key' });
  return { error };
}

export function mapStateToRows({ leads, nrLeads, closed, saidNo }) {
  const rows = [];
  const now = new Date().toISOString();

  for (const l of leads) {
    rows.push({
      id: l.id,
      name: l.name,
      bucket: 'not_closed',
      platform: l.platform || null,
      start_date: l.startDate || null,
      journey_state: l.journeyState || 'Not Closed',
      book_date: null,
      clean_date: null,
      journey_stage_started_at: null,
      history: l.history || [],
      data: l.data || {},
      updated_at: now,
    });
  }
  for (const l of nrLeads) {
    rows.push({
      id: l.id,
      name: l.name,
      bucket: 'no_rebook',
      platform: l.platform || null,
      start_date: l.startDate || null,
      journey_state: l.journeyState || 'Not REBOOKED',
      book_date: null,
      clean_date: null,
      journey_stage_started_at: null,
      history: l.history || [],
      data: l.data || {},
      updated_at: now,
    });
  }
  for (const l of saidNo) {
    rows.push({
      id: l.id,
      name: l.name,
      bucket: 'said_no',
      platform: l.platform || null,
      start_date: l.startDate || null,
      journey_state: l.journeyState || 'SAID NO',
      book_date: null,
      clean_date: null,
      journey_stage_started_at: null,
      history: l.history || [],
      data: l.data || {},
      updated_at: now,
    });
  }
  for (const l of closed) {
    rows.push({
      id: l.id,
      name: l.name,
      bucket: 'closed',
      platform: l.platform || null,
      start_date: null,
      journey_state: l.journeyState || 'Closed1',
      book_date: l.bookDate || null,
      clean_date: l.cleanDate || null,
      journey_stage_started_at: l.journeyStageStartedAt || null,
      history: l.history || [],
      data: l.data || {},
      updated_at: now,
    });
  }
  return rows;
}

export function reduceRowsToState(rows) {
  const next = { leads: [], nrLeads: [], closed: [], saidNo: [] };
  for (const r of rows || []) {
    if (r.bucket === 'not_closed') {
      next.leads.push({ id: r.id, name: r.name, platform: r.platform || undefined, startDate: r.start_date || null, journeyState: r.journey_state || 'Not Closed', history: r.history || [], data: r.data || {} });
    } else if (r.bucket === 'no_rebook') {
      next.nrLeads.push({ id: r.id, name: r.name, platform: r.platform || undefined, startDate: r.start_date || null, journeyState: r.journey_state || 'Not REBOOKED', history: r.history || [], data: r.data || {} });
    } else if (r.bucket === 'said_no') {
      next.saidNo.push({ id: r.id, name: r.name, platform: r.platform || undefined, startDate: r.start_date || null, journeyState: r.journey_state || 'SAID NO', history: r.history || [], data: r.data || {} });
    } else if (r.bucket === 'closed') {
      next.closed.push({ id: r.id, name: r.name, platform: r.platform || undefined, bookDate: r.book_date || null, cleanDate: r.clean_date || null, journeyStageStartedAt: r.journey_stage_started_at || null, journeyState: r.journey_state || 'Closed1', history: r.history || [], data: r.data || {} });
    }
  }
  return next;
}


