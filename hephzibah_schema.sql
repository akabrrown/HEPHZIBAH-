-- Hephzibah Media: backend schema v1.0 (PostgreSQL 15+ on Supabase)
-- Forward-only. Apply in order. Money is integer pesewas (GHS minor units).

-- ============ 0001 extensions, enums, helpers ============
create extension if not exists btree_gist;
create extension if not exists citext;

create type service_kind     as enum ('photography','videography','design');
create type booking_status   as enum ('new','reviewing','quoted','accepted','confirmed','completed','declined','cancelled','expired');
create type quote_status     as enum ('draft','sent','accepted','expired','superseded','withdrawn');
create type contact_method   as enum ('whatsapp','phone','email');
create type time_of_day      as enum ('morning','afternoon','evening','all_day','unsure');
create type media_type       as enum ('image','video_embed');
create type video_provider   as enum ('youtube','vimeo');
create type publish_status   as enum ('draft','published');
create type payment_method   as enum ('momo','bank_transfer','cash','card');
create type payment_provider as enum ('manual','paystack');
create type outbox_status    as enum ('pending','sent','failed','dead');
create type enquiry_status   as enum ('new','replied','spam','closed');

create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create function forbid_update() returns trigger language plpgsql as $$
begin raise exception '% is append-only', tg_table_name; end $$;

-- ============ 0002 admin identity ============
create table admin_users (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  scopes       text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint admin_scopes_valid check (scopes <@ array['bookings','content','settings','team'])
);

-- true only for an active admin holding the scope AND a TOTP-verified session (aal2)
create function has_scope(s text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users a
                 where a.id = auth.uid() and a.is_active and s = any(a.scopes))
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

