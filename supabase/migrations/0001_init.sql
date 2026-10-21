-- ═══════════════════════════════════════════════════════════════════════════
--  PAPER CRICKET · কাগজের ক্রিকেট
--  Migration 0001 — schema, RLS, and the authoritative game RPCs.
--
--  Design notes
--  ────────────
--  • Clients NEVER write game tables directly. Every mutation is an RPC that
--    verifies auth.uid(), the room membership, the current phase and the turn.
--  • The secret board rotation lives in `spins`, which has RLS enabled, no
--    policies, and no table privileges for anon/authenticated. It can only be
--    read inside SECURITY DEFINER functions.
--  • `rooms` carries only disposable spin metadata (timing + animation seed),
--    never the final rotation. The rotation is exposed only in the resolved
--    ball row, after the ball has been scored.
--  • Batting order is squad position. There is no strike rotation under these
--    house rules: the next squad member arrives only when a wicket falls.
--  • All rows cascade from `rooms`; rooms are hard-deleted on the last explicit
--    leave, on expiry, or by the 30-minute pg_cron safety net.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[2-9A-HJ-NP-Z]{6}$'),
  host_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'live', 'finished', 'abandoned')),
  phase text not null default 'lobby' check (phase in ('lobby', 'ready', 'spinning', 'aiming', 'reveal', 'finished')),
  overs integer not null default 2 check (overs between 1 and 10),
  wickets integer not null default 2 check (wickets between 1 and 11),
  bat_first text not null default 'toss' check (bat_first in ('host', 'guest', 'toss')),
  super_over boolean not null default true,
  innings_number integer not null default 0 check (innings_number between 0 and 4),
  target integer check (target is null or target >= 1),
  pending_transition text not null default 'none' check (pending_transition in ('none', 'innings', 'super_over', 'match')),
  current_spin_id uuid,
  spin_started_at timestamptz,
  spin_ends_at timestamptz,
  spin_duration_ms integer,
  spin_seed text,
  aim_deadline timestamptz,
  last_ball_id uuid,
  batter_ready_at timestamptz,
  winner_user_id uuid references auth.users (id) on delete set null,
  abandoned_by uuid references auth.users (id) on delete set null,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot integer not null check (slot in (1, 2)),
  name text not null check (char_length(name) between 1 and 24),
  team_name text not null check (char_length(team_name) between 1 and 32),
  is_ready boolean not null default false,
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (room_id, user_id),
  unique (room_id, slot)
);

create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  player_id uuid not null references public.room_players (id) on delete cascade,
  position integer not null check (position between 0 and 10),
  name text not null check (char_length(name) between 1 and 24),
  unique (player_id, position)
);

create table if not exists public.innings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  number integer not null check (number between 1 and 4),
  batting_user_id uuid not null references auth.users (id) on delete cascade,
  bowling_user_id uuid not null references auth.users (id) on delete cascade,
  runs integer not null default 0 check (runs >= 0),
  wickets integer not null default 0 check (wickets >= 0),
  legal_balls integer not null default 0 check (legal_balls >= 0),
  extras integer not null default 0 check (extras >= 0),
  next_is_free_hit boolean not null default false,
  status text not null default 'live' check (status in ('live', 'complete')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (room_id, number)
);

create table if not exists public.balls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  innings_id uuid not null references public.innings (id) on delete cascade,
  ball_seq integer not null check (ball_seq >= 1),
  batter_index integer not null check (batter_index between 0 and 10),
  batter_name text not null,
  outcome text not null check (outcome in ('1', '2', '3', '4', '6', 'N', 'W', 'CO', 'LBW', 'RO', 'BO')),
  segment_index integer not null check (segment_index between 0 and 10),
  runs integer not null default 0 check (runs >= 0),
  extras integer not null default 0 check (extras >= 0),
  is_legal boolean not null,
  is_wicket boolean not null default false,
  is_free_hit boolean not null default false,
  aim_degrees numeric(9, 4) not null,
  board_rotation numeric(12, 8) not null,
  created_at timestamptz not null default now(),
  unique (room_id, ball_seq)
);

-- The vault. RLS enabled, no policies, privileges revoked below.
create table if not exists public.spins (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  innings_id uuid not null references public.innings (id) on delete cascade,
  final_rotation numeric(12, 8) not null,
  duration_ms integer not null check (duration_ms between 1000 and 15000),
  seed text not null,
  aim_deadline timestamptz not null,
  aim_degrees numeric(9, 4),
  was_auto boolean not null default false,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists rooms_code_idx on public.rooms (code);
create index if not exists rooms_last_active_idx on public.rooms (last_active_at);
create index if not exists room_players_room_idx on public.room_players (room_id);
create index if not exists room_players_user_idx on public.room_players (user_id);
create index if not exists squads_player_idx on public.squads (player_id);
create index if not exists innings_room_idx on public.innings (room_id);
create index if not exists balls_room_seq_idx on public.balls (room_id, ball_seq);
create index if not exists balls_innings_seq_idx on public.balls (innings_id, ball_seq);
create index if not exists spins_room_idx on public.spins (room_id);

-- ── Access helpers ──────────────────────────────────────────────────────────

create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1
    from public.room_players p
    where p.room_id = p_room_id
      and p.user_id = auth.uid()
      and p.left_at is null
  );
