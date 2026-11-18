-- ═══════════════════════════════════════════════════════════════════════════════
--  PAPER CRICKET · কাগজের ক্রিকেট
--  Migration 0007 — admin auth via Supabase email + password.
--
--  This replaces the shared VITE_ADMIN_SECRET from migration 0006.
--
--  How it works
--  ────────────
--  • The browser opens a dedicated admin Supabase session (separate storage key),
--    signed in with email + password through Supabase Auth.
--  • Every admin RPC is SECURITY DEFINER and checks public.is_admin(), which
--    compares auth.jwt()->>'email' against the admin_emails allowlist.
--  • public.admin_emails has RLS enabled with no policies and no table grants,
--    so only the security-definer helpers can read it.
--
--  One-time setup AFTER running this migration
--  ───────────────────────────────────────────
--  1. Authentication → Providers → Email must be enabled (it is by default).
--  2. Authentication → Users → "Add user" — create the admin account with your
--     email + password and tick "Auto Confirm User".
--  3. Run this in the SQL editor with your real email (lowercase):
--
--       insert into public.admin_emails (email)
--       values ('you@example.com')
--       on conflict (email) do nothing;
--
--  4. Sign in at /admin/login with that email + password.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Remove the old secret-based API (parameter lists change → drop first) ────

drop function if exists public.admin_dashboard_stats(text);
drop function if exists public.admin_rooms_all(text);
drop function if exists public.admin_notices_list(text);
drop function if exists public.admin_notice_save(text, uuid, text, text, text, boolean, timestamptz);
drop function if exists public.admin_notice_delete(text, uuid);
drop function if exists public.admin_seo_list(text);
drop function if exists public.admin_seo_save(text, text, text, text, text);

drop table if exists public.admin_secrets;

-- ── Admin allowlist ──────────────────────────────────────────────────────────

create table if not exists public.admin_emails (
  email text primary key check (email = lower(email) and char_length(email) <= 320),
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
revoke all on table public.admin_emails from anon, authenticated;

-- The one source of truth for admin access. SECURITY DEFINER so it can read
-- the allowlist even though callers have no table grants.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_emails ae
    where ae.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Returns who the caller is and whether they are an admin. The client uses
-- this right after sign-in to validate access and to restore sessions.
create or replace function public.admin_me()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'isAdmin', public.is_admin(),
    'email', auth.jwt() ->> 'email'
  );
$$;

revoke all on function public.admin_me() from public;
grant execute on function public.admin_me() to authenticated;

-- ── Admin RPCs (security definer → bypasses per-member RLS) ─────────────────

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_total_hours numeric;
begin
  if not public.is_admin() then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  select coalesce(sum(extract(epoch from (coalesce(finished_at, now()) - created_at)) / 3600.0), 0)
  into v_total_hours
  from public.rooms
  where created_at >= now() - interval '1 year';

  return jsonb_build_object(
    'totalRooms', (select count(*) from public.rooms),
    'roomsLive', (select count(*) from public.rooms where status = 'live'),
    'roomsLobby', (select count(*) from public.rooms where status = 'lobby'),
    'roomsFinished', (select count(*) from public.rooms where status = 'finished'),
    'roomsAbandoned', (select count(*) from public.rooms where status = 'abandoned'),
    'totalPlayers', (select count(*) from public.room_players where left_at is null),
    'playersToday', (select count(*) from public.room_players where joined_at >= now() - interval '1 day' and left_at is null),
    'playersWeek', (select count(*) from public.room_players where joined_at >= now() - interval '7 days' and left_at is null),
    'playersMonth', (select count(*) from public.room_players where joined_at >= now() - interval '30 days' and left_at is null),
    'playersYear', (select count(*) from public.room_players where joined_at >= now() - interval '365 days' and left_at is null),
    'totalMatches', (select count(*) from public.rooms where status in ('finished', 'abandoned')),
    'matchesToday', (select count(*) from public.rooms where status in ('finished', 'abandoned') and finished_at >= now() - interval '1 day'),
    'matchesWeek', (select count(*) from public.rooms where status in ('finished', 'abandoned') and finished_at >= now() - interval '7 days'),
    'matchesMonth', (select count(*) from public.rooms where status in ('finished', 'abandoned') and finished_at >= now() - interval '30 days'),
    'matchesYear', (select count(*) from public.rooms where status in ('finished', 'abandoned') and finished_at >= now() - interval '365 days'),
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
    'generatedAt', now()
  );
