-- ═══════════════════════════════════════════════════════════════════════════
--  PAPER CRICKET · কাগজের ক্রিকেট
--  Migration 0003 — restore the original 5-player squad behaviour.
--
--  Migration 0002 of the earlier wicket experiment changed join_room,
--  update_player_profile, update_room_settings and peek_room so that the
--  wicket count forced every squad to the same length. The app has since
--  returned to independent 5-player squads, so this migration restores those
--  four functions from 0001 and removes the helper that is no longer used.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.join_room(
  p_code text,
  p_name text,
  p_team text,
  p_squad text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_player public.room_players%rowtype;
  v_name text;
  v_team text;
  v_squad text[];
  v_count integer;
  v_slot integer;
  v_player_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  v_name := public.sanitize_label(p_name, 24);
  v_team := public.sanitize_label(p_team, 32);
  v_squad := public.sanitize_squad(p_squad);

  select * into v_room
  from public.rooms
  where code = upper(btrim(p_code))
  for update;

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;

  -- A refresh or a second membership call is idempotent.
  select * into v_player
  from public.room_players
  where room_id = v_room.id and user_id = v_uid;

  if found then
    if v_player.left_at is null then
      return jsonb_build_object('roomId', v_room.id, 'code', v_room.code);
    end if;
    raise exception 'ROOM_CLOSED';
  end if;

  if v_room.status <> 'lobby' then raise exception 'ROOM_CLOSED'; end if;

  select count(*) into v_count
  from public.room_players
  where room_id = v_room.id and left_at is null;

  if v_count >= 2 then raise exception 'ROOM_FULL'; end if;

  select min(s) into v_slot
  from generate_series(1, 2) as s
  where not exists (
    select 1 from public.room_players
    where room_id = v_room.id and slot = s
  );

  if v_slot is null then raise exception 'ROOM_FULL'; end if;

  insert into public.room_players (room_id, user_id, slot, name, team_name)
  values (v_room.id, v_uid, v_slot, v_name, v_team)
  returning id into v_player_id;

  insert into public.squads (room_id, player_id, position, name)
  select v_room.id, v_player_id, t.ord - 1, t.name
  from unnest(v_squad) with ordinality as t(name, ord);

  -- A shorter incoming squad can never leave the wicket setting impossible.
  select min(cnt) into v_count
  from (
    select count(sq.id)::integer as cnt
    from public.room_players rp
    join public.squads sq on sq.player_id = rp.id
    where rp.room_id = v_room.id and rp.left_at is null
    group by rp.id
  ) counts;

  update public.rooms
  set last_active_at = now(),
      wickets = least(wickets, greatest(1, coalesce(v_count, wickets)))
  where id = v_room.id;

  return jsonb_build_object('roomId', v_room.id, 'code', v_room.code);
end;
$$;

create or replace function public.peek_room(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_count integer;
  v_host public.room_players%rowtype;
begin
  select * into v_room
  from public.rooms
  where code = upper(btrim(p_code));

  if not found then
    return jsonb_build_object('exists', false, 'code', upper(btrim(p_code)), 'status', 'missing', 'playerCount', 0, 'isMember', false, 'hostTeamName', null, 'hostName', null);
  end if;

  select count(*) into v_count
  from public.room_players
  where room_id = v_room.id and left_at is null;

  select * into v_host
  from public.room_players
  where room_id = v_room.id and user_id = v_room.host_user_id
  limit 1;

  return jsonb_build_object(
    'exists', true,
    'code', v_room.code,
    'status', v_room.status,
    'playerCount', v_count,
    'isMember', exists (
      select 1 from public.room_players
      where room_id = v_room.id and user_id = v_uid and left_at is null
    ),
    'hostTeamName', v_host.team_name,
    'hostName', v_host.name
  );
end;
$$;

create or replace function public.update_player_profile(
  p_room_id uuid,
  p_name text,
  p_team text,
  p_squad text[]
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_player public.room_players%rowtype;
  v_name text;
  v_team text;
  v_squad text[];
  v_min integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'lobby' then raise exception 'PROFILE_LOCKED'; end if;

  select * into v_player
  from public.room_players
  where room_id = p_room_id and user_id = v_uid and left_at is null;
  if not found then raise exception 'NOT_MEMBER'; end if;

  v_name := public.sanitize_label(p_name, 24);
  v_team := public.sanitize_label(p_team, 32);
  v_squad := public.sanitize_squad(p_squad);

  update public.room_players
  set name = v_name, team_name = v_team, is_ready = false
  where id = v_player.id;

  delete from public.squads where player_id = v_player.id;
  insert into public.squads (room_id, player_id, position, name)
  select p_room_id, v_player.id, t.ord - 1, t.name
  from unnest(v_squad) with ordinality as t(name, ord);

  select min(cnt) into v_min
  from (
    select count(sq.id)::integer as cnt
    from public.room_players rp
    join public.squads sq on sq.player_id = rp.id
    where rp.room_id = p_room_id and rp.left_at is null
    group by rp.id
  ) counts;

  if v_min is not null and v_room.wickets > v_min then
    update public.rooms set wickets = greatest(1, v_min), last_active_at = now() where id = p_room_id;
  else
    update public.rooms set last_active_at = now() where id = p_room_id;
  end if;
end;
$$;

create or replace function public.update_room_settings(
  p_room_id uuid,
  p_overs integer,
  p_wickets integer,
  p_bat_first text,
  p_super_over boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_min integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'NOT_HOST'; end if;
  if v_room.status <> 'lobby' then raise exception 'PROFILE_LOCKED'; end if;
  if p_overs is null or p_overs < 1 or p_overs > 10 then raise exception 'INVALID_RULES'; end if;
  if p_wickets is null or p_wickets < 1 or p_wickets > 11 then raise exception 'INVALID_RULES'; end if;
  if p_bat_first not in ('host', 'guest', 'toss') then raise exception 'INVALID_RULES'; end if;

  select min(cnt) into v_min
  from (
    select count(sq.id)::integer as cnt
    from public.room_players rp
    join public.squads sq on sq.player_id = rp.id
    where rp.room_id = p_room_id and rp.left_at is null
    group by rp.id
  ) counts;

  if v_min is not null and p_wickets > v_min then
    raise exception 'SQUAD_INVALID';
  end if;

  update public.rooms
  set overs = p_overs,
      wickets = p_wickets,
      bat_first = p_bat_first,
      super_over = coalesce(p_super_over, true),
      last_active_at = now()
  where id = p_room_id;
end;
$$;
-- The old helper is no longer referenced by any function.
drop function if exists public.fit_squad_to_size(text[], integer);

revoke all on function public.join_room(text, text, text, text[]) from public;
revoke all on function public.peek_room(text) from public;
revoke all on function public.update_player_profile(uuid, text, text, text[]) from public;
revoke all on function public.update_room_settings(uuid, integer, integer, text, boolean) from public;

grant execute on function public.join_room(text, text, text, text[]) to authenticated;
grant execute on function public.peek_room(text) to authenticated;
grant execute on function public.update_player_profile(uuid, text, text, text[]) to authenticated;
grant execute on function public.update_room_settings(uuid, integer, integer, text, boolean) to authenticated;
