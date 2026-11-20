-- Migration 0004: Security hardening, admin_users auth columns, and strict RLS/trigger enforcement

-- 1. Ensure admin_users stores login email and credential fields with strict column-level isolation
alter table public.admin_users
  add column if not exists email text,
  add column if not exists password_hash text,
  add column if not exists totp_secret text;

create unique index if not exists admin_users_email_lower_idx
  on public.admin_users (lower(email))
  where email is not null;

-- Revoke direct read/write of credential hashes & TOTP secrets from anon and authenticated roles
revoke all on table public.admin_users from anon, authenticated;
grant select (id, email, display_name, scopes, is_active, created_at) on table public.admin_users to authenticated;
grant insert (id, email, display_name, scopes, is_active) on table public.admin_users to authenticated;
grant update (display_name, scopes, is_active) on table public.admin_users to authenticated;
grant all on table public.admin_users to service_role;

-- Restrict admin_self policy so inactive admins cannot read their row
drop policy if exists admin_self on public.admin_users;
create policy admin_self on public.admin_users
  for select to authenticated
  using (id = auth.uid() and is_active);

-- 2. Prevent DELETE on append-only audit & financial tables (payments, booking_events)
drop trigger if exists payments_immutable on public.payments;
create trigger payments_immutable
  before update or delete on public.payments
  for each row execute function forbid_update();

drop trigger if exists booking_events_immutable on public.booking_events;
create trigger booking_events_immutable
  before update or delete on public.booking_events
  for each row execute function forbid_update();

drop policy if exists payments_admin on public.payments;
create policy payments_admin_select on public.payments
  for select to authenticated
  using (has_scope('bookings'));
create policy payments_admin_insert on public.payments
  for insert to authenticated
  with check (has_scope('bookings'));

drop policy if exists booking_events_admin on public.booking_events;
create policy booking_events_admin_select on public.booking_events
  for select to authenticated
  using (has_scope('bookings'));
create policy booking_events_admin_insert on public.booking_events
  for insert to authenticated
  with check (has_scope('bookings'));

-- 3. Restrict site_settings public read policy explicitly to singleton id = 1
drop policy if exists settings_public on public.site_settings;
create policy settings_public on public.site_settings
  for select to anon, authenticated
  using (id = 1);

-- 4. Apply security_invoker = true to current_legal_documents view
create or replace view public.current_legal_documents with (security_invoker = true) as
  select distinct on (slug) *
    from public.legal_documents
   where effective_at <= now()
   order by slug, effective_at desc;
grant select on public.current_legal_documents to anon, authenticated;

-- 5. Scrub gallery delivery PII/secrets alongside client contact fields during 24-month retention
create or replace function public.anonymise_old_bookings(p_months integer default 24) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.bookings
     set client_name = 'Anonymised',
         client_email = ('anonymised+' || id || '@invalid.example')::citext,
         client_phone = '+000000000',
         brief = '[removed by retention policy]',
         venue_text = null,
         reference_links = '{}',
         access_token_hash = 'revoked',
         idempotency_key = null,
         gallery_url = null,
         gallery_pin = null,
         gallery_notes = null,
         gallery_expires_at = null
   where status in ('completed','declined','cancelled','expired')
     and coalesce(event_date, deadline, created_at::date) < (current_date - make_interval(months => p_months))
     and client_name <> 'Anonymised';
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.anonymise_old_bookings(integer) from public, anon, authenticated;
grant execute on function public.anonymise_old_bookings(integer) to service_role;
