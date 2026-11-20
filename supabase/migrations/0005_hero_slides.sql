-- Migration 0005: Editorial homepage hero slideshow slides + scoped RLS policies

create table if not exists public.hero_slides (
  id              uuid primary key default gen_random_uuid(),
  image_public_id text not null check (char_length(trim(image_public_id)) between 1 and 500),
  alt_text        text not null check (char_length(trim(alt_text)) between 3 and 300),
  focal_x         smallint not null default 50 check (focal_x between 0 and 100),
  focal_y         smallint not null default 30 check (focal_y between 0 and 100),
  eyebrow_left    text check (eyebrow_left is null or char_length(eyebrow_left) <= 80),
  eyebrow_right   text check (eyebrow_right is null or char_length(eyebrow_right) <= 80),
  headline        text check (headline is null or char_length(headline) <= 120),
  subcopy         text check (subcopy is null or char_length(subcopy) <= 280),
  sort_order      integer not null default 0 check (sort_order >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists hero_slides_public_idx
  on public.hero_slides (sort_order asc, created_at asc)
  where is_active;

drop trigger if exists hero_slides_updated on public.hero_slides;
create trigger hero_slides_updated
  before update on public.hero_slides
  for each row execute function set_updated_at();

alter table public.hero_slides enable row level security;

grant select on table public.hero_slides to anon;
grant select, insert, update, delete on table public.hero_slides to authenticated;
grant all on table public.hero_slides to service_role;

drop policy if exists hero_slides_public on public.hero_slides;
create policy hero_slides_public on public.hero_slides
  for select to anon, authenticated
  using (is_active);

drop policy if exists hero_slides_admin on public.hero_slides;
create policy hero_slides_admin on public.hero_slides
  for all to authenticated
  using (has_scope('content'))
  with check (has_scope('content'));
