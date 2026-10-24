-- ═══════════════════════════════════════════════════════════════════════════
--  PAPER CRICKET · কাগজের ক্রিকেট
--  Migration 0003 — delete the whole room as soon as a player leaves.
--
--  Previously, a live game only became "abandoned": the leaving player's row,
--  their squad, the innings and every ball stayed in the database until the
--  cleanup job ran. This replacement makes an explicit leave a hard delete.
--  Foreign keys already cascade from `rooms` to room_players, squads, innings,
--  balls and spins, so deleting the room removes all of that data in one go.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.leave_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    return jsonb_build_object('deleted', true);
  end if;

  -- Only a seated player may tear up the sheet.
  if not exists (
    select 1
    from public.room_players
    where room_id = p_room_id
      and user_id = v_uid
      and left_at is null
  ) then
    return jsonb_build_object('deleted', false);
  end if;

  -- Hard delete: players, squads, innings, balls and spins cascade away.
  delete from public.rooms where id = p_room_id;

  return jsonb_build_object('deleted', true);
end;
$$;

revoke all on function public.leave_room(uuid) from public;
grant execute on function public.leave_room(uuid) to authenticated;
