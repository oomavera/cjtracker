import pg from 'pg';

const { Client } = pg;

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('Missing SUPABASE_DB_URL');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const statements = [
      `create table if not exists public.customers (
        id uuid primary key,
        name text not null,
        bucket text not null check (bucket in ('not_closed','no_rebook','closed','said_no')),
        platform text,
        start_date timestamptz,
        book_date timestamptz,
        clean_date timestamptz,
        journey_state text,
        journey_stage_started_at timestamptz,
        history jsonb default '[]'::jsonb,
        data jsonb default '{}'::jsonb,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );`,
      `create index if not exists customers_bucket_idx on public.customers (bucket);`,
      `create index if not exists customers_updated_at_idx on public.customers (updated_at desc);`,
      // touchpoint_notes: store global/shared notes for touchpoint templates
      `create table if not exists public.touchpoint_notes (
        key text primary key,
        content text,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );`,
      `create index if not exists touchpoint_notes_updated_at_idx on public.touchpoint_notes (updated_at desc);`,
      `alter table public.customers enable row level security;`,
      `alter table public.touchpoint_notes enable row level security;`,
      `drop policy if exists "public read" on public.customers;`,
      `drop policy if exists "public insert" on public.customers;`,
      `drop policy if exists "public update" on public.customers;`,
      `drop policy if exists "public delete" on public.customers;`,
      `drop policy if exists "public read" on public.touchpoint_notes;`,
      `drop policy if exists "public insert" on public.touchpoint_notes;`,
      `drop policy if exists "public update" on public.touchpoint_notes;`,
      `drop policy if exists "public delete" on public.touchpoint_notes;`,
      `create policy "public read" on public.customers for select using (true);`,
      `create policy "public insert" on public.customers for insert with check (true);`,
      `create policy "public update" on public.customers for update using (true);`,
      `create policy "public delete" on public.customers for delete using (true);`,
      `create policy "public read" on public.touchpoint_notes for select using (true);`,
      `create policy "public insert" on public.touchpoint_notes for insert with check (true);`,
      `create policy "public update" on public.touchpoint_notes for update using (true);`,
      `create policy "public delete" on public.touchpoint_notes for delete using (true);`,
      `create or replace function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;`,
      `drop trigger if exists customers_set_updated_at on public.customers;`,
      `create trigger customers_set_updated_at before update on public.customers for each row execute function set_updated_at();`,
      `drop trigger if exists touchpoint_notes_set_updated_at on public.touchpoint_notes;`,
      `create trigger touchpoint_notes_set_updated_at before update on public.touchpoint_notes for each row execute function set_updated_at();`
    ];
    for (const sql of statements) {
      await client.query(sql);
    }
    console.log('Supabase customers table and policies provisioned.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


