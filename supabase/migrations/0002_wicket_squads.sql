-- ═══════════════════════════════════════════════════════════════════════════
--  PAPER CRICKET · কাগজের ক্রিকেট
--  Migration 0002 — wickets decide the squad size.
--
--  The host chooses overs and wickets. A room with 10 wickets now has exactly
--  10 batters on each side; changing the setting trims or pads both squads on
--  the server. Clients never have to grow a squad themselves.
-- ═══════════════════════════════════════════════════════════════════════════

-- A safe array resizer. It is an implementation detail, so it is not exposed
-- through PostgREST to anon/authenticated clients.
create or replace function public.fit_squad_to_size(p_squad text[], p_size integer)
returns text[]
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select array_agg(
           left(
             coalesce(nullif(btrim(t.name), ''), 'Player ' || g.position::text),
             24
           )
           order by g.position
         )
  from generate_series(1, greatest(1, least(coalesce(p_size, 1), 11))) as g(position)
  left join unnest(p_squad) with ordinality as t(name, position)
    on t.position = g.position;
$$;

revoke all on function public.fit_squad_to_size(text[], integer) from public, anon, authenticated;

-- ── Joining: keep the incoming squad aligned to the room ────────────────────

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

  -- Wickets are the source of truth for batting-order length.
  v_squad := public.fit_squad_to_size(v_squad, v_room.wickets);

  insert into public.room_players (room_id, user_id, slot, name, team_name)
  values (v_room.id, v_uid, v_slot, v_name, v_team)
  returning id into v_player_id;

  insert into public.squads (room_id, player_id, position, name)
  select v_room.id, v_player_id, t.ord - 1, t.name
  from unnest(v_squad) with ordinality as t(name, ord);

  update public.rooms
  set last_active_at = now()
  where id = v_room.id;

  return jsonb_build_object('roomId', v_room.id, 'code', v_room.code);
end;
$$;

-- ── Lobby preview: let the guest create the right number of names ───────────

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
    return jsonb_build_object(
      'exists', false,
      'code', upper(btrim(p_code)),
      'status', 'missing',
      'playerCount', 0,
      'isMember', false,
      'hostTeamName', null,
      'hostName', null,
      'overs', null,
      'wickets', null
    );
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
    'hostName', v_host.name,
    'overs', v_room.overs,
    'wickets', v_room.wickets
  );
end;
$$;

-- ── Profile edits: only names and order change; length follows wickets ──────

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
  v_squad := public.fit_squad_to_size(public.sanitize_squad(p_squad), v_room.wickets);

  update public.room_players
  set name = v_name, team_name = v_team, is_ready = false
  where id = v_player.id;

  delete from public.squads where player_id = v_player.id;
  insert into public.squads (room_id, player_id, position, name)
  select p_room_id, v_player.id, t.ord - 1, t.name
  from unnest(v_squad) with ordinality as t(name, ord);

  update public.rooms set last_active_at = now() where id = p_room_id;
end;
$$;

-- ── Host settings: wickets resize both active squads ────────────────────────

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
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'NOT_HOST'; end if;
  if v_room.status <> 'lobby' then raise exception 'PROFILE_LOCKED'; end if;
  if p_overs is null or p_overs < 1 or p_overs > 10 then raise exception 'INVALID_RULES'; end if;
  if p_wickets is null or p_wickets < 1 or p_wickets > 11 then raise exception 'INVALID_RULES'; end if;
  if p_bat_first not in ('host', 'guest', 'toss') then raise exception 'INVALID_RULES'; end if;

  update public.rooms
  set overs = p_overs,
      wickets = p_wickets,
      bat_first = p_bat_first,
      super_over = coalesce(p_super_over, true),
      last_active_at = now()
  where id = p_room_id;

  -- Trim surplus batters at the back of both batting orders.
  delete from public.squads s
  using public.room_players rp
  where s.player_id = rp.id
    and s.room_id = p_room_id
    and rp.room_id = p_room_id
    and rp.left_at is null
    and s.position >= p_wickets;

  -- Pad short squads with neutral names. Clients can rename them immediately.
  insert into public.squads (room_id, player_id, position, name)
  select p_room_id, rp.id, g.position - 1, 'Player ' || g.position::text
  from public.room_players rp
  cross join generate_series(1, p_wickets) as g(position)
  where rp.room_id = p_room_id
    and rp.left_at is null
    and not exists (
      select 1 from public.squads s
      where s.player_id = rp.id and s.position = g.position - 1
    )
  on conflict (player_id, position) do nothing;

  -- A wicket change changes the team sheets, so ask both players to confirm
  -- again before the host starts the match.
  if v_room.wickets <> p_wickets then
    update public.room_players
    set is_ready = false
    where room_id = p_room_id and left_at is null;
  end if;
end;
$$;