$$;

create or replace function public.sanitize_label(p_value text, p_max integer)
returns text
language plpgsql
immutable
as $$
declare
  v_value text;
begin
  v_value := btrim(coalesce(p_value, ''));
  if v_value = '' then
    raise exception 'NAME_REQUIRED';
  end if;
  return left(v_value, p_max);
end;
$$;

create or replace function public.sanitize_squad(p_squad text[])
returns text[]
language plpgsql
immutable
as $$
declare
  v_squad text[];
begin
  if p_squad is null or cardinality(p_squad) = 0 or cardinality(p_squad) > 11 then
    raise exception 'SQUAD_INVALID';
  end if;

  select array_agg(
           left(coalesce(nullif(btrim(t.name), ''), 'Player ' || t.ord::text), 24)
           order by t.ord
         )
    into v_squad
    from unnest(p_squad) with ordinality as t(name, ord);

  if v_squad is null or cardinality(v_squad) = 0 then
    raise exception 'SQUAD_INVALID';
  end if;
  return v_squad;
end;
$$;

-- ── Creating and joining ────────────────────────────────────────────────────

create or replace function public.create_room(
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
  v_name text;
  v_team text;
  v_squad text[];
  v_code text;
  v_room_id uuid;
  v_bytes bytea;
  v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_i integer;
  v_attempt integer;
  v_player_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  v_name := public.sanitize_label(p_name, 24);
  v_team := public.sanitize_label(p_team, 32);
  v_squad := public.sanitize_squad(p_squad);

  v_room_id := null;
  for v_attempt in 1..16 loop
    v_bytes := extensions.gen_random_bytes(6);
    v_code := '';
    for v_i in 0..5 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, v_i) % char_length(v_alphabet)) + 1, 1);
    end loop;

    begin
      insert into public.rooms (code, host_user_id)
      values (v_code, v_uid)
      returning id into v_room_id;
      exit;
    exception when unique_violation then
      v_room_id := null;
    end;
  end loop;

  if v_room_id is null then
    raise exception 'ROOM_CODE_COLLISION';
  end if;

  insert into public.room_players (room_id, user_id, slot, name, team_name)
  values (v_room_id, v_uid, 1, v_name, v_team)
  returning id into v_player_id;

  insert into public.squads (room_id, player_id, position, name)
  select v_room_id, v_player_id, t.ord - 1, t.name
  from unnest(v_squad) with ordinality as t(name, ord);

  return jsonb_build_object('roomId', v_room_id, 'code', v_code);
end;
$$;

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

-- ── Full, sanitised snapshot ────────────────────────────────────────────────

