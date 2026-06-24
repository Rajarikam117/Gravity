-- GRAVITY: Multi-file support migration
-- Run this in Supabase SQL Editor AFTER schema.sql

-- Event files (multiple photo+video+mind per event)
create table if not exists public.event_files (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text,
  photo_url text not null,
  video_url text not null,
  mind_url text not null,
  imagekit_photo_path text,
  imagekit_video_path text,
  imagekit_mind_path text,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null
);

create index if not exists event_files_event_id_idx on public.event_files(event_id);

alter table public.event_files enable row level security;

-- Users can view files of their own events
create policy "Users can view own event files"
  on public.event_files for select
  using (
    exists (
      select 1 from public.events
      where events.id = event_files.event_id
        and events.user_id = auth.uid()
    )
  );

-- Users can insert files into their own events
create policy "Users can insert own event files"
  on public.event_files for insert
  with check (
    exists (
      select 1 from public.events
      where events.id = event_files.event_id
        and events.user_id = auth.uid()
    )
  );

-- Users can update their own event files
create policy "Users can update own event files"
  on public.event_files for update
  using (
    exists (
      select 1 from public.events
      where events.id = event_files.event_id
        and events.user_id = auth.uid()
    )
  );

-- Users can delete their own event files
create policy "Users can delete own event files"
  on public.event_files for delete
  using (
    exists (
      select 1 from public.events
      where events.id = event_files.event_id
        and events.user_id = auth.uid()
    )
  );

-- Public can view files of published events (for scanner)
create policy "Public can view published event files"
  on public.event_files for select
  using (
    exists (
      select 1 from public.events
      where events.id = event_files.event_id
        and events.is_published = true
    )
  );
