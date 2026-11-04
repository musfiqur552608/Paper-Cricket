-- ---------------------------------------------------------------------------
-- Migration 0004 - the bowler controls the spin.
--
-- The bowler now sees the board and drags it around for up to 15 seconds.
-- When they stop (or the timer runs out), their rotation is sent to
-- `stop_spin` and becomes the authoritative resting angle. The batter still
-- sees the opaque sheet and never receives the final rotation before reveal.
--
-- `stop_spin` is deliberately idempotent: a duplicate tap, a retry after a
-- flaky connection, or the 15-second auto-stop can all call it safely.
-- ---------------------------------------------------------------------------

alter table public.spins
  add column if not exists stopped_at timestamptz;

-- ---------------------------------------------------------------------------
-- Start a manual spin. The server stores a random fallback rotation for the
-- rare case where the bowler disconnects and never calls `stop_spin`; a
-- present bowler can overwrite it right up until the ball is submitted.
-- ---------------------------------------------------------------------------

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
  v_duration integer := 15000;
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

  -- Random fallback used only if the bowler abandons the turn. It is never
  -- exposed while the board is live, and it is overwritten by `stop_spin`.
  v_value := (get_byte(v_bytes, 0)::bigint * 16777216)
           + (get_byte(v_bytes, 1)::bigint * 65536)
           + (get_byte(v_bytes, 2)::bigint * 256)
           + get_byte(v_bytes, 3)::bigint;
  v_rotation := (v_value::numeric / 4294967296::numeric) * 360::numeric;

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

-- ---------------------------------------------------------------------------
-- Stop the board at the bowler's current rotation and open the batter's aim
-- window. `submit_aim` still runs the authoritative scoring calculation using
-- this final rotation.
-- ---------------------------------------------------------------------------

create or replace function public.stop_spin(
  p_room_id uuid,
  p_rotation numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_innings public.innings%rowtype;
  v_spin public.spins%rowtype;
  v_now timestamptz := now();
  v_rotation numeric;
  v_elapsed integer;
  v_aim_deadline timestamptz;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'live' or v_room.phase <> 'spinning' or v_room.current_spin_id is null then
    raise exception 'WRONG_PHASE';
  end if;

  select * into v_spin from public.spins where id = v_room.current_spin_id for update;
  if not found then raise exception 'WRONG_PHASE'; end if;
  if v_spin.resolved then raise exception 'STALE_BALL'; end if;

  select * into v_innings from public.innings where id = v_spin.innings_id for update;
  if not found or v_innings.status <> 'live' then raise exception 'WRONG_PHASE'; end if;
  if v_innings.bowling_user_id <> v_uid then raise exception 'OUT_OF_TURN'; end if;

  -- A repeated tap or a retry should not move the board again.
  if v_spin.stopped_at is not null then
    return jsonb_build_object(
      'id', v_spin.id,
      'endsAt', v_room.spin_ends_at,
      'aimDeadline', v_room.aim_deadline,
      'finalRotation', v_spin.final_rotation,
      'alreadyStopped', true
    );
  end if;

  if p_rotation is null or p_rotation::text = 'NaN' then
    v_rotation := v_spin.final_rotation;
  else
    if p_rotation < -100000 or p_rotation > 100000 then raise exception 'INVALID_ANGLE'; end if;
    v_rotation := mod(p_rotation, 360);
    if v_rotation < 0 then v_rotation := v_rotation + 360; end if;
  end if;

  -- The contract says 1-15 seconds. Clamp only for the audit column; the
  -- actual aim window starts immediately.
  v_elapsed := greatest(
    1000,
    least(
      15000,
      floor(extract(epoch from (v_now - coalesce(v_room.spin_started_at, v_spin.created_at))) * 1000)::integer
    )
  );
  v_aim_deadline := v_now + interval '10 seconds';

  update public.spins
  set final_rotation = round(v_rotation, 8),
      duration_ms = v_elapsed,
      stopped_at = v_now
  where id = v_spin.id;

  update public.rooms
  set spin_ends_at = v_now,
      spin_duration_ms = v_elapsed,
      aim_deadline = v_aim_deadline,
      last_active_at = v_now
  where id = p_room_id;

  return jsonb_build_object(
    'id', v_spin.id,
    'endsAt', v_now,
    'aimDeadline', v_aim_deadline,
    'finalRotation', round(v_rotation, 8),
    'alreadyStopped', false
  );
end;
$$;

revoke all on function public.start_spin(uuid) from public;
revoke all on function public.stop_spin(uuid, numeric) from public;

grant execute on function public.start_spin(uuid) to authenticated;
grant execute on function public.stop_spin(uuid, numeric) to authenticated;

notify pgrst, 'reload schema';