create or replace function public.get_room_snapshot(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_players jsonb;
  v_innings jsonb;
  v_balls jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_room
  from public.rooms
  where code = upper(btrim(p_code));

  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.room_players
    where room_id = v_room.id and user_id = v_uid and left_at is null
  ) then
    raise exception 'NOT_MEMBER';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId', p.user_id,
        'slot', p.slot,
        'name', p.name,
        'teamName', p.team_name,
        'isReady', p.is_ready,
        'lastSeenAt', p.last_seen_at,
        'joinedAt', p.joined_at,
        'leftAt', p.left_at,
        'squad', coalesce(s.squad, '[]'::jsonb)
      ) order by p.slot
    ),
    '[]'::jsonb
  )
  into v_players
  from public.room_players p
  left join lateral (
    select jsonb_agg(
             jsonb_build_object('position', sq.position, 'name', sq.name)
             order by sq.position
           ) as squad
    from public.squads sq
    where sq.player_id = p.id
  ) s on true
  where p.room_id = v_room.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'roomId', i.room_id,
        'number', i.number,
        'battingUserId', i.batting_user_id,
        'bowlingUserId', i.bowling_user_id,
        'runs', i.runs,
        'wickets', i.wickets,
        'legalBalls', i.legal_balls,
        'extras', i.extras,
        'nextIsFreeHit', i.next_is_free_hit,
        'status', i.status,
        'createdAt', i.created_at,
        'completedAt', i.completed_at
      ) order by i.number
    ),
    '[]'::jsonb
  )
  into v_innings
  from public.innings i
  where i.room_id = v_room.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'roomId', b.room_id,
        'inningsId', b.innings_id,
        'ballSeq', b.ball_seq,
        'batterIndex', b.batter_index,
        'batterName', b.batter_name,
        'outcome', b.outcome,
        'segmentIndex', b.segment_index,
        'runs', b.runs,
        'extras', b.extras,
        'isLegal', b.is_legal,
        'isWicket', b.is_wicket,
        'isFreeHit', b.is_free_hit,
        'aimDegrees', b.aim_degrees,
        'boardRotation', b.board_rotation,
        'createdAt', b.created_at
      ) order by b.ball_seq
    ),
    '[]'::jsonb
  )
  into v_balls
  from public.balls b
  where b.room_id = v_room.id;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id,
      'code', v_room.code,
      'hostUserId', v_room.host_user_id,
      'status', v_room.status,
      'phase', v_room.phase,
      'overs', v_room.overs,
      'wickets', v_room.wickets,
      'batFirst', v_room.bat_first,
      'superOver', v_room.super_over,
      'inningsNumber', v_room.innings_number,
      'target', v_room.target,
      'pendingTransition', v_room.pending_transition,
      'currentSpinId', v_room.current_spin_id,
      'spinStartedAt', v_room.spin_started_at,
      'spinEndsAt', v_room.spin_ends_at,
      'spinDurationMs', v_room.spin_duration_ms,
      'spinSeed', v_room.spin_seed,
      'aimDeadline', v_room.aim_deadline,
      'lastBallId', v_room.last_ball_id,
      'batterReadyAt', v_room.batter_ready_at,
      'winnerUserId', v_room.winner_user_id,
      'abandonedBy', v_room.abandoned_by,
      'lastActiveAt', v_room.last_active_at,
      'createdAt', v_room.created_at,
      'startedAt', v_room.started_at,
      'finishedAt', v_room.finished_at
    ),
    'players', v_players,
    'innings', v_innings,
    'balls', v_balls,
    'serverNow', now()
  );
end;
$$;

-- ── Lobby actions ───────────────────────────────────────────────────────────

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

create or replace function public.set_ready(p_room_id uuid, p_ready boolean)
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
  if v_room.status <> 'lobby' then raise exception 'PROFILE_LOCKED'; end if;

  update public.room_players
  set is_ready = coalesce(p_ready, false), last_seen_at = now()
  where room_id = p_room_id and user_id = v_uid and left_at is null;

  if not found then raise exception 'NOT_MEMBER'; end if;
  update public.rooms set last_active_at = now() where id = p_room_id;
end;
$$;