end;
$$;

create or replace function public.admin_rooms_all()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'code', r.code,
        'status', r.status,
        'phase', r.phase,
        'overs', r.overs,
        'wickets', r.wickets,
        'playerCount', pc.cnt,
        'lastActiveAt', r.last_active_at,
        'createdAt', r.created_at,
        'startedAt', r.started_at,
        'finishedAt', r.finished_at,
        'winnerUserId', r.winner_user_id
      ) order by r.last_active_at desc nulls last, r.created_at desc
    ), '[]'::jsonb)
    from public.rooms r
    left join lateral (
      select count(*) as cnt
      from public.room_players p
      where p.room_id = r.id and p.left_at is null
    ) pc on true
  );
end;
$$;

create or replace function public.admin_notices_list()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'title', title,
        'body', body,
        'type', type,
        'isActive', is_active,
        'expiresAt', expires_at,
        'createdAt', created_at,
        'updatedAt', updated_at
      ) order by created_at desc
    ), '[]'::jsonb)
    from public.admin_notices
  );
end;
$$;

create or replace function public.admin_notice_save(
  p_id uuid,
  p_title text,
  p_body text,
  p_type text,
  p_is_active boolean,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  if p_id is not null then
    update public.admin_notices
    set title = p_title,
        body = p_body,
        type = coalesce(p_type, 'info'),
        is_active = coalesce(p_is_active, true),
        expires_at = p_expires_at,
        updated_at = now()
    where id = p_id
    returning id into v_id;
  else
    insert into public.admin_notices (title, body, type, is_active, expires_at)
    values (p_title, p_body, coalesce(p_type, 'info'), coalesce(p_is_active, true), p_expires_at)
    returning id into v_id;
  end if;

  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.admin_notice_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  delete from public.admin_notices where id = p_id;
end;
$$;

create or replace function public.admin_seo_list()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'pagePath', page_path,
        'title', title,
        'description', description,
        'ogImage', og_image,
        'updatedAt', updated_at
      ) order by page_path
    ), '[]'::jsonb)
    from public.admin_seo_settings
  );
end;
$$;

create or replace function public.admin_seo_save(
  p_page_path text,
  p_title text default null,
  p_description text default null,
  p_og_image text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'ADMIN_ACCESS_DENIED'; end if;

  insert into public.admin_seo_settings (page_path, title, description, og_image, updated_at)
  values (p_page_path, p_title, p_description, p_og_image, now())
  on conflict (page_path) do update
  set title = coalesce(excluded.title, public.admin_seo_settings.title),
      description = coalesce(excluded.description, public.admin_seo_settings.description),
      og_image = coalesce(excluded.og_image, public.admin_seo_settings.og_image),
      updated_at = now();
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.admin_dashboard_stats() from public;
revoke all on function public.admin_rooms_all() from public;
revoke all on function public.admin_notices_list() from public;
revoke all on function public.admin_notice_save(uuid, text, text, text, boolean, timestamptz) from public;
revoke all on function public.admin_notice_delete(uuid) from public;
revoke all on function public.admin_seo_list() from public;
revoke all on function public.admin_seo_save(text, text, text, text) from public;

grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_rooms_all() to authenticated;
grant execute on function public.admin_notices_list() to authenticated;
grant execute on function public.admin_notice_save(uuid, text, text, text, boolean, timestamptz) to authenticated;
grant execute on function public.admin_notice_delete(uuid) to authenticated;
grant execute on function public.admin_seo_list() to authenticated;
grant execute on function public.admin_seo_save(text, text, text, text) to authenticated;
