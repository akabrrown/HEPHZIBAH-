-- Migration 0003: Dedicated Gallery Download card support for client deliveries
-- Adds gallery_url, gallery_pin, gallery_notes, and gallery_expires_at to bookings table

alter table bookings
  add column if not exists gallery_url text check (gallery_url is null or char_length(gallery_url) <= 1000),
  add column if not exists gallery_pin text check (gallery_pin is null or char_length(gallery_pin) <= 60),
  add column if not exists gallery_notes text check (gallery_notes is null or char_length(gallery_notes) <= 2000),
  add column if not exists gallery_expires_at timestamptz;

comment on column bookings.gallery_url is 'Private client gallery download link (Google Drive, Pixieset, Dropbox, OneDrive, etc.)';
comment on column bookings.gallery_pin is 'Optional client access PIN or password for the gallery download';
comment on column bookings.gallery_notes is 'Optional studio download instructions, print recommendations, or expiry guidance';
comment on column bookings.gallery_expires_at is 'Optional gallery expiration date for time-bounded client access';
