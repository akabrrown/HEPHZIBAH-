-- Migration 0002: Retention cleanup for enquiries (12 months) and sent outbox messages (90 days)
-- Per Backend Schema section 7 and section 9

create or replace function cleanup_old_enquiries_and_outbox(
  p_enquiry_months integer default 12,
  p_outbox_days integer default 90
) returns jsonb
language plpgsql
security definer
set search_path = public as $$
declare
  v_enquiries_deleted integer := 0;
  v_outbox_deleted integer := 0;
begin
  delete from enquiries
   where created_at < (now() - make_interval(months => p_enquiry_months));
  get diagnostics v_enquiries_deleted = row_count;

  delete from email_outbox
   where status = 'sent'
     and sent_at is not null
     and sent_at < (now() - make_interval(days => p_outbox_days));
  get diagnostics v_outbox_deleted = row_count;

  return jsonb_build_object(
    'enquiries_deleted', v_enquiries_deleted,
    'outbox_deleted', v_outbox_deleted
  );
end $$;

revoke execute on function cleanup_old_enquiries_and_outbox(integer, integer) from public, anon, authenticated;
grant execute on function cleanup_old_enquiries_and_outbox(integer, integer) to service_role;