create or replace function public.start_match(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_players public.room_players%rowtype[];
  v_host public.room_players%rowtype;
  v_guest public.room_players%rowtype;
  v_batting uuid;
  v_bowling uuid;
  v_first_batter uuid;
  v_min_squad integer;
  v_bytes bytea;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'NOT_HOST'; end if;
  if v_room.status <> 'lobby' then raise exception 'WRONG_PHASE'; end if;

  select array_agg(p order by p.slot) into v_players
  from public.room_players p
  where p.room_id = p_room_id and p.left_at is null;

  if coalesce(cardinality(v_players), 0) <> 2 then raise exception 'NOT_ENOUGH_PLAYERS'; end if;
  if exists (select 1 from unnest(v_players) p where not p.is_ready) then
    raise exception 'NOT_READY';
  end if;

  select * into v_host from public.room_players where room_id = p_room_id and user_id = v_room.host_user_id and left_at is null;
  if not found then raise exception 'NOT_ENOUGH_PLAYERS'; end if;
  select * into v_guest from public.room_players where room_id = p_room_id and user_id <> v_room.host_user_id and left_at is null;
  if not found then raise exception 'NOT_ENOUGH_PLAYERS'; end if;

  select min(cnt) into v_min_squad
  from (
    select count(*)::integer as cnt
    from public.squads s
    join public.room_players rp on rp.id = s.player_id
    where rp.room_id = p_room_id and rp.left_at is null
    group by rp.id
  ) counts;

  if v_min_squad is null or v_room.wickets > v_min_squad then
    raise exception 'SQUAD_INVALID';
  end if;

  if v_room.bat_first = 'host' then
    v_first_batter := v_host.user_id;
  elsif v_room.bat_first = 'guest' then
    v_first_batter := v_guest.user_id;
  else
    v_bytes := extensions.gen_random_bytes(1);
    if get_byte(v_bytes, 0) >= 128 then
      v_first_batter := v_host.user_id;
    else
      v_first_batter := v_guest.user_id;
    end if;
  end if;

  v_batting := v_first_batter;
  v_bowling := case when v_first_batter = v_host.user_id then v_guest.user_id else v_host.user_id end;

  update public.rooms
  set status = 'live',
      phase = 'ready',
      innings_number = 1,
      target = null,
      pending_transition = 'none',
      started_at = now(),
      last_active_at = now(),
      batter_ready_at = null
  where id = p_room_id;

  insert into public.innings (room_id, number, batting_user_id, bowling_user_id)
  values (p_room_id, 1, v_batting, v_bowling);
end;
$$;

-- ── One ball ────────────────────────────────────────────────────────────────

create or replace function public.batter_ready(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_innings public.innings%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'live' then raise exception 'WRONG_PHASE'; end if;

  select * into v_innings from public.innings
  where room_id = p_room_id and status = 'live'
  order by number desc limit 1;
  if not found then raise exception 'WRONG_PHASE'; end if;
  if v_innings.batting_user_id <> v_uid then raise exception 'OUT_OF_TURN'; end if;
  if v_room.phase <> 'ready' then raise exception 'WRONG_PHASE'; end if;

  update public.rooms
  set batter_ready_at = now(), last_active_at = now()
  where id = p_room_id;
end;
$$;

create or replace function public.start_spin(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_innings public.innings%rowtype;
  v_bytes bytea;
  v_rotation numeric;
  v_duration integer;
  v_seed text;
  v_spin_id uuid;
  v_started timestamptz;
  v_ends timestamptz;
  v_deadline timestamptz;
  v_value bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'live' then raise exception 'WRONG_PHASE'; end if;
  if v_room.phase <> 'ready' then raise exception 'WRONG_PHASE'; end if;
  if v_room.current_spin_id is not null then raise exception 'ALREADY_SPUN'; end if;
  if v_room.batter_ready_at is null then raise exception 'NOT_READY'; end if;

  select * into v_innings from public.innings
  where room_id = p_room_id and status = 'live'
  order by number desc limit 1;
  if not found then raise exception 'WRONG_PHASE'; end if;
  if v_innings.bowling_user_id <> v_uid then raise exception 'OUT_OF_TURN'; end if;

  v_bytes := extensions.gen_random_bytes(8);

  -- Cryptographic rotation, independent from the public animation seed.
  v_value := (get_byte(v_bytes, 0)::bigint * 16777216)
           + (get_byte(v_bytes, 1)::bigint * 65536)
           + (get_byte(v_bytes, 2)::bigint * 256)
           + get_byte(v_bytes, 3)::bigint;
  v_rotation := (v_value::numeric / 4294967296::numeric) * 360::numeric;

  v_duration := 2200 + ((get_byte(v_bytes, 4) * 257 + get_byte(v_bytes, 5)) % 2601);
  v_seed := encode(extensions.gen_random_bytes(8), 'hex');
  v_spin_id := gen_random_uuid();
  v_started := now();
  v_ends := v_started + (v_duration::text || ' milliseconds')::interval;
  v_deadline := v_ends + interval '10 seconds';

  insert into public.spins (id, room_id, innings_id, final_rotation, duration_ms, seed, aim_deadline)
  values (v_spin_id, p_room_id, v_innings.id, v_rotation, v_duration, v_seed, v_deadline);

  update public.rooms
  set phase = 'spinning',
      current_spin_id = v_spin_id,
      spin_started_at = v_started,
      spin_ends_at = v_ends,
      spin_duration_ms = v_duration,
      spin_seed = v_seed,
      aim_deadline = v_deadline,
      last_active_at = now()
  where id = p_room_id;

  return jsonb_build_object(
    'id', v_spin_id,
    'durationMs', v_duration,
    'seed', v_seed,
    'startedAt', v_started,
    'endsAt', v_ends,
    'aimDeadline', v_deadline
  );
end;
$$;

create or replace function public.submit_aim(
  p_room_id uuid,
  p_aim_degrees numeric,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_inn public.innings%rowtype;
  v_spin public.spins%rowtype;
  v_now timestamptz := now();
  v_late boolean;
  v_aim numeric;
  v_bytes bytea;
  v_value bigint;
  v_index integer;
  v_outcome text;
  -- BOARD_SEGMENTS_TS_SYNC — keep this array in the exact same order as
  -- src/config/gameConfig.ts. The Vitest suite asserts this line.
  v_segments constant text[] := array['1','2','3','4','6','N','W','CO','LBW','RO','BO'];
  v_count integer;
  v_seg_angle numeric;
  v_local numeric;
  v_bat_runs integer;
  v_extras integer;
  v_is_legal boolean;
  v_is_wicket boolean;
  v_free_hit boolean;
  v_new_runs integer;
  v_new_wickets integer;
  v_new_legal integer;
  v_new_extras integer;
  v_next_free_hit boolean;
  v_ball_id uuid;
  v_seq integer;
  v_batter_name text;
  v_effective_overs integer;
  v_end_reason text := null;
  v_pending text := 'none';
  v_target integer;
  v_score_first integer;
  v_ball jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'live' or v_room.phase <> 'spinning' or v_room.current_spin_id is null then
    raise exception 'WRONG_PHASE';
  end if;
  if not exists (
    select 1 from public.room_players
    where room_id = p_room_id and user_id = v_uid and left_at is null
  ) then
    raise exception 'NOT_MEMBER';
  end if;

  v_count := array_length(v_segments, 1);

  select * into v_spin from public.spins where id = v_room.current_spin_id for update;
  if not found then raise exception 'WRONG_PHASE'; end if;
  if v_spin.resolved then raise exception 'STALE_BALL'; end if;

  select * into v_inn from public.innings where id = v_spin.innings_id for update;
  if not found or v_inn.status <> 'live' then raise exception 'WRONG_PHASE'; end if;

  if v_now < v_room.spin_ends_at then raise exception 'SPIN_NOT_FINISHED'; end if;

  v_late := v_now > v_spin.aim_deadline;
  if v_late then
    if p_force then
      -- Every player may rescue a stalled ball after the deadline.
      null;
    elsif v_inn.batting_user_id <> v_uid then
      raise exception 'OUT_OF_TURN';
    end if;
  else
    if v_inn.batting_user_id <> v_uid then raise exception 'OUT_OF_TURN'; end if;
    if p_force then raise exception 'AIM_CLOSED'; end if;
  end if;

  if v_late or p_aim_degrees is null or p_aim_degrees::text = 'NaN' then
    v_bytes := extensions.gen_random_bytes(4);
    v_value := (get_byte(v_bytes, 0)::bigint * 16777216)
             + (get_byte(v_bytes, 1)::bigint * 65536)
             + (get_byte(v_bytes, 2)::bigint * 256)
             + get_byte(v_bytes, 3)::bigint;
    v_aim := (v_value::numeric / 4294967296::numeric) * 360::numeric;
  else
    if p_aim_degrees < -100000 or p_aim_degrees > 100000 then raise exception 'INVALID_ANGLE'; end if;
    v_aim := mod(p_aim_degrees, 360);
    if v_aim < 0 then v_aim := v_aim + 360; end if;
  end if;

  v_seg_angle := 360.0 / v_count;
  v_local := mod(v_aim - v_spin.final_rotation + 360, 360);
  v_index := (floor((v_local + v_seg_angle / 2) / v_seg_angle)::integer % v_count + v_count) % v_count;
  v_outcome := v_segments[v_index + 1];

  v_free_hit := v_inn.next_is_free_hit;
  v_is_legal := v_outcome not in ('N', 'W');
  v_is_wicket := v_outcome in ('CO', 'LBW', 'RO', 'BO') and not v_free_hit;
  v_bat_runs := case v_outcome
    when '1' then 1 when '2' then 2 when '3' then 3 when '4' then 4 when '6' then 6 else 0 end;
  v_extras := case when v_outcome in ('N', 'W') then 1 else 0 end;
  v_new_runs := v_inn.runs + v_bat_runs + v_extras;
  v_new_wickets := v_inn.wickets + case when v_is_wicket then 1 else 0 end;
  v_new_legal := v_inn.legal_balls + case when v_is_legal then 1 else 0 end;
  v_new_extras := v_inn.extras + v_extras;
  v_next_free_hit := case
    when v_outcome = 'N' then true
    when not v_is_legal then v_inn.next_is_free_hit
    else false
  end;

  select sq.name into v_batter_name
  from public.squads sq
  join public.room_players rp on rp.id = sq.player_id
  where rp.room_id = p_room_id
    and rp.user_id = v_inn.batting_user_id
    and sq.position = v_inn.wickets
  limit 1;

  if v_batter_name is null then
    v_batter_name := 'Batter';
  end if;

  select coalesce(max(ball_seq), 0) + 1 into v_seq
  from public.balls where room_id = p_room_id;

  insert into public.balls (
    room_id, innings_id, ball_seq, batter_index, batter_name, outcome,
    segment_index, runs, extras, is_legal, is_wicket, is_free_hit,
    aim_degrees, board_rotation
  ) values (
    p_room_id, v_inn.id, v_seq, v_inn.wickets, v_batter_name, v_outcome,
    v_index, v_bat_runs, v_extras, v_is_legal, v_is_wicket, v_free_hit,
    round(v_aim, 4), v_spin.final_rotation
  ) returning id into v_ball_id;

  update public.innings
  set runs = v_new_runs,
      wickets = v_new_wickets,
      legal_balls = v_new_legal,
      extras = v_new_extras,
      next_is_free_hit = v_next_free_hit
  where id = v_inn.id;

  v_effective_overs := case when v_inn.number >= 3 then 1 else v_room.overs end;
  v_target := v_room.target;

  if v_inn.number in (2, 4) and v_target is not null and v_new_runs >= v_target then
    v_end_reason := 'target';
  elsif v_new_wickets >= v_room.wickets then
    v_end_reason := 'wickets';
  elsif v_new_legal >= v_effective_overs * 6 then
    v_end_reason := 'overs';
  end if;

  if v_end_reason is not null then
    update public.innings
    set status = 'complete', completed_at = now()
    where id = v_inn.id;

    if v_inn.number = 1 then
      v_pending := 'innings';
    elsif v_inn.number = 2 then
      select runs into v_score_first from public.innings
      where room_id = p_room_id and number = 1;

      if v_new_runs = v_score_first and v_room.super_over then
        v_pending := 'super_over';
      else
        v_pending := 'match';
      end if;
    elsif v_inn.number = 3 then
      v_pending := 'innings';
    else
      v_pending := 'match';
    end if;
  end if;

  update public.spins
  set aim_degrees = round(v_aim, 4),
      was_auto = v_late,
      resolved = true,
      resolved_at = now()
  where id = v_spin.id;

  update public.rooms
  set phase = 'reveal',
      current_spin_id = null,
      spin_started_at = null,
      spin_ends_at = null,
      spin_duration_ms = null,
      spin_seed = null,
      aim_deadline = null,
      batter_ready_at = null,
      last_ball_id = v_ball_id,
      pending_transition = v_pending,
      last_active_at = now()
  where id = p_room_id;

  select jsonb_build_object(
    'id', b.id,
    'roomId', b.room_id,
    'inningsId', b.innings_id,
    'ballSeq', b.ball_seq,
    'batterIndex', b.batter_index,
    'batterName', b.batter_name,
    'outcome', b.outcome,
    'segmentIndex', b.segment_index,
    'runs', b.runs,
    'extras', b.extras,
    'isLegal', b.is_legal,
    'isWicket', b.is_wicket,
    'isFreeHit', b.is_free_hit,
    'aimDegrees', b.aim_degrees,
    'boardRotation', b.board_rotation,
    'createdAt', b.created_at
  ) into v_ball
  from public.balls b where b.id = v_ball_id;

  return jsonb_build_object('ballId', v_ball_id, 'ball', v_ball, 'endReason', v_end_reason, 'pending', v_pending);
end;
$$;

create or replace function public.advance_ball(
  p_room_id uuid,
  p_last_ball_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_inn public.innings%rowtype;
  v_prev public.innings%rowtype;
  v_first public.innings%rowtype;
  v_second public.innings%rowtype;
  v_next_batting uuid;
  v_next_bowling uuid;
  v_winner uuid := null;
  v_transition text;
  v_target integer;
  v_new_overs integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not exists (
    select 1 from public.room_players
    where room_id = p_room_id and user_id = v_uid and left_at is null
  ) then
    raise exception 'NOT_MEMBER';
  end if;

  -- Both clients auto-advance; the second call is a harmless no-op.
  if v_room.phase <> 'reveal' then
    return jsonb_build_object('advanced', false);
  end if;
  if v_room.last_ball_id is distinct from p_last_ball_id then
    raise exception 'STALE_BALL';
  end if;

  v_transition := v_room.pending_transition;

  if v_transition = 'none' then
    update public.rooms
    set phase = 'ready', batter_ready_at = null, last_active_at = now()
    where id = p_room_id;
    return jsonb_build_object('advanced', true, 'transition', 'none');
  end if;

  select * into v_prev from public.innings
  where room_id = p_room_id and status in ('live', 'complete')
  order by number desc limit 1;
  if not found then raise exception 'WRONG_PHASE'; end if;

  if v_transition = 'innings' then
    v_new_overs := case when v_prev.number >= 3 then 1 else v_room.overs end;
    if v_prev.number not in (1, 3) then raise exception 'WRONG_PHASE'; end if;

    v_target := v_prev.runs + 1;
    v_next_batting := v_prev.bowling_user_id;
    v_next_bowling := v_prev.batting_user_id;

    insert into public.innings (room_id, number, batting_user_id, bowling_user_id)
    values (p_room_id, v_prev.number + 1, v_next_batting, v_next_bowling);

    update public.rooms
    set phase = 'ready',
        innings_number = v_prev.number + 1,
        target = v_target,
        pending_transition = 'none',
        batter_ready_at = null,
        last_ball_id = null,
        last_active_at = now()
    where id = p_room_id;

    return jsonb_build_object('advanced', true, 'transition', 'innings', 'target', v_target, 'overs', v_new_overs);
  end if;

  if v_transition = 'super_over' then
    v_next_batting := v_prev.batting_user_id; -- the side that chased starts the super over
    v_next_bowling := v_prev.bowling_user_id;

    insert into public.innings (room_id, number, batting_user_id, bowling_user_id)
    values (p_room_id, 3, v_next_batting, v_next_bowling);

    update public.rooms
    set phase = 'ready',
        innings_number = 3,
        target = null,
        pending_transition = 'none',
        batter_ready_at = null,
        last_ball_id = null,
        last_active_at = now()
    where id = p_room_id;

    return jsonb_build_object('advanced', true, 'transition', 'super_over');
  end if;

  -- v_transition = 'match'
  if v_prev.number >= 4 then
    select * into v_first from public.innings where room_id = p_room_id and number = 3;
    select * into v_second from public.innings where room_id = p_room_id and number = 4;
  else
    select * into v_first from public.innings where room_id = p_room_id and number = 1;
    select * into v_second from public.innings where room_id = p_room_id and number = 2;
  end if;

  if v_first.id is not null and v_second.id is not null then
    if v_second.runs > v_first.runs then
      v_winner := v_second.batting_user_id;
    elsif v_first.runs > v_second.runs then
      v_winner := v_first.batting_user_id;
    else
      v_winner := null;
    end if;
  end if;

  update public.rooms
  set status = 'finished',
      phase = 'finished',
      winner_user_id = v_winner,
      last_ball_id = null,
      pending_transition = 'none',
      finished_at = now(),
      last_active_at = now()
  where id = p_room_id;

  return jsonb_build_object('advanced', true, 'transition', 'match', 'winnerUserId', v_winner);
end;
$$;

-- ── Presence, leaving, forfeit, cleanup ─────────────────────────────────────

create or replace function public.heartbeat(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.room_players
  set last_seen_at = now()
  where room_id = p_room_id and user_id = v_uid and left_at is null;

  if found then
    update public.rooms set last_active_at = now() where id = p_room_id;
  end if;
end;
$$;

create or replace function public.leave_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_other public.room_players%rowtype;
  v_remaining integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;

  if not found then
    return jsonb_build_object('deleted', true);
  end if;
  if not exists (
    select 1 from public.room_players
    where room_id = p_room_id and user_id = v_uid and left_at is null
  ) then
    return jsonb_build_object('deleted', false);
  end if;

  select * into v_other
  from public.room_players
  where room_id = p_room_id and user_id <> v_uid and left_at is null
  limit 1;

  select count(*) into v_remaining
  from public.room_players
  where room_id = p_room_id and user_id <> v_uid and left_at is null;

  -- In the lobby, a leaver's row is removed so the seat is free again.
  if v_room.status = 'lobby' then
    delete from public.room_players
    where room_id = p_room_id and user_id = v_uid;

    if v_remaining = 0 then
      delete from public.rooms where id = p_room_id;
      return jsonb_build_object('deleted', true);
    end if;

    if v_room.host_user_id = v_uid and v_other.id is not null then
      update public.rooms set host_user_id = v_other.user_id, last_active_at = now() where id = p_room_id;
    else
      update public.rooms set last_active_at = now() where id = p_room_id;
    end if;

    return jsonb_build_object('deleted', false);
  end if;

  update public.room_players
  set left_at = now(), last_seen_at = now()
  where room_id = p_room_id and user_id = v_uid;

  if v_remaining = 0 then
    delete from public.rooms where id = p_room_id;
    return jsonb_build_object('deleted', true);
  end if;

  if v_room.status = 'live' then
    update public.rooms
    set status = 'abandoned',
        phase = 'finished',
        winner_user_id = v_other.user_id,
        abandoned_by = v_uid,
        finished_at = now(),
        current_spin_id = null,
        spin_started_at = null,
        spin_ends_at = null,
        spin_duration_ms = null,
        spin_seed = null,
        aim_deadline = null,
        batter_ready_at = null,
        last_active_at = now()
    where id = p_room_id;
  else
    update public.rooms set last_active_at = now() where id = p_room_id;
  end if;

  return jsonb_build_object('deleted', false);
end;
$$;

create or replace function public.forfeit_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_other public.room_players%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'live' then raise exception 'WRONG_PHASE'; end if;
  if not exists (
    select 1 from public.room_players
    where room_id = p_room_id and user_id = v_uid and left_at is null
  ) then
    raise exception 'NOT_MEMBER';
  end if;

  select * into v_other
  from public.room_players
  where room_id = p_room_id and user_id <> v_uid and left_at is null
  limit 1;

  if not found then
    update public.rooms
    set status = 'abandoned', phase = 'finished', winner_user_id = v_uid,
        abandoned_by = v_uid, finished_at = now(), last_active_at = now()
    where id = p_room_id;
    return;
  end if;

  if v_other.last_seen_at > now() - interval '60 seconds' then
    raise exception 'NO_GRACE_YET';
  end if;

  update public.room_players
  set left_at = now()
  where id = v_other.id;

  update public.rooms
  set status = 'abandoned',
      phase = 'finished',
      winner_user_id = v_uid,
      abandoned_by = v_other.user_id,
      finished_at = now(),
      current_spin_id = null,
      spin_started_at = null,
      spin_ends_at = null,
      spin_duration_ms = null,
      spin_seed = null,
      aim_deadline = null,
      batter_ready_at = null,
      last_active_at = now()
  where id = p_room_id;
end;
$$;

create or replace function public.cleanup_stale_rooms()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from public.rooms
  where last_active_at < now() - interval '30 minutes';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- ── Privileges & row-level security ─────────────────────────────────────────

revoke all on table public.rooms from anon, authenticated;
revoke all on table public.room_players from anon, authenticated;
revoke all on table public.squads from anon, authenticated;
revoke all on table public.innings from anon, authenticated;
revoke all on table public.balls from anon, authenticated;
revoke all on table public.spins from anon, authenticated;

grant select on table public.rooms to authenticated;
grant select on table public.room_players to authenticated;
grant select on table public.squads to authenticated;
grant select on table public.innings to authenticated;
grant select on table public.balls to authenticated;

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.squads enable row level security;
alter table public.innings enable row level security;
alter table public.balls enable row level security;
alter table public.spins enable row level security;

drop policy if exists "members read room" on public.rooms;
create policy "members read room" on public.rooms
  for select to authenticated
  using (public.is_room_member(id));

drop policy if exists "members read players" on public.room_players;
create policy "members read players" on public.room_players
  for select to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "members read squads" on public.squads;
create policy "members read squads" on public.squads
  for select to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "members read innings" on public.innings;
create policy "members read innings" on public.innings
  for select to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "members read balls" on public.balls;
create policy "members read balls" on public.balls
  for select to authenticated
  using (public.is_room_member(room_id));

-- No policies on spins, and no table privileges: only SECURITY DEFINER works.

-- Revoke default PUBLIC execute, then grant the public API to signed-in users.
revoke all on function public.create_room(text, text, text[]) from public;
revoke all on function public.join_room(text, text, text, text[]) from public;
revoke all on function public.peek_room(text) from public;
revoke all on function public.get_room_snapshot(text) from public;
revoke all on function public.update_player_profile(uuid, text, text, text[]) from public;
revoke all on function public.update_room_settings(uuid, integer, integer, text, boolean) from public;
revoke all on function public.set_ready(uuid, boolean) from public;
revoke all on function public.start_match(uuid) from public;
revoke all on function public.batter_ready(uuid) from public;
revoke all on function public.start_spin(uuid) from public;
revoke all on function public.submit_aim(uuid, numeric, boolean) from public;
revoke all on function public.advance_ball(uuid, uuid) from public;
revoke all on function public.heartbeat(uuid) from public;
revoke all on function public.leave_room(uuid) from public;
revoke all on function public.forfeit_room(uuid) from public;
revoke all on function public.cleanup_stale_rooms() from public;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.create_room(text, text, text[]) to authenticated;
grant execute on function public.join_room(text, text, text, text[]) to authenticated;
grant execute on function public.peek_room(text) to authenticated;
grant execute on function public.get_room_snapshot(text) to authenticated;
grant execute on function public.update_player_profile(uuid, text, text, text[]) to authenticated;
grant execute on function public.update_room_settings(uuid, integer, integer, text, boolean) to authenticated;
grant execute on function public.set_ready(uuid, boolean) to authenticated;
grant execute on function public.start_match(uuid) to authenticated;
grant execute on function public.batter_ready(uuid) to authenticated;
grant execute on function public.start_spin(uuid) to authenticated;
grant execute on function public.submit_aim(uuid, numeric, boolean) to authenticated;
grant execute on function public.advance_ball(uuid, uuid) to authenticated;
grant execute on function public.heartbeat(uuid) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
grant execute on function public.forfeit_room(uuid) to authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────

alter table public.rooms replica identity full;
alter table public.room_players replica identity full;
alter table public.innings replica identity full;
alter table public.balls replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    execute 'alter publication supabase_realtime add table public.rooms';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_players'
  ) then
    execute 'alter publication supabase_realtime add table public.room_players';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'innings'
  ) then
    execute 'alter publication supabase_realtime add table public.innings';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'balls'
  ) then
    execute 'alter publication supabase_realtime add table public.balls';
  end if;
end $$;

-- ── 30-minute safety net via pg_cron ────────────────────────────────────────

do $$
begin
  begin
    execute 'create extension if not exists pg_cron';
  exception when others then
    raise notice 'pg_cron could not be enabled automatically: %', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('paper-cricket-cleanup-30m');
    exception when others then
      null;
    end;

    perform cron.schedule(
      'paper-cricket-cleanup-30m',
      '*/10 * * * *',
      $cron$select public.cleanup_stale_rooms();$cron$
    );
  else
    raise notice 'Install pg_cron and schedule public.cleanup_stale_rooms() every 10 minutes.';
  end if;
end $$;

comment on table public.spins is
  'Server-only sealed spin rotations. No client role has access. Read exclusively inside SECURITY DEFINER functions.';
comment on function public.cleanup_stale_rooms() is
  'Hard-deletes rooms untouched for 30 minutes; ON DELETE CASCADE removes all child rows.';
