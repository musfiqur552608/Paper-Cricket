-- Per-seat paper theme and pen style. Each player owns their visual choices,
-- stored on their room_players row and returned in the shared snapshot.

alter table public.room_players
  add column if not exists paper_theme_id text,
  add column if not exists pen_style_id text;

-- Replace the snapshot function so both seats' themes travel with the room.
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
        'squad', coalesce(s.squad, '[]'::jsonb),
        'paperThemeId', p.paper_theme_id,
        'penStyleId', p.pen_style_id
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

-- Save a player's chosen paper and pen. Allowed in lobby and live phases so a
-- player can restyle between balls; IDs are whitelisted to keep the column tidy.
create or replace function public.update_player_theme(
  p_room_id uuid,
  p_paper_theme text,
  p_pen_style text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_player public.room_players%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  if p_paper_theme not in (
    'notebook','newsprint','blueprint','khadi','midnight','rose','mint',
    'lavender','sandstone','slate','ochre','sky','forest','terracotta',
    'peach','cream','graphite','mustard','teal','sepia'
  ) then
    raise exception 'INVALID_THEME';
  end if;

  if p_pen_style not in (
    'clear','bluebarrel','blackbarrel','redbarrel','greenbarrel','goldbarrel',
    'silverbarrel','copper','neon','pastelpink','pastelblue','pastelgreen',
    'olive','navy','maroon','violet','charcoal','sunset','mintgreen','lavenderblue'
  ) then
    raise exception 'INVALID_PEN';
  end if;

  select * into v_player
  from public.room_players
  where room_id = p_room_id and user_id = v_uid and left_at is null;

  if not found then raise exception 'NOT_MEMBER'; end if;

  update public.room_players
  set paper_theme_id = p_paper_theme,
      pen_style_id = p_pen_style
  where id = v_player.id;

  update public.rooms
  set last_active_at = now()
  where id = p_room_id;
end;
$$;

revoke all on function public.update_player_theme(uuid, text, text) from public;
grant execute on function public.update_player_theme(uuid, text, text) to authenticated;