-- ============ 0003 catalogue ============
create table occasions (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null,
  applies_to service_kind[] not null check (cardinality(applies_to) > 0),
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

create table services (
  id                   uuid primary key default gen_random_uuid(),
  kind                 service_kind not null,
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                 text not null,
  summary              text not null,
  description_md       text,
  starting_price_minor integer check (starting_price_minor >= 0),
  currency             char(3) not null default 'GHS',
  sort_order           integer not null default 0,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger services_updated before update on services for each row execute function set_updated_at();

create table packages (
  id             uuid primary key default gen_random_uuid(),
  service_id     uuid not null references services(id) on delete restrict,
  name           text not null,
  summary        text,
  price_minor    integer not null check (price_minor >= 0),
  currency       char(3) not null default 'GHS',
  duration_hours numeric(4,1) check (duration_hours > 0),
  deliverables   text[] not null default '{}',
  is_featured    boolean not null default false,
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index packages_service_idx on packages (service_id, sort_order) where is_active;
create trigger packages_updated before update on packages for each row execute function set_updated_at();

-- ============ 0004 bookings, quotes, payments ============
create table bookings (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique check (reference ~ '^HM-[0-9]{4}-[A-Z2-9]{5}$'),
  idempotency_key   text unique,
  access_token_hash text not null,
  status            booking_status not null default 'new',
  kind              service_kind not null,
  service_id        uuid not null references services(id) on delete restrict,
  package_id        uuid references packages(id) on delete set null,
  occasion_id       uuid references occasions(id) on delete set null,
  occasion_other    text check (char_length(occasion_other) <= 80),
  client_name       text not null check (char_length(client_name) between 2 and 120),
  client_email      citext not null check (client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  client_phone      text not null check (client_phone ~ '^\+?[0-9 ]{9,16}$'),
  preferred_contact contact_method not null default 'whatsapp',
  event_date        date,
  time_of_day       time_of_day,
  venue_text        text check (char_length(venue_text) <= 200),
  venue_city        text check (char_length(venue_city) <= 80),
  guest_count       integer check (guest_count between 1 and 20000),
  deadline          date,
  brief             text not null check (char_length(brief) between 10 and 4000),
  budget_band       text check (char_length(budget_band) <= 40),
  reference_links   text[] not null default '{}' check (cardinality(reference_links) <= 5),
  source            text check (char_length(source) <= 40),
  starts_at         timestamptz,
  ends_at           timestamptz,
  accepted_quote_id uuid,
  cancelled_reason  text check (char_length(cancelled_reason) <= 500),
  privacy_version   text not null,
  terms_version     text not null,
  consented_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint booking_date_shape   check (kind = 'design' or event_date is not null),
  constraint booking_design_dates check (kind <> 'design' or event_date is null),
  constraint booking_window_order check (starts_at is null or (ends_at is not null and ends_at > starts_at)),
  constraint booking_confirmed_window check (
    status not in ('confirmed','completed') or kind = 'design' or (starts_at is not null and ends_at is not null))
);
-- The invariant that matters most: one crew, no two confirmed jobs overlap.
alter table bookings add constraint bookings_no_crew_overlap
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
  where (status = 'confirmed' and kind <> 'design');
create index bookings_inbox_idx    on bookings (status, created_at desc);
create index bookings_calendar_idx on bookings (event_date) where status in ('quoted','accepted','confirmed');
create index bookings_email_idx    on bookings (client_email);
create trigger bookings_updated before update on bookings for each row execute function set_updated_at();

-- The booking state machine is enforced here, not only in application code.
create function bookings_status_guard() returns trigger language plpgsql as $$
begin
  if new.status = old.status then return new; end if;
  if (old.status, new.status) in (
    ('new','reviewing'), ('new','declined'), ('new','cancelled'),
    ('reviewing','quoted'), ('reviewing','declined'), ('reviewing','cancelled'),
    ('quoted','reviewing'), ('quoted','accepted'), ('quoted','declined'), ('quoted','expired'), ('quoted','cancelled'),
    ('accepted','confirmed'), ('accepted','cancelled'),
    ('confirmed','completed'), ('confirmed','cancelled'),
    ('expired','reviewing')
  ) then return new; end if;
  raise exception 'illegal booking transition % -> %', old.status, new.status using errcode = 'P0001';
end $$;
create trigger bookings_status_guard_trg before update of status on bookings
  for each row execute function bookings_status_guard();

create table quotes (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  version       integer not null check (version > 0),
  status        quote_status not null default 'draft',
  currency      char(3) not null default 'GHS',
  total_minor   integer not null check (total_minor >= 0),
  deposit_minor integer not null default 0 check (deposit_minor >= 0),
  valid_until   timestamptz,
  notes         text,
  sent_at       timestamptz,
  accepted_at   timestamptz,
  created_by    uuid references admin_users(id),
  created_at    timestamptz not null default now(),
  unique (booking_id, version),
  constraint quote_deposit_le_total check (deposit_minor <= total_minor)
);
create unique index quotes_one_sent_per_booking on quotes (booking_id) where status = 'sent';
alter table bookings add constraint bookings_accepted_quote_fk
  foreign key (accepted_quote_id) references quotes(id) deferrable initially deferred;

create table quote_items (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null references quotes(id) on delete cascade,
  position         smallint not null,
  description      text not null check (char_length(description) between 1 and 200),
  quantity         numeric(8,2) not null default 1 check (quantity > 0),
  unit_price_minor integer not null check (unit_price_minor >= 0),
  line_total_minor integer generated always as (round(quantity * unit_price_minor)::integer) stored,
  unique (quote_id, position)
);

-- Snapshot pricing: a quote's money fields freeze once it leaves draft.
create function quotes_guard() returns trigger language plpgsql as $$
declare v_sum integer;
begin
  if old.status <> 'draft' and (new.total_minor <> old.total_minor or new.deposit_minor <> old.deposit_minor
     or new.booking_id <> old.booking_id or new.version <> old.version) then
    raise exception 'quote % is frozen', old.id;
  end if;
  if old.status = 'draft' and new.status = 'sent' then
    select coalesce(sum(line_total_minor), 0) into v_sum from quote_items where quote_id = new.id;
    if v_sum <> new.total_minor then
      raise exception 'quote total % does not match item sum %', new.total_minor, v_sum;
    end if;
  end if;
  return new;
end $$;
create trigger quotes_guard_trg before update on quotes for each row execute function quotes_guard();

create function quote_items_guard() returns trigger language plpgsql as $$
declare v_status quote_status; v_id uuid;
begin
  v_id := coalesce(new.quote_id, old.quote_id);
  select status into v_status from quotes where id = v_id;
  if v_status is not null and v_status <> 'draft' then raise exception 'quote % is frozen', v_id; end if;
  return coalesce(new, old);
end $$;
create trigger quote_items_guard_trg before insert or update or delete on quote_items
  for each row execute function quote_items_guard();

create table payments (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references bookings(id) on delete restrict,
  provider           payment_provider not null default 'manual',
  method             payment_method not null,
  amount_minor       integer not null check (amount_minor > 0),
  is_refund          boolean not null default false,
  currency           char(3) not null default 'GHS',
  provider_reference text,
  received_at        timestamptz not null,
  note               text,
  recorded_by        uuid references admin_users(id),
  created_at         timestamptz not null default now(),
  unique (provider, provider_reference)
);
create index payments_booking_idx on payments (booking_id);
create trigger payments_immutable before update on payments for each row execute function forbid_update();

create table booking_events (
  id                bigint generated always as identity primary key,
  booking_id        uuid not null references bookings(id) on delete cascade,
  actor_type        text not null check (actor_type in ('client','admin','system')),
  actor_id          uuid references admin_users(id),
  event_type        text not null,
  from_status       booking_status,
  to_status         booking_status,
  note              text,
  visible_to_client boolean not null default false,
  created_at        timestamptz not null default now()
);
create index booking_events_idx on booking_events (booking_id, created_at);
create trigger booking_events_immutable before update on booking_events for each row execute function forbid_update();

create table blocked_dates (
  id         uuid primary key default gen_random_uuid(),
  during     daterange not null check (not isempty(during)),
  reason     text not null,
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);
create index blocked_dates_during_idx on blocked_dates using gist (during);

-- ============ 0005 portfolio and site content ============
create table portfolio_items (
  id                        uuid primary key default gen_random_uuid(),
  kind                      service_kind not null,
  slug                      text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                     text not null,
  summary                   text,
  occasion_id               uuid references occasions(id) on delete set null,
  shot_on                   date,
  location_text             text,
  status                    publish_status not null default 'draft',
  is_featured               boolean not null default false,
  sort_order                integer not null default 0,
  client_consent_to_publish boolean not null default false,
  consent_note              text,
  published_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint published_requires_consent check (status <> 'published' or client_consent_to_publish),
  constraint published_has_timestamp    check (status <> 'published' or published_at is not null)
);
create index portfolio_public_idx on portfolio_items (kind, sort_order) where status = 'published';
create trigger portfolio_updated before update on portfolio_items for each row execute function set_updated_at();

create table media_assets (
  id                  uuid primary key default gen_random_uuid(),
  portfolio_item_id   uuid not null references portfolio_items(id) on delete cascade,
  type                media_type not null,
  position            smallint not null default 0,
  is_cover            boolean not null default false,
  cloudinary_public_id text,
  poster_public_id    text,
  width               integer check (width > 0),
  height              integer check (height > 0),
  alt_text            text,
  video_provider      video_provider,
  video_id            text,
  duration_seconds    integer check (duration_seconds > 0),
  caption             text,
  created_at          timestamptz not null default now(),
  constraint image_shape check (type <> 'image' or
    (cloudinary_public_id is not null and width is not null and height is not null and char_length(coalesce(alt_text, '')) > 0)),
  constraint video_shape check (type <> 'video_embed' or
    (video_provider is not null and video_id is not null and poster_public_id is not null))
);
create unique index media_one_cover on media_assets (portfolio_item_id) where is_cover;
create index media_item_idx on media_assets (portfolio_item_id, position);

create table testimonials (
  id                 uuid primary key default gen_random_uuid(),
  author_name        text not null,
  author_context     text,
  quote              text not null check (char_length(quote) between 20 and 600),
  booking_id         uuid references bookings(id) on delete set null,
  consent_to_publish boolean not null default false,
  status             publish_status not null default 'draft',
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint testimonial_consent check (status <> 'published' or consent_to_publish)
);
create trigger testimonials_updated before update on testimonials for each row execute function set_updated_at();

create table faqs (
  id           uuid primary key default gen_random_uuid(),
  question     text not null,
  answer       text not null,
  sort_order   integer not null default 0,
  is_published boolean not null default true
);

create table enquiries (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 2 and 120),
  email           citext not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone           text check (phone ~ '^\+?[0-9 ]{9,16}$'),
  message         text not null check (char_length(message) between 10 and 3000),
  status          enquiry_status not null default 'new',
  privacy_version text not null,
  consented_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index enquiries_inbox_idx on enquiries (status, created_at desc);

create table legal_documents (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null check (slug in ('terms','privacy','booking-policy')),
  version            text not null,
  title              text not null,
  body_md            text not null,
  effective_at       timestamptz not null,
  summary_of_changes text,
  created_at         timestamptz not null default now(),
  unique (slug, version)
);
create view current_legal_documents as
  select distinct on (slug) * from legal_documents
  where effective_at <= now() order by slug, effective_at desc;

create table site_settings (
  id                  smallint primary key default 1 check (id = 1),
  business_name       text not null default 'Hephzibah Media',
  contact_email       citext not null,
  whatsapp_e164       text not null check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  phone_e164          text,
  address_text        text,
  social              jsonb not null default '{}',
  min_lead_days       smallint not null default 3 check (min_lead_days >= 0),
  max_advance_days    smallint not null default 540,
  quote_validity_days smallint not null default 7 check (quote_validity_days > 0),
  budget_bands        jsonb not null default '[]',
  updated_at          timestamptz not null default now()
);
create trigger site_settings_updated before update on site_settings for each row execute function set_updated_at();

-- ============ 0006 outbox ============
create table email_outbox (
  id              uuid primary key default gen_random_uuid(),
  dedupe_key      text not null unique,
  to_email        citext not null,
  template        text not null,
  payload         jsonb not null,
  status          outbox_status not null default 'pending',
  attempts        smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error      text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index email_outbox_due_idx on email_outbox (next_attempt_at) where status in ('pending','failed');

-- ============ 0007 transactional entry points (service role only) ============
create function create_booking_request(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ref text;
begin
  insert into bookings (reference, idempotency_key, access_token_hash, kind, service_id, package_id, occasion_id,
    occasion_other, client_name, client_email, client_phone, preferred_contact, event_date, time_of_day,
    venue_text, venue_city, guest_count, deadline, brief, budget_band, reference_links, source,
    privacy_version, terms_version)
  values (p->>'reference', p->>'idempotency_key', p->>'access_token_hash', (p->>'kind')::service_kind,
    (p->>'service_id')::uuid, nullif(p->>'package_id','')::uuid, nullif(p->>'occasion_id','')::uuid,
    nullif(p->>'occasion_other',''), p->>'client_name', (p->>'client_email')::citext, p->>'client_phone',
    coalesce(nullif(p->>'preferred_contact','')::contact_method, 'whatsapp'),
    nullif(p->>'event_date','')::date, nullif(p->>'time_of_day','')::time_of_day,
    nullif(p->>'venue_text',''), nullif(p->>'venue_city',''), nullif(p->>'guest_count','')::integer,
    nullif(p->>'deadline','')::date, p->>'brief', nullif(p->>'budget_band',''),
    array(select jsonb_array_elements_text(coalesce(p->'reference_links', '[]'::jsonb))),
    nullif(p->>'source',''), p->>'privacy_version', p->>'terms_version')
  on conflict (idempotency_key) do nothing
  returning id, reference into v_id, v_ref;

  if v_id is null then   -- replay of the same submission: return the original reference
    select reference into v_ref from bookings where idempotency_key = p->>'idempotency_key';
    return v_ref;
  end if;

  insert into booking_events (booking_id, actor_type, event_type, to_status, visible_to_client)
    values (v_id, 'client', 'request_submitted', 'new', true);
  insert into email_outbox (dedupe_key, to_email, template, payload) values
    ('booking-received:' || v_id, (p->>'client_email')::citext, 'booking_received', jsonb_build_object('booking_id', v_id)),
    ('admin-new-request:' || v_id, (select contact_email from site_settings where id = 1), 'admin_new_request', jsonb_build_object('booking_id', v_id));
  return v_ref;
end $$;

create function accept_quote(p_reference text, p_token_hash text, p_quote_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b bookings%rowtype;
begin
  select * into b from bookings where reference = p_reference and access_token_hash = p_token_hash for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if b.status <> 'quoted' then raise exception 'invalid_state' using errcode = 'P0001'; end if;
  update quotes set status = 'accepted', accepted_at = now()
    where id = p_quote_id and booking_id = b.id and status = 'sent' and (valid_until is null or valid_until > now());
  if not found then raise exception 'quote_unavailable' using errcode = 'P0001'; end if;
  update bookings set status = 'accepted', accepted_quote_id = p_quote_id where id = b.id;
  insert into booking_events (booking_id, actor_type, event_type, from_status, to_status, visible_to_client)
    values (b.id, 'client', 'quote_accepted', 'quoted', 'accepted', true);
  insert into email_outbox (dedupe_key, to_email, template, payload) values
    ('admin-quote-accepted:' || p_quote_id, (select contact_email from site_settings where id = 1), 'admin_quote_accepted', jsonb_build_object('booking_id', b.id));
end $$;

revoke execute on function create_booking_request(jsonb) from public, anon, authenticated;
revoke execute on function accept_quote(text, text, uuid) from public, anon, authenticated;
grant  execute on function create_booking_request(jsonb) to service_role;
grant  execute on function accept_quote(text, text, uuid) to service_role;

-- Public availability: dates only, never details. Runs with owner rights on purpose.
create view public_unavailable_dates with (security_invoker = false) as
  select d::date as day
    from blocked_dates b, generate_series(lower(b.during), upper(b.during) - 1, interval '1 day') d
   where d::date >= current_date
  union
  select (starts_at at time zone 'Africa/Accra')::date
    from bookings
   where status = 'confirmed' and kind <> 'design' and starts_at is not null
     and (starts_at at time zone 'Africa/Accra')::date >= current_date;

-- ============ 0008 row level security ============
do $$ declare t text; begin
  foreach t in array array['admin_users','occasions','services','packages','bookings','quotes','quote_items','payments',
    'booking_events','blocked_dates','portfolio_items','media_assets','testimonials','faqs','enquiries',
    'legal_documents','site_settings','email_outbox'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- public reads (published or active rows only)
create policy occasions_public     on occasions       for select to anon, authenticated using (is_active);
create policy services_public      on services        for select to anon, authenticated using (is_active);
create policy packages_public      on packages        for select to anon, authenticated using (is_active);
create policy portfolio_public     on portfolio_items for select to anon, authenticated using (status = 'published');
create policy media_public         on media_assets    for select to anon, authenticated
  using (exists (select 1 from portfolio_items p where p.id = portfolio_item_id and p.status = 'published'));
create policy testimonials_public  on testimonials   for select to anon, authenticated using (status = 'published');
create policy faqs_public          on faqs            for select to anon, authenticated using (is_published);
create policy legal_public         on legal_documents for select to anon, authenticated using (effective_at <= now());
create policy settings_public      on site_settings   for select to anon, authenticated using (true);
grant select on public_unavailable_dates, current_legal_documents to anon, authenticated;

-- admin writes, scoped
do $$ declare t text; begin
  foreach t in array array['occasions','services','packages','portfolio_items','media_assets','testimonials','faqs'] loop
    execute format('create policy %I on %I for all to authenticated using (has_scope(''content'')) with check (has_scope(''content''))', t || '_admin', t);
  end loop;
  foreach t in array array['bookings','quotes','quote_items','payments','booking_events','blocked_dates','enquiries'] loop
    execute format('create policy %I on %I for all to authenticated using (has_scope(''bookings'')) with check (has_scope(''bookings''))', t || '_admin', t);
  end loop;
end $$;
create policy settings_admin on site_settings   for update to authenticated using (has_scope('settings')) with check (has_scope('settings'));
create policy legal_admin    on legal_documents for all    to authenticated using (has_scope('settings')) with check (has_scope('settings'));
create policy admin_self     on admin_users     for select to authenticated using (id = auth.uid());
create policy admin_team     on admin_users     for all    to authenticated using (has_scope('team')) with check (has_scope('team'));
-- email_outbox and idempotent RPCs: no policy = service role only.

-- ============ 0009 retention ============
create function anonymise_old_bookings(p_months integer default 24) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update bookings set client_name = 'Anonymised', client_email = ('anonymised+' || id || '@invalid.example')::citext,
         client_phone = '+000000000', brief = '[removed by retention policy]', venue_text = null,
         reference_links = '{}', access_token_hash = 'revoked', idempotency_key = null
   where status in ('completed','declined','cancelled','expired')
     and coalesce(event_date, deadline, created_at::date) < (current_date - make_interval(months => p_months))
     and client_name <> 'Anonymised';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function anonymise_old_bookings(integer) from public, anon, authenticated;
grant  execute on function anonymise_old_bookings(integer) to service_role;
