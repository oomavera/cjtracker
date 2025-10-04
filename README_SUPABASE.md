Supabase Setup (Customers table)

1) Create a new project in Supabase and copy the URL and anon key into your .env.local:

NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key

2) Create table customers with a flexible JSON data column to let us add new fields without migrations:

-- SQL
create table if not exists public.customers (
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
);

create index if not exists customers_bucket_idx on public.customers (bucket);
create index if not exists customers_updated_at_idx on public.customers (updated_at desc);

3) RLS: enable and allow anonymous CRUD for now (tighten later):

alter table public.customers enable row level security;
create policy "public read" on public.customers for select using (true);
create policy "public insert" on public.customers for insert with check (true);
create policy "public update" on public.customers for update using (true);
create policy "public delete" on public.customers for delete using (true);

We store any future custom fields inside data (JSONB), so adding new tracked data is seamless without schema changes.

