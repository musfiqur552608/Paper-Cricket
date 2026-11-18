-- ═══════════════════════════════════════════════════════════════════════════════
--  PAPER CRICKET · কাগজের ক্রিকেট
--  Migration 0008 — richer admin analytics.
--
--  Replaces admin_dashboard_stats() with a range-aware version that returns:
--    • a real day-by-day series (matches, players, hours, runs, wickets)
--    • hourly activity for the last 30 days
--    • shot/outcome mix
--    • current-vs-previous week comparisons
--    • derived KPIs (completion rate, average match length, runs/balls per match)
--    • top players
--
--  Also adds admin_seo_delete() so clearing an SEO override actually deletes it.
--
--  Run this after 0007. The admin panel keeps working before it is applied
--  (the client falls back to the old RPC), but the new charts need it.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Range-aware dashboard stats ─────────────────────────────────────────────

drop function if exists public.admin_dashboard_stats();

create or replace function public.admin_dashboard_stats(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 7), 365);
  v_since date := current_date - (v_days - 1);
  v_total_hours numeric;
  v_series jsonb;
  v_hourly jsonb;
  v_outcomes jsonb;
  v_top_players jsonb;
begin
  if not public.is_admin() then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  select coalesce(sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0), 0)
  into v_total_hours
  from public.rooms
  where created_at >= now() - interval '1 year';

  -- ── Daily series (one row per day, zero-filled) ──────────────────────────
  with days as (
    select generate_series(
      v_since::timestamp,
      current_date::timestamp,
      interval '1 day'
    )::date as day
  ),
  match_days as (
    select (coalesce(finished_at, created_at) at time zone 'UTC')::date as day,
           count(*) as cnt
    from public.rooms
    where status in ('finished', 'abandoned')
      and (coalesce(finished_at, created_at) at time zone 'UTC')::date >= v_since
    group by 1
  ),
  player_days as (
    select (joined_at at time zone 'UTC')::date as day,
           count(distinct user_id) as cnt
    from public.room_players
    where (joined_at at time zone 'UTC')::date >= v_since
    group by 1
  ),
  ball_days as (
    select (created_at at time zone 'UTC')::date as day,
           coalesce(sum(runs + extras), 0) as runs,
           count(*) filter (where is_wicket) as wickets
    from public.balls
    where (created_at at time zone 'UTC')::date >= v_since
    group by 1
  ),
  room_days as (
    select (created_at at time zone 'UTC')::date as day,
           sum(extract(epoch from (coalesce(finished_at, now()) - coalesce(started_at, created_at))) / 3600.0) as hours
    from public.rooms
    where (created_at at time zone 'UTC')::date >= v_since
    group by 1
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'matches', coalesce(m.cnt, 0),
      'players', coalesce(p.cnt, 0),
      'hours', round(coalesce(r.hours, 0)::numeric, 2),
      'runs', coalesce(b.runs, 0),
      'wickets', coalesce(b.wickets, 0)
    ) order by d.day
  ), '[]'::jsonb)
  into v_series
  from days d
  left join match_days m on m.day = d.day
  left join player_days p on p.day = d.day
  left join ball_days b on b.day = d.day
  left join room_days r on r.day = d.day;

  -- ── Hourly activity (last 30 days, UTC) ──────────────────────────────────
  with hours as (
    select generate_series(0, 23) as hour
  ),
  hourly_counts as (
    select extract(hour from (created_at at time zone 'UTC'))::int as hour,
           count(*) as cnt
    from public.rooms
    where created_at >= now() - interval '30 days'
    group by 1
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('hour', h.hour, 'matches', coalesce(c.cnt, 0))
    order by h.hour
  ), '[]'::jsonb)
  into v_hourly
  from hours h
  left join hourly_counts c on c.hour = h.hour;

  -- ── Shot / outcome mix (all time) ────────────────────────────────────────
  select jsonb_build_array(
    jsonb_build_object('key', 'sixes',   'value', count(*) filter (where outcome = '6')),
    jsonb_build_object('key', 'fours',   'value', count(*) filter (where outcome = '4')),
    jsonb_build_object('key', 'wickets', 'value', count(*) filter (where is_wicket)),
    jsonb_build_object('key', 'noBalls', 'value', count(*) filter (where outcome = 'N')),
    jsonb_build_object('key', 'wides',   'value', count(*) filter (where outcome = 'W')),
    jsonb_build_object('key', 'runs',    'value', count(*) filter (where outcome in ('1', '2', '3')))
  )
  into v_outcomes
  from public.balls;

  -- ── Top players by matches in the last 30 days ───────────────────────────
  select coalesce(jsonb_agg(
    jsonb_build_object('name', t.name, 'matches', t.matches)
    order by t.matches desc, t.name
  ), '[]'::jsonb)
  into v_top_players
  from (
    select rp.name, count(distinct rp.room_id) as matches
    from public.room_players rp
    where rp.joined_at >= now() - interval '30 days'
    group by rp.name
    order by matches desc, rp.name
    limit 5
  ) t;

  return jsonb_build_object(
    'rangeDays', v_days,
    'totalRooms', (select count(*) from public.rooms),
    'roomsLive', (select count(*) from public.rooms where status = 'live'),
    'roomsLobby', (select count(*) from public.rooms where status = 'lobby'),
    'roomsFinished', (select count(*) from public.rooms where status = 'finished'),
    'roomsAbandoned', (select count(*) from public.rooms where status = 'abandoned'),
    'activePlayers', (select count(distinct user_id) from public.room_players where left_at is null),
    'totalPlayers', (select count(distinct user_id) from public.room_players),
    'playersToday', (select count(distinct user_id) from public.room_players where joined_at >= now() - interval '1 day'),
    'playersWeek', (select count(distinct user_id) from public.room_players where joined_at >= now() - interval '7 days'),
    'playersMonth', (select count(distinct user_id) from public.room_players where joined_at >= now() - interval '30 days'),
    'playersYear', (select count(distinct user_id) from public.room_players where joined_at >= now() - interval '365 days'),
    'totalMatches', (select count(*) from public.rooms where status in ('finished', 'abandoned')),
    'matchesToday', (select count(*) from public.rooms where status in ('finished', 'abandoned') and coalesce(finished_at, created_at) >= now() - interval '1 day'),
    'matchesWeek', (select count(*) from public.rooms where status in ('finished', 'abandoned') and coalesce(finished_at, created_at) >= now() - interval '7 days'),
    'matchesMonth', (select count(*) from public.rooms where status in ('finished', 'abandoned') and coalesce(finished_at, created_at) >= now() - interval '30 days'),
    'matchesYear', (select count(*) from public.rooms where status in ('finished', 'abandoned') and coalesce(finished_at, created_at) >= now() - interval '365 days'),
    'matchesPrevWeek', (
      select count(*) from public.rooms
      where status in ('finished', 'abandoned')
        and coalesce(finished_at, created_at) >= now() - interval '14 days'
        and coalesce(finished_at, created_at) < now() - interval '7 days'
    ),
    'playersPrevWeek', (
      select count(distinct user_id) from public.room_players
      where joined_at >= now() - interval '14 days' and joined_at < now() - interval '7 days'
    ),
    'hoursPrevWeek', round(coalesce((
      select sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0)
      from public.rooms
      where created_at >= now() - interval '14 days' and created_at < now() - interval '7 days'
    ), 0)::numeric, 2),
    'totalBalls', (select count(*) from public.balls),
    'totalRuns', (select coalesce(sum(runs), 0) from public.innings),
    'totalWickets', (select coalesce(sum(wickets), 0) from public.innings),
    'totalSixes', (select count(*) from public.balls where outcome = '6'),
    'totalFours', (select count(*) from public.balls where outcome = '4'),
    'totalNoBalls', (select count(*) from public.balls where outcome = 'N'),
    'totalWides', (select count(*) from public.balls where outcome = 'W'),
    'totalHours', round(v_total_hours::numeric, 2),
    'hoursToday', round(coalesce((
      select sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0)
      from public.rooms where created_at >= now() - interval '1 day'
    ), 0)::numeric, 2),
    'hoursWeek', round(coalesce((
      select sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0)
      from public.rooms where created_at >= now() - interval '7 days'
    ), 0)::numeric, 2),
    'hoursMonth', round(coalesce((
      select sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0)
      from public.rooms where created_at >= now() - interval '30 days'
    ), 0)::numeric, 2),
    'avgMatchMinutes', (
      select coalesce(round(avg(extract(epoch from (finished_at - started_at)) / 60.0)::numeric, 1), 0)
      from public.rooms
      where status = 'finished' and started_at is not null and finished_at is not null
        and finished_at >= v_since::timestamptz
    ),
    'avgRunsPerMatch', (
      select coalesce(round(avg(total_runs)::numeric, 1), 0)
      from (
        select coalesce(sum(i.runs), 0) as total_runs
        from public.rooms r
        left join public.innings i on i.room_id = r.id
        where r.status = 'finished'
          and coalesce(r.finished_at, r.created_at) >= v_since::timestamptz
        group by r.id
      ) t
    ),
    'avgBallsPerMatch', (
      select coalesce(round(count(b.id)::numeric / greatest(count(distinct r.id), 1), 1), 0)
      from public.rooms r
      left join public.balls b on b.room_id = r.id
      where r.status = 'finished'
        and coalesce(r.finished_at, r.created_at) >= v_since::timestamptz
    ),
    'completionRate', (
      select coalesce(round(
        100.0 * count(*) filter (where status = 'finished')
        / nullif(count(*) filter (where status in ('finished', 'abandoned')), 0)
      , 1), 0)
      from public.rooms
      where coalesce(finished_at, created_at) >= v_since::timestamptz
    ),
    'series', v_series,
    'hourly', v_hourly,
    'outcomes', v_outcomes,
    'topPlayers', v_top_players,
    'generatedAt', now()
  );
end;
$$;

revoke all on function public.admin_dashboard_stats(integer) from public, anon;
grant execute on function public.admin_dashboard_stats(integer) to authenticated;

-- ── SEO delete (the old upsert could not clear an override) ─────────────────

create or replace function public.admin_seo_delete(p_page_path text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  delete from public.admin_seo_settings where page_path = p_page_path;
end;
$$;

revoke all on function public.admin_seo_delete(text) from public, anon;
grant execute on function public.admin_seo_delete(text) to authenticated;
