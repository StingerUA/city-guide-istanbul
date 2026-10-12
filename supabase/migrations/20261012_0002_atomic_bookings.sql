-- Run after 20261012_0001_initial.sql. Serializes inventory checks per venue.
begin;
create or replace function public.cg_book_atomic(
 p_booking jsonb,
 p_user_id uuid,
 p_expected_version integer
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 v_id text := p_booking->>'venueId';
 v_payload jsonb;
 v_version integer;
 v_capacity integer;
 v_kind text;
 v_qty integer;
 v_used integer;
 v_start date := (p_booking->>'date')::date;
 v_end date := (p_booking->>'endDate')::date;
 v_time time := (p_booking->>'time')::time;
 v_booking_id uuid := (p_booking->>'id')::uuid;
 old_user uuid;
 old_payload jsonb;
begin
 if p_user_id is null or v_id is null or v_booking_id is null then
  raise exception 'invalid_input';
 end if;
 -- The advisory lock serializes different booking IDs targeting the same slot.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('city-guide-book:' || v_id, 0));
 select payload,version into v_payload,v_version
 from public.cg_venues where id=v_id and status='published' for update;
 if not found then raise exception 'unavailable'; end if;
 if v_version<>p_expected_version then raise exception 'conflict'; end if;
 select user_id,payload into old_user,old_payload
 from public.cg_bookings where id=v_booking_id;
 if found then
  if old_user<>p_user_id or old_payload->>'venueId'<>v_id or
     old_payload->>'date'<>p_booking->>'date' or
     old_payload->>'endDate'<>p_booking->>'endDate' or
     old_payload->>'time'<>p_booking->>'time' or
     old_payload->>'guests'<>p_booking->>'guests' or
     old_payload->>'payment'<>p_booking->>'payment' or
     old_payload->>'name'<>p_booking->>'name' or
     old_payload->>'phone'<>p_booking->>'phone' or
     old_payload->>'note'<>p_booking->>'note'
  then raise exception 'idempotency_conflict'; end if;
  return jsonb_build_object('id',v_booking_id,'duplicate',true);
 end if;
 v_kind := v_payload->>'bookingType';
 v_capacity := (v_payload->>'capacity')::integer;
 v_qty := case when v_kind in ('rental','stay','appointment') then 1
               else (p_booking->>'guests')::integer end;
 if v_capacity<1 or v_qty<1 or v_qty>v_capacity then raise exception 'fully_booked'; end if;
 if v_kind in ('rental','stay') then
  if v_end<=v_start or v_end>v_start+90 then raise exception 'invalid_date'; end if;
 else
  if v_end<>v_start then raise exception 'invalid_date'; end if;
 end if;
 if v_kind='none' then raise exception 'unavailable'; end if;
 select coalesce(sum(guests),0)::integer into v_used
 from public.cg_bookings
 where venue_id=v_id and status in ('pending','confirmed') and
  (case when v_kind in ('rental','stay')
    then date<v_end and end_date>v_start
    else date=v_start and time=v_time
  end);
 if v_used+v_qty>v_capacity then raise exception 'fully_booked'; end if;
 insert into public.cg_bookings
 (id,user_id,venue_id,date,end_date,time,guests,status,payload,created_at)
 values (v_booking_id,p_user_id,v_id,v_start,v_end,v_time,v_qty,
 'pending',p_booking,pg_catalog.now());
 return jsonb_build_object('id',v_booking_id,'duplicate',false);
end;
$$;
revoke all on function public.cg_book_atomic(jsonb,uuid,integer) from public,anon,authenticated;
grant execute on function public.cg_book_atomic(jsonb,uuid,integer) to service_role;
commit;
